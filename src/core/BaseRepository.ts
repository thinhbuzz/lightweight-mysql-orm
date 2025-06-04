import { printQuery } from '../config/db';
import {
    type Connection,
    type FieldKeys,
    type FindOptions,
    operatorQueryMap,
    ORMError,
    type QueryOperator,
    type QueryParam,
    type QueryParams,
    type QueryResult,
    type RelationMetadata,
    type TransformHooks,
    type TrashedFindOptions,
    type WhereClause,
} from '../types/common';
import { getEntityMetadata } from './EntityMetadata';

export class BaseRepository<T extends object> {
    constructor(
        protected connection: Connection,
        private entityClass: new () => T,
    ) {
    }

    private get metadata() {
        const metadata = getEntityMetadata(this.entityClass);
        if (!metadata) {
            throw new ORMError(`Entity metadata not found for ${this.entityClass.name}`);
        }
        return metadata;
    }

    async query(sql: string, params?: QueryParams): Promise<QueryResult> {
        if (printQuery) {
            console.info('Executing SQL:', sql);
            if (params && params.length > 0) {
                console.info('\tParameters:', params);
            }
        }
        const [rows] = await this.connection.query(sql, params);
        return rows;
    }

    async findOne(where: WhereClause<T>, options: FindOptions<T> = {}): Promise<T | null> {
        const metadata = this.metadata;
        const [whereClauses, whereValues] = this.renderWhereClauses(where, options);
        const whereClause = this.renderWhereClaude(whereClauses);

        const sql = `SELECT *
                     FROM ${metadata.tableName} ${whereClause}
                     LIMIT 1`;
        const rows = await this.query(sql, whereValues);

        if (Array.isArray(rows) && rows.length > 0) {
            const entity = this.mapToEntity(rows[0]);
            if (options.relations) {
                await this.loadRelations([entity], options.relations);
            }
            return entity;
        }

        return null;
    }

    renderWhereClauses(where: WhereClause<T>, options?: TrashedFindOptions): [string[], QueryParams] {
        const whereClauses: string[] = [];
        const whereValues: QueryParams = [];
        const metadata = this.metadata;
        for (const [key, value] of Object.entries(where)) {
            const column = metadata.columns.find(c => c.propertyKey === key);
            if (column) {
                const operatorOrValue = typeof value === 'object' && !Array.isArray(value) && value !== null ? value : { $eq: value };
                Object.keys(operatorOrValue as object).forEach(operatorKey => {
                    const [operator, valuePlaceholders] = operatorQueryMap[operatorKey as QueryOperator] || [];
                    if (!operator) {
                        throw new ORMError(`Unsupported operator: ${operatorKey} for column ${column.columnName}`);
                    }
                    whereClauses.push(`?? ${operator} ${valuePlaceholders ? valuePlaceholders.join(' ') : '?'}`);
                    whereValues.push(column.columnName);
                    const whereValue = (operatorOrValue as object)[operatorKey as keyof typeof operatorOrValue];
                    if ((valuePlaceholders?.length || 0) > 1) {
                        whereValues.push(...(whereValue as QueryParam[]));
                    } else {
                        whereValues.push(whereValue);
                    }
                });
            }
        }
        if (!options?.withDeleted && metadata.softDelete && metadata.softDeleteColumn) {
            whereClauses.push(`?? IS NULL`);
            whereValues.push(metadata.softDeleteColumn);
        }
        return [whereClauses, whereValues];
    }

    renderWhereClaude(whereClauses: string[]): string {
        return whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    }

    async find(where: WhereClause<T>, options: FindOptions<T> = {}): Promise<T[]> {
        const metadata = this.metadata;
        const [whereClauses, whereValues] = this.renderWhereClauses(where, options);

        const whereClause = this.renderWhereClaude(whereClauses);
        const sql = `SELECT *
                     FROM ${metadata.tableName} ${whereClause}`;
        const rows = await this.query(sql, whereValues);
        if (Array.isArray(rows)) {
            const entities = rows.map(row => this.mapToEntity(row));
            if (options.relations) {
                await this.loadRelations(entities, options.relations);
            }
            return entities;
        }

        return [];
    }

    async create(entity: Partial<T> | T): Promise<T | number> {
        const metadata = this.metadata;
        const dbObject = this.mapToDB(entity);

        const columns = [];
        const placeholders = [];
        const values: QueryParams = [];
        const columnNames: QueryParams = [];

        for (const [columnName, value] of Object.entries(dbObject)) {
            columns.push('??');
            placeholders.push('?');
            columnNames.push(columnName);
            values.push(value as QueryParam);
        }

        const sql = `INSERT INTO ${metadata.tableName} (${columns.join(', ')})
                     VALUES (${placeholders.join(', ')})`;
        const result = await this.query(sql, columnNames.concat(values) as QueryParams);
        const newValue = await this.findByPrimaryValue(result.insertId);
        if (newValue) {
            return entity instanceof this.entityClass ? Object.assign(entity, newValue) : newValue;
        }
        return result.insertId;
    }

