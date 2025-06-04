import type { Pool, PoolConnection } from 'mysql2/promise';

export type Connection = Pool | PoolConnection;
export type QueryResult = any;
export type QueryParam = string | number | boolean | null | Date;
export type QueryParams = (QueryParam)[] & QueryParam[][];

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
    beforeSave?: (entity: T | Partial<T>) => any;
    afterLoad?: (entity: T | Partial<T>) => any;
}

export type RelationType = 'OneToOne' | 'OneToMany' | 'ManyToOne';

export interface RelationMetadata {
    propertyKey: string;
    type: RelationType;
    target: () => Function; // Function that returns entity class
    foreignKey?: string;
    inverseSide?: string;
    where?: WhereClause<any>;
    hidden?: boolean;
}

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
export type TrashedFindOptions = { withDeleted?: boolean };
export type FindOptions<T> = RelationFindOptions<T> & TrashedFindOptions;
