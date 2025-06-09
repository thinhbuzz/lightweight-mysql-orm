import type { Pool, QueryResult, ResultSetHeader } from 'mysql2/promise';
import { coreOptions } from '../config/db';
import {
    type ColumnMetadata,
    type ComplexRelationMap,
    type Connection,
    type EntityMetadata,
    type FieldKeys,
    type FindOneOptions,
    type FindOptions,
    type ManyToManyRelationMetadata,
    type ManyToOneRelationMetadata,
    type OneToManyRelationMetadata,
    type OneToOneRelationMetadata,
    operatorQueryMap,
    type OrderByClause,
    type QueryOperator,
    type QueryParam,
    type QueryParams,
    type RelationConfig,
    type RelationMetadata,
    type RelationSpec,
    type SelectClause,
    type TransformHooks,
    type WhereClause,
} from '../types/common';
import { ColumnNotFoundError, EntityMetadataNotFoundError, SoftDeleteNotSupportedError, UnsupportedQueryOperatorError } from '../types/errors';
import { getEntityMetadata } from './EntityMetadata';
import type { DeletedFindOptions } from './SoftDelete';

export class BaseRepository<T extends object> {
    private readonly _metadata: EntityMetadata;
    private readonly _columnMap: Map<string, ColumnMetadata>;
    private readonly _relationMap: Map<string, RelationMetadata>;
    private readonly _primaryKey?: ColumnMetadata;

    constructor(
        protected connection: Connection,
        private entityClass: new () => T,
    ) {
        const metadata = getEntityMetadata(this.entityClass);
        if (!metadata) {
            throw new EntityMetadataNotFoundError(this.entityClass.name);
        }
        this._metadata = metadata;
        this._columnMap = new Map(metadata.columns.map(c => [c.propertyKey, c]));
        this._relationMap = new Map(metadata.relations.map(r => [r.propertyKey, r]));
        this._primaryKey = metadata.columns.find(c => c.primary);
    }

    async query(sql: string, params?: QueryParams): Promise<QueryResult> {
        if (coreOptions.printQuery) {
            console.info('Executing SQL:', sql);
            if (params && params.length > 0) {
                console.info('\tParameters:', params);
            }
        }
        const [rows] = await this.connection.query(sql, params);
        return rows;
    }

    renderSelectColumns(whereValues: QueryParams, select?: SelectClause<T>): string {
        let columns: string[];

        if (select && select.length > 0) {
            // Filter columns based on select clause
            columns = select.map(field => {
                const column = this._columnMap.get(field as string);
                if (!column) {
                    throw new ColumnNotFoundError(field as string, this.entityClass.name);
                }
                return column.columnName;
            });
        } else {
            // Use all columns
            columns = this._columnMap.keys().toArray();
        }

        whereValues.unshift(this._metadata.tableName);
        whereValues.unshift(...columns);
        return columns.map(() => '??').join(', ');
    }

    async findOne(where: WhereClause<T>, options: FindOneOptions<T> = {}): Promise<T | null> {
        const [whereClauses, whereValues] = this.renderWhereClauses(where, options);
        const whereClause = this.renderWhereClaude(whereClauses);
        const selectColumns = this.renderSelectColumns(whereValues, options.select);

        const orderValues: QueryParams = [];
        const orderByClause = this.renderOrderByClause(options.orderBy, orderValues);

        const sql = `SELECT ${selectColumns} FROM ?? ${whereClause}${orderByClause} LIMIT 1`;
        const rows = await this.query(sql, [...whereValues, ...orderValues]) as T[];

        if (Array.isArray(rows) && rows.length > 0) {
            const entity = this.mapToEntity(rows[0] as T);
            if (options.relations) {
                await this.loadRelations([entity], options.relations);
            }
            return entity;
        }

        return null;
    }