    async findByPrimaryValue(primaryValue: number) {
        const primaryColumn = this.metadata.columns.find(c => c.primary);
        if (!primaryColumn) {
            return primaryValue;
        }
        return await this.findOne({ [primaryColumn.propertyKey]: primaryValue } as WhereClause<T>);
    }

    async update(where: WhereClause<T> | T, updates?: Partial<T>, options?: TrashedFindOptions): Promise<T | number>;
    async update(where: T): Promise<T>;
    async update(where: WhereClause<T> | T, updates?: Partial<T>, options?: TrashedFindOptions): Promise<T | number> {
        const metadata = this.metadata;
        const isInstance = where instanceof this.entityClass;
        const entity = isInstance ? where as T : {} as T;
        if (isInstance) {
            const primaryColumn = metadata.columns.find(c => c.primary);
            if (primaryColumn) {
                if (!updates) {
                    updates = where as Partial<T>;
                }
                where = { [primaryColumn.propertyKey]: (where as T)[primaryColumn.propertyKey as keyof T] } as WhereClause<T>;
            }
        }
        const updateDbObject = this.mapToDB(updates!);

        const setClauses: QueryParams = [];
        const setValues: QueryParams = [];

        for (const [columnName, value] of Object.entries(updateDbObject)) {
            setClauses.push(`?? = ?`);
            setValues.push(columnName as QueryParam, value as QueryParam);
        }

        const [whereClauses, whereValues] = this.renderWhereClauses(where, options);
        const whereClause = this.renderWhereClaude(whereClauses);

        const sql = `UPDATE ${metadata.tableName}
                     SET ${setClauses.join(', ')}
                             ${whereClause}`;
        const result = await this.query(sql, [...setValues, ...whereValues]);
        if (result.affectedRows === 1 && isInstance) {
            const updatedEntity = await this.findOne(where, options);
            if (updatedEntity) {
                return Object.assign(entity, updatedEntity);
            }
        }

        return result.affectedRows;
    }

    async delete(where: WhereClause<T>): Promise<number>;
    async delete(where: T): Promise<T>;
    async delete(where: WhereClause<T> | T): Promise<T | number> {
        const metadata = this.metadata;
        if (metadata.softDelete) {
            return await this.update(where as WhereClause<T> | T, { [metadata.softDeleteColumn!]: new Date() } as Partial<T>, { withDeleted: true });
        }

        const isInstance = where instanceof this.entityClass;
        if (isInstance) {
            const primaryColumn = metadata.columns.find(c => c.primary);
            if (primaryColumn) {
                where = { [primaryColumn.propertyKey]: (where as T)[primaryColumn.propertyKey as keyof T] } as WhereClause<T>;
            }
        }
        const [whereClauses, whereValues] = this.renderWhereClauses(where);
        const whereClause = this.renderWhereClaude(whereClauses);

        const sql = `DELETE
                     FROM ${metadata.tableName} ${whereClause}`;
        const result = await this.query(sql, whereValues);
        return result.affectedRows;
    }

    async restore(where: WhereClause<T> | T): Promise<T | number>;
    async restore(where: T): Promise<T>;
    async restore(where: WhereClause<T> | T): Promise<T | number> {
        const metadata = this.metadata;
        if (!metadata.softDelete) {
            throw new ORMError(`Entity ${this.entityClass.name} does not support soft delete restoration.`);
        }
        return this.update(where, { [metadata.softDeleteColumn!]: null } as Partial<T>, { withDeleted: true });
    }

    private applyTransformHooks(entity: Partial<T>, hooks: TransformHooks<T>): Partial<T> {

        if (hooks.beforeSave) {
            entity = hooks.beforeSave(entity);
        }

        if (hooks.afterLoad) {
            entity = hooks.afterLoad(entity);
        }

        return entity;
    }

    private mapToEntity(row: any): T {
        const entity = new this.entityClass();
        const metadata = this.metadata;

        for (const column of metadata.columns) {
            let value = row[column.columnName];

            if (value === null || value === undefined) {
                (entity as any)[column.propertyKey] = null;
                continue;
            }

            switch (column.type) {
                case 'number':
                    value = Number(value);
                    break;
                case 'boolean':
                    value = Boolean(value);
                    break;
                case 'date':
                    if (!(value instanceof Date)) {
                        value = new Date(value);
                    }
                    break;
                case 'json':
                    if (!(value instanceof Object)) {
                        value = JSON.parse(value);
                    }
                    break;
            }

            (entity as any)[column.propertyKey] = value;
        }

        return this.applyTransformHooks(entity, metadata.transformHooks) as T;
    }

