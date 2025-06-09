export class ORMError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ORMError';
    }
}

export class EntityMetadataNotFoundError extends ORMError {
    constructor(entityName: string) {
        super(`Entity metadata not found for ${entityName}`);
        this.name = 'EntityMetadataNotFoundError';
    }
}

export class ColumnNotFoundError extends ORMError {
    constructor(columnName: string, entityName: string) {
        super(`Column "${columnName}" not found in entity "${entityName}".`);
        this.name = 'ColumnNotFoundError';
    }
}

export class UnsupportedQueryOperatorError extends ORMError {
    constructor(operator: string) {
        super(`Unsupported query operator: "${operator}".`);
        this.name = 'UnsupportedQueryOperatorError';
    }
}

export class SoftDeleteNotSupportedError extends ORMError {
    constructor(entityName: string) {
        super(`Entity "${entityName}" does not support soft delete restoration.`);
        this.name = 'SoftDeleteNotSupportedError';
    }
}