    renderWhereClauses(where: WhereClause<T>, options?: DeletedFindOptions): [string[], QueryParams] {
        const whereClauses: string[] = [];
        const whereValues: QueryParams = [];

        for (const [key, value] of Object.entries(where)) {
            const column = this._columnMap.get(key);
            if (column) {
                const operatorOrValue = typeof value === 'object' && !Array.isArray(value) && value !== null ? value : { $eq: value };
                Object.keys(operatorOrValue as object).forEach(operatorKey => {
                    const [operator, valuePlaceholders] = operatorQueryMap[operatorKey as QueryOperator] || [];
                    if (!operator) {
                        throw new UnsupportedQueryOperatorError(operatorKey);
                    }
                    whereClauses.push(`?? ${operator}${valuePlaceholders ? [' '].concat(valuePlaceholders).join(' ') : ''}`);
                    whereValues.push(column.columnName);
                    const whereValue = (operatorOrValue as object)[operatorKey as keyof typeof operatorOrValue];
                    if (valuePlaceholders) {
                        if ((valuePlaceholders.length || 0) > 1) {
                            whereValues.push(...(whereValue as QueryParam[]));
                        } else {
                            whereValues.push(whereValue);
                        }
                    }
                });
            } else {
                throw new ColumnNotFoundError(key, this.entityClass.name);
            }
        }
        if (!options?.withDeleted && this._metadata.softDelete && this._metadata.softDeleteColumn) {
            whereClauses.push(`?? IS NULL`);
            whereValues.push(this._metadata.softDeleteColumn);
        }
        return [whereClauses, whereValues];
    }

    renderWhereClaude(whereClauses: string[], prefix = 'WHERE'): string {
        return whereClauses.length > 0 ? `${prefix} ${whereClauses.join(' AND ')}` : '';
    }

    renderOrderByClause(orderBy: OrderByClause<T> | undefined, orderValues: QueryParams): string {
        if (!orderBy) return '';

        const orderClauses: string[] = [];

        if (Array.isArray(orderBy)) {
            // Handle array format: ['field1', 'field2']
            for (const field of orderBy) {
                const column = this._columnMap.get(field as string);
                if (column) {
                    orderClauses.push('?? ASC');
                    orderValues.push(column.columnName);
                } else {
                    throw new ColumnNotFoundError(field as string, this.entityClass.name);
                }
            }
        } else if (typeof orderBy === 'object') {
            // Handle object format: { field1: 'DESC', field2: 'ASC' }
            for (const [field, direction] of Object.entries(orderBy)) {
                if (!direction || typeof direction !== 'string') {
                    continue;
                }
                const column = this._columnMap.get(field);
                if (column) {
                    orderClauses.push(`?? ${direction.toUpperCase()}`);
                    orderValues.push(column.columnName);
                } else {
                    throw new ColumnNotFoundError(field, this.entityClass.name);
                }
            }
        }

        return orderClauses.length > 0 ? ` ORDER BY ${orderClauses.join(', ')}` : '';
    }