    private mapToDB(entity: Partial<T>): any {
        const metadata = this.metadata;
        const dbObject: any = {};
        const transformed = this.applyTransformHooks(entity, metadata.transformHooks);

        for (const column of metadata.columns) {
            const value = (transformed as any)[column.propertyKey];

            if (value === undefined) continue;

            let dbValue = value;

            if (value === null) {
                dbValue = null;
            } else {
                switch (column.type) {
                    case 'date':
                        dbValue = (value as Date).toISOString().slice(0, 19).replace('T', ' ');
                        break;
                    case 'json':
                        dbValue = JSON.stringify(value);
                        break;
                    case 'boolean':
                        dbValue = value ? 1 : 0;
                        break;
                }
            }

            dbObject[column.columnName] = dbValue;
        }

        return dbObject;
    }

    private async loadRelations(entities: T[], relations: FieldKeys<T>[]): Promise<void> {
        const metadata = this.metadata;

        for (const relationName of relations) {
            const relation = metadata.relations.find(r => r.propertyKey === relationName);
            if (!relation) continue;

            switch (relation.type) {
                case 'OneToOne':
                    await this.loadOneToOne(entities, relation);
                    break;
                case 'OneToMany':
                    await this.loadOneToMany(entities, relation);
                    break;
                case 'ManyToOne':
                    await this.loadManyToOne(entities, relation);
                    break;
            }
        }
    }

    private async loadOneToOne(entities: T[], relation: RelationMetadata): Promise<void> {
        const TargetClass = relation.target();
        const targetMetadata = getEntityMetadata(TargetClass);
        if (!targetMetadata) return;

        const primaryKey = this.metadata.columns.find(c => c.primary);
        if (!primaryKey) return;

        const foreignKey = relation.foreignKey || `${this.metadata.tableName}_id`;

        const repo = new BaseRepository(this.connection, TargetClass as new () => object);
        const ids = entities.map(e => (e as any)[primaryKey.propertyKey]);

        const relatedEntities = await repo.find(Object.assign({
            [foreignKey]: { $in: ids },
        }, relation.where || {}));

        const map = new Map<any, any>();
        for (const entity of relatedEntities) {
            const fkValue = (entity as any)[foreignKey];
            map.set(fkValue, entity);
        }

        for (const entity of entities) {
            const id = (entity as any)[primaryKey.propertyKey];
            (entity as any)[relation.propertyKey] = map.get(id) || null;
        }
    }

    private async loadOneToMany(entities: T[], relation: RelationMetadata): Promise<void> {
        const TargetClass = relation.target();
        const targetMetadata = getEntityMetadata(TargetClass);
        if (!targetMetadata) return;

        const primaryKey = this.metadata.columns.find(c => c.primary);
        if (!primaryKey) return;

        const inverseRelation = targetMetadata.relations.find(
            r => r.propertyKey === relation.inverseSide,
        );

        if (!inverseRelation) return;

        const foreignKey = inverseRelation.foreignKey || `${this.metadata.tableName}_id`;

        const repo = new BaseRepository(this.connection, TargetClass as new () => object);
        const ids = entities.map(e => (e as any)[primaryKey.propertyKey]);

        const relatedEntities = await repo.find(Object.assign({
            [foreignKey]: { $in: ids },
        }, relation.where || {}));

        const map = new Map<any, any[]>();
        for (const entity of entities) {
            const id = (entity as any)[primaryKey.propertyKey];
            map.set(id, []);
        }

        for (const relatedEntity of relatedEntities) {
            const fkValue = (relatedEntity as any)[foreignKey];
            if (map.has(fkValue)) {
                map.get(fkValue)!.push(relatedEntity);
            }
        }

        for (const entity of entities) {
            const id = (entity as any)[primaryKey.propertyKey];
            (entity as any)[relation.propertyKey] = map.get(id) || [];
        }
    }

    private async loadManyToOne(entities: T[], relation: RelationMetadata): Promise<void> {
        const TargetClass = relation.target();
        const targetMetadata = getEntityMetadata(TargetClass);
        if (!targetMetadata) return;

        const primaryKey = targetMetadata.columns.find(c => c.primary);
        if (!primaryKey) return;

        const foreignKey = relation.foreignKey || `${TargetClass.name.toLowerCase()}_id`;

        const repo = new BaseRepository(this.connection, TargetClass as new () => object);
        const ids = entities
            .map(e => (e as any)[foreignKey])
            .filter((id, index, self) => id && self.indexOf(id) === index);

        const relatedEntities = await repo.find(Object.assign({
            [primaryKey.propertyKey]: { $in: ids },
        }, relation.where || {}));

        const map = new Map<any, any>();
        for (const entity of relatedEntities) {
            const id = (entity as any)[primaryKey.propertyKey];
            map.set(id, entity);
        }

        for (const entity of entities) {
            const fkValue = (entity as any)[foreignKey];
            (entity as any)[relation.propertyKey] = map.get(fkValue) || null;
        }
    }
}
