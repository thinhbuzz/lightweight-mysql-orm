import type { Pool, PoolConnection } from 'mysql2/promise';
import type { DeletedFindOptions } from '../core/SoftDelete';

export type Connection = Pool | PoolConnection;
export type QueryResult = any;
export type QueryParam = string | number | boolean | null | Date;
export type QueryParams = (QueryParam | QueryParam[] | (QueryParam | QueryParam[]))[];

export interface EntityMetadata {
    tableName: string;
    softDelete?: boolean;
    softDeleteColumn?: string;
    columns: ColumnMetadata[];
    relations: RelationMetadata[];
    transformHooks: TransformHooks<any>;
}

export interface ColumnMetadata {
    propertyKey: string;
    columnName: string;
    type: ColumnType;
    hidden: boolean;
    primary: boolean;
    softDelete: boolean;
}

export type ColumnType =
    | 'string'
    | 'number'
    | 'boolean'
    | 'date'
    | 'json';

export interface TransformHooks<T> {
    beforeSave?: (entity: Partial<T>) => Partial<T>;
    afterLoad?: (entity: T) => T;
}

// Base interface for all relations
export interface BaseRelationMetadata {
    propertyKey: string;
    target: () => Function; // Function that returns entity class
    where?: WhereClause<any>;
    hidden?: boolean;
}

// Specific metadata for OneToOne
export interface OneToOneRelationMetadata extends BaseRelationMetadata {
    type: 'OneToOne';
    foreignKey?: string;
    localKey?: string; // Optional, as it might be the owner or not
}

// Specific metadata for OneToMany
export interface OneToManyRelationMetadata extends BaseRelationMetadata {
    type: 'OneToMany';
    foreignKey?: string; // Key on the Many side, inferred if inverseSide is present
    inverseSide: string;  // Property name on the Many side that maps back
}

// Specific metadata for ManyToOne
export interface ManyToOneRelationMetadata extends BaseRelationMetadata {
    type: 'ManyToOne';
    foreignKey?: string; // Key on this entity's table
}

// Specific metadata for ManyToMany
export interface ManyToManyRelationMetadata extends BaseRelationMetadata {
    type: 'ManyToMany';
    joinTableName: string;
    joinColumnName: string;       // FK in join table for the current entity
    inverseJoinColumnName: string; // FK in join table for the target entity
}

// Union type for all relation metadata
export type RelationMetadata =
    | OneToOneRelationMetadata
    | OneToManyRelationMetadata
    | ManyToOneRelationMetadata
    | ManyToManyRelationMetadata;

export type Rel<T> = T;
export type FieldKeys<T> = {
    [K in keyof T]: T[K] extends Function ? never : K
}[keyof T];
export const supportedQueryOperators = {
    $eq: '$eq',
    $ne: '$ne',
    $gt: '$gt',
    $gte: '$gte',
    $lt: '$lt',
    $lte: '$lte',
    $in: '$in',
    $like: '$like',
    $between: '$between',
    $notBetween: '$notBetween',
    $isNull: '$isNull',
    $exists: '$exists',
    $notExists: '$notExists',
} as const;
export type QueryOperator = keyof typeof supportedQueryOperators;

export const operatorQueryMap: Record<QueryOperator, [operator: string, valuePlaceholders?: string[]]> = {
    [supportedQueryOperators.$eq]: ['=', ['?']],
    [supportedQueryOperators.$ne]: ['<>', ['?']],
    [supportedQueryOperators.$gt]: ['>', ['?']],
    [supportedQueryOperators.$gte]: ['>=', ['?']],
    [supportedQueryOperators.$lt]: ['<', ['?']],
    [supportedQueryOperators.$lte]: ['<=', ['?']],
    [supportedQueryOperators.$in]: ['IN', ['(?)']],
    [supportedQueryOperators.$like]: ['LIKE', ['?']],
    [supportedQueryOperators.$between]: ['BETWEEN', ['? ', 'AND', ' ?']],
    [supportedQueryOperators.$notBetween]: ['NOT BETWEEN', ['? ', 'AND', ' ?']],
    [supportedQueryOperators.$isNull]: ['IS NULL'],
    [supportedQueryOperators.$exists]: ['EXISTS', ['(?)']],
    [supportedQueryOperators.$notExists]: ['NOT EXISTS', ['(?)']],
};

export type OperatorMap<T, Op extends QueryOperator> =
    Op extends '$eq' | '$ne' | '$gt' | '$gte' | '$lt' | '$lte' ? T :
        Op extends '$in' ? T[] :
            Op extends '$like' ? (T extends string ? string : never) :
                Op extends '$between' | '$notBetween' ? [T, T] :
                    Op extends '$isNull' | '$exists' | '$notExists' ? boolean :
                        never;

export type AllowedOperators<T> = {
    [Op in QueryOperator as OperatorMap<T, Op> extends never ? never : Op]?:
    OperatorMap<T, Op>;
};

export type WhereFieldClause<T> = T | AllowedOperators<T>;

export type WhereClause<T> = {
    [P in keyof T]?: WhereFieldClause<T[P]>;
};

export function where<T>(whereClause: WhereClause<T>): WhereClause<T> {
    return whereClause;
}

export class ORMError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ORMError';
    }
}

export type RelationFindOptions<T> = { relations?: FieldKeys<T>[] };
export type OffsetLimitOptions = { offset?: number; limit?: number };
export type FindOneOptions<T> = RelationFindOptions<T> & DeletedFindOptions;
export type FindOptions<T> = FindOneOptions<T> & OffsetLimitOptions;

export interface JsonSerializable {
    toJSON(): Record<string, any>;
}