    async find(where: WhereClause<T>, options: FindOptions<T> = {}): Promise<T[]> {
        const [whereClauses, whereValues] = this.renderWhereClauses(where, options);
        const whereClause = this.renderWhereClaude(whereClauses);
        const selectColumns = this.renderSelectColumns(whereValues, options.select);

        const orderValues: QueryParams = [];
        const orderByClause = this.renderOrderByClause(options.orderBy, orderValues);

        const limit = options.limit! >= 0 ? ` LIMIT ?` : '';
        const offset = options.offset! >= 0 ? ` OFFSET ?` : '';

        // Build final parameter array
        const finalParams = [...whereValues, ...orderValues];
        if (limit) {
            finalParams.push(options.limit as QueryParam);
        }
        if (offset) {
            finalParams.push(options.offset as QueryParam);
        }

        const sql = `SELECT ${selectColumns} FROM ?? ${whereClause}${orderByClause}${limit}${offset}`;
        const rows = await this.query(sql, finalParams) as T[];

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
        const dbObject = this.mapToDB(entity);

        const columns = [];
        const placeholders = [];
        const values: QueryParams = [];
        const columnNames: QueryParams = [this._metadata.tableName];

        for (const [columnName, value] of Object.entries(dbObject)) {
            columns.push('??');
            placeholders.push('?');
            columnNames.push(columnName);
            values.push(value as QueryParam);
        }

        const sql = `INSERT INTO ?? (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
        const result = await this.query(sql, columnNames.concat(values) as QueryParams) as ResultSetHeader;
        const newValue = await this.findByPrimaryValue(result.insertId);
        if (newValue) {
            return entity instanceof this.entityClass ? Object.assign(entity, newValue) : newValue;
        }
        return result.insertId;
    }

    async findByPrimaryValue(primaryValue: number | string): Promise<T | null> {
        if (!this._primaryKey) {
            return null;
        }
        return this.findOne({ [this._primaryKey.propertyKey]: primaryValue } as WhereClause<T>);
    }

    async update(where: WhereClause<T> | T, updates?: Partial<T>, options?: DeletedFindOptions): Promise<T | number>;
    async update(where: T): Promise<T>;
    async update(where: WhereClause<T> | T, updates?: Partial<T>, options?: DeletedFindOptions): Promise<T | number> {
        const isInstance = where instanceof this.entityClass;
        const entity = isInstance ? where as T : {} as T;
        if (isInstance) {
            if (this._primaryKey) {
                if (!updates) {
                    updates = where as Partial<T>;
                }
                where = { [this._primaryKey.propertyKey]: (where as T)[this._primaryKey.propertyKey as keyof T] } as WhereClause<T>;
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

        const sql = `UPDATE ?? SET ${setClauses.join(', ')} ${whereClause}`;
        const result = await this.query(sql, [...[this._metadata.tableName] as QueryParams, ...setValues, ...whereValues]) as ResultSetHeader;
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
        if (this._metadata.softDelete) {
            return await this.update(
                where as WhereClause<T> | T,
                { [this._metadata.softDeleteColumn!]: new Date() } as Partial<T>,
                { withDeleted: true },
            );
        }

        const isInstance = where instanceof this.entityClass;
        if (isInstance) {
            if (this._primaryKey) {
                where = { [this._primaryKey.propertyKey]: (where as T)[this._primaryKey.propertyKey as keyof T] } as WhereClause<T>;
            }
        }
        const [whereClauses, whereValues] = this.renderWhereClauses(where);
        const whereClause = this.renderWhereClaude(whereClauses);
        whereValues.unshift(this._metadata.tableName);
        const sql = `DELETE FROM ?? ${whereClause}`;
        const result = await this.query(sql, whereValues) as ResultSetHeader;
        return result.affectedRows;
    }

    async restore(where: WhereClause<T> | T): Promise<T | number>;
    async restore(where: T): Promise<T>;
    async restore(where: WhereClause<T> | T): Promise<T | number> {
        if (!this._metadata.softDelete) {
            throw new SoftDeleteNotSupportedError(this.entityClass.name);
        }
        return this.update(where, { [this._metadata.softDeleteColumn!]: null } as Partial<T>, { withDeleted: true });
    }

    private applyBeforeSaveHook(entity: Partial<T>, hooks: TransformHooks<T>): Partial<T> {
        if (hooks.beforeSave) {
            entity = hooks.beforeSave(entity);
        }
        return entity;
    }

    private applyAfterLoadHook(entity: T, hooks: TransformHooks<T>): Partial<T> {
        if (hooks.afterLoad) {
            entity = hooks.afterLoad(entity);
        }
        return entity;
    }

    private mapToEntity(row: T): T {
        const entity = new this.entityClass() as T;

        for (const [propertyKey, column] of this._columnMap.entries()) {
            let value = row[column.columnName as keyof T];

            if (value !== null && value !== undefined) {
                switch (column.type) {
                    case 'number':
                        value = Number(value) as T[keyof T];
                        break;
                    case 'boolean':
                        value = Boolean(value) as T[keyof T];
                        break;
                    case 'date':
                        if (!(value as unknown instanceof Date)) {
                            value = new Date(value as string) as T[keyof T];
                        }
                        break;
                    case 'json':
                        if (typeof (value as unknown) === 'string') {
                            try {
                                value = JSON.parse(value as string) as T[keyof T];
                            } catch {
                                // Keep original value if parsing fails
                            }
                        }
                        break;
                }
            }

            entity[propertyKey as keyof T] = value;
        }

        return this.applyAfterLoadHook(entity, this._metadata.transformHooks) as T;
    }

    private mapToDB(entity: Partial<T>): any {
        const dbObject: any = {};
        const transformed = this.applyBeforeSaveHook(entity, this._metadata.transformHooks);

        for (const [propertyKey, value] of Object.entries(transformed)) {
            const column = this._columnMap.get(propertyKey);
            if (!column) continue;

            let dbValue = value;

            if (value !== null && value !== undefined) {
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

    private async loadRelations(entities: T[], relations: RelationSpec<T>[]): Promise<void> {
        if (!entities.length) {
            return;
        }

        for (const relationSpec of relations) {
            if (typeof (relationSpec as unknown) === 'string') {
                // Handle simple relations like 'posts' or 'posts.comments'
                await this.loadSimpleRelation(entities, relationSpec as string);
            } else if (typeof relationSpec === 'object') {
                // Handle complex relations like { posts: { relations: ['comments'], where: {...} } }
                await this.loadComplexRelation(entities, relationSpec);
            }
        }
    }

    private async loadSimpleRelation(entities: T[], relationPath: string): Promise<void> {
        const parts = relationPath.split('.');
        const relationName = parts[0] as FieldKeys<T>;

        const relation = this._relationMap.get(relationName as string);
        if (!relation) return;

        // Load the immediate relation with optimized method calls
        await this.loadRelationByType(entities, relation);

        // If there's a nested path (e.g., 'posts.comments'), load nested relations
        if (parts.length > 1) {
            const nestedPath = parts.slice(1).join('.');
            const relatedEntities = this.getRelatedEntities(entities, relationName, relation.type);

            if (relatedEntities.length > 0) {
                const TargetClass = relation.target();
                const nestedRepo = new BaseRepository(this.connection, TargetClass as new () => any);
                await nestedRepo.loadSimpleRelation(relatedEntities, nestedPath);
            }
        }
    }

    private async loadRelationByType(entities: T[], relation: RelationMetadata, options?: RelationConfig): Promise<void> {
        switch (relation.type) {
            case 'OneToOne':
                await this.loadOneToOne(entities, relation, options);
                break;
            case 'OneToMany':
                await this.loadOneToMany(entities, relation, options);
                break;
            case 'ManyToOne':
                await this.loadManyToOne(entities, relation, options);
                break;
            case 'ManyToMany':
                await this.loadManyToMany(entities, relation, options);
                break;
        }
    }

    private async loadComplexRelation(entities: T[], complexRelationMap: ComplexRelationMap<T>): Promise<void> {
        for (const [relationName, relationOptions] of Object.entries(complexRelationMap)) {
            const relation = this._relationMap.get(relationName);
            if (!relation || !relationOptions) continue;

            // Merge relation options with the base relation
            const enhancedRelation = { ...relation };
            if (relationOptions && typeof relationOptions === 'object' && 'where' in relationOptions && relationOptions.where) {
                enhancedRelation.where = { ...relation.where, ...relationOptions.where };
            }

            // Load the relation with enhanced options
            await this.loadRelationByType(entities, enhancedRelation, relationOptions as RelationConfig);

            // Load nested relations if specified
            if (relationOptions && typeof relationOptions === 'object' && 'relations' in relationOptions && Array.isArray(relationOptions.relations)) {
                const relatedEntities = this.getRelatedEntities(entities, relationName as FieldKeys<T>, relation.type);

                if (relatedEntities.length > 0) {
                    const TargetClass = relation.target();
                    const nestedRepo = new BaseRepository(this.connection, TargetClass as new () => any);
                    await nestedRepo.loadRelations(relatedEntities, relationOptions.relations);
                }
            }
        }
    }

    private getRelatedEntities(entities: T[], relationName: FieldKeys<T>, relationType: string): any[] {
        const relatedEntities: any[] = [];

        for (const entity of entities) {
            const relatedValue = (entity as any)[relationName];
            if (relatedValue) {
                if (relationType === 'OneToMany' || relationType === 'ManyToMany') {
                    if (Array.isArray(relatedValue)) {
                        relatedEntities.push(...relatedValue);
                    }
                } else {
                    relatedEntities.push(relatedValue);
                }
            }
        }

        return relatedEntities;
    }

    private buildFindOptions(options?: RelationConfig): any {
        const findOptions: any = {};
        if (options?.limit) findOptions.limit = options.limit;
        if (options?.offset) findOptions.offset = options.offset;
        if (options?.orderBy) findOptions.orderBy = options.orderBy;
        if (options?.select) findOptions.select = options.select;
        return findOptions;
    }

    private async loadOneToOne(entities: T[], relation: OneToOneRelationMetadata, options?: RelationConfig): Promise<void> {
        const TargetClass = relation.target();
        const targetRepository = new BaseRepository(this.connection, TargetClass as new () => object);

        const localKey = relation.localKey || targetRepository._primaryKey?.propertyKey || `${targetRepository._metadata.tableName}_id`;

        const foreignKey = relation.foreignKey || this._primaryKey?.propertyKey || `${this._metadata.tableName}_id`;

        const ids = entities.map(e => (e as any)[foreignKey]);

        const whereClause = Object.assign({
            [localKey]: { $in: ids },
        }, relation.where || {});

        const findOptions = this.buildFindOptions(options);
        const relatedEntities = await targetRepository.find(whereClause, findOptions);

        const map = new Map<any, any>();
        for (const entity of relatedEntities) {
            const fkValue = (entity as any)[localKey];
            map.set(fkValue, entity);
        }

        for (const entity of entities) {
            const id = (entity as any)[foreignKey];
            (entity as any)[relation.propertyKey] = map.get(id) || null;
        }
    }

    private async loadOneToMany(entities: T[], relation: OneToManyRelationMetadata, options?: RelationConfig): Promise<void> {
        if (!this._primaryKey) return;
        const TargetClass = relation.target();
        const targetRepository = new BaseRepository(this.connection, TargetClass as new () => object);
        const inverseRelation = targetRepository._relationMap.get(relation.inverseSide) as ManyToOneRelationMetadata;

        if (!inverseRelation) return;

        const foreignKey = inverseRelation.foreignKey || `${this._metadata.tableName}_id`;

        const ids = entities.map(e => (e as any)[this._primaryKey!.propertyKey]);

        const whereClause = Object.assign({
            [foreignKey]: { $in: ids },
        }, relation.where || {});

        const findOptions = this.buildFindOptions(options);
        const relatedEntities = await targetRepository.find(whereClause, findOptions);

        const map = new Map<any, any[]>();
        for (const entity of entities) {
            const id = (entity as any)[this._primaryKey.propertyKey];
            map.set(id, []);
        }

        for (const relatedEntity of relatedEntities) {
            const fkValue = (relatedEntity as any)[foreignKey];
            if (map.has(fkValue)) {
                map.get(fkValue)!.push(relatedEntity);
            }
        }

        for (const entity of entities) {
            const id = (entity as any)[this._primaryKey.propertyKey];
            (entity as any)[relation.propertyKey] = map.get(id) || [];
        }
    }

    private async loadManyToOne(entities: T[], relation: ManyToOneRelationMetadata, options?: RelationConfig): Promise<void> {
        const TargetClass = relation.target();
        const targetRepository = new BaseRepository(this.connection, TargetClass as new () => object);
        if (!targetRepository._primaryKey) return;

        const foreignKey = relation.foreignKey || `${TargetClass.name.toLowerCase()}_id`;

        const ids = entities
            .map(e => (e as any)[foreignKey])
            .filter((id, index, self) => id && self.indexOf(id) === index);

        const whereClause = Object.assign({
            [targetRepository._primaryKey.propertyKey]: { $in: ids },
        }, relation.where || {});

        const findOptions = this.buildFindOptions(options);
        const relatedEntities = await targetRepository.find(whereClause, findOptions);

        const map = new Map<any, any>();
        for (const entity of relatedEntities) {
            const id = (entity as any)[targetRepository._primaryKey.propertyKey];
            map.set(id, entity);
        }

        for (const entity of entities) {
            const fkValue = (entity as any)[foreignKey];
            (entity as any)[relation.propertyKey] = map.get(fkValue) || null;
        }
    }

    private async loadManyToMany(entities: T[], relation: ManyToManyRelationMetadata, options?: RelationConfig): Promise<void> {
        if (!this._primaryKey) return;
        const TargetClass = relation.target();
        const targetRepository = new BaseRepository(this.connection, TargetClass as new () => object);
        if (!targetRepository._primaryKey) return;

        const { joinTableName, joinColumnName, inverseJoinColumnName } = relation;

        const ids = entities.map(e => (e as T)[this._primaryKey!.propertyKey as keyof T]);
        if (ids.length === 0) return;

        const targetAlias = 't';
        const joinTableAlias = 'jt';

        // Query to fetch related entities and the source entity FK from the join table
        let sql = `SELECT DISTINCT ??.*, ??.?? AS ?? FROM ?? ?? JOIN ?? ?? ON ??.?? = ??.?? WHERE ??.?? IN (?)`;

        const queryParams = [
            targetAlias,
            joinTableAlias,
            joinColumnName,
            coreOptions.sourceEntityIdAlias,
            targetRepository._metadata.tableName,
            targetAlias,
            joinTableName,
            joinTableAlias,
            joinTableAlias,
            inverseJoinColumnName,
            targetAlias,
            targetRepository._primaryKey.columnName,
            joinTableAlias,
            joinColumnName,
            ids,
        ] as QueryParams;

        if (relation.where) {
            const targetRepo = new BaseRepository(this.connection, TargetClass as new () => T);
            const [whereClauses, whereValues] = targetRepo.renderWhereClauses(relation.where);
            if (whereClauses.length > 0) {
                sql += ` ${this.renderWhereClaude(whereClauses, 'AND')}`;
                queryParams.push(...whereValues);
            }
        }

        if (options?.limit) {
            sql += ` LIMIT ?`;
            queryParams.push(options.limit);
        }

        const relatedEntitiesRaw = await this.query(sql, queryParams) as T[];

        // Map to store relationships: Source Entity ID -> Array of Target Entities
        const map = new Map<any, T[]>();
        entities.forEach(entity => map.set((entity as T)[this._primaryKey!.propertyKey as keyof T], []));

        for (const row of relatedEntitiesRaw) {
            const sourceEntityFkValue = row[coreOptions.sourceEntityIdAlias as keyof T];
            const targetEntity = targetRepository.mapToEntity(row) as T; // mapToEntity will ignore the alias column

            if (map.has(sourceEntityFkValue)) {
                const existingRelations = map.get(sourceEntityFkValue)!;
                // Add if not already present (safeguard, DISTINCT should mostly handle this)
                if (!existingRelations.some(ex => (ex as any)[targetRepository._primaryKey!.propertyKey] === (targetEntity as any)[targetRepository._primaryKey!.propertyKey])) {
                    existingRelations.push(targetEntity);
                }
            }
        }

        // Assign relationships to entities
        for (const entity of entities) {
            const entityId = (entity as T)[this._primaryKey.propertyKey as keyof T];
            (entity as any)[relation.propertyKey] = map.get(entityId) || [];
        }
    }
}

export function repository<T extends object>(pool: Pool, entityClass: new () => T) {
    return new BaseRepository(pool, entityClass);
}
