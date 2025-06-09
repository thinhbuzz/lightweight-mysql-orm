export class ORMError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ORMError';
    }
}

export class EntityMetadataNotFoundError extends ORMError {
    constructor(entityName: string) {
        super(`Metadata not found for entity "${entityName}".`);
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
        super(`Query operator "${operator}" is not supported.`);
        this.name = 'UnsupportedQueryOperatorError';
    }
}

export class SoftDeleteNotSupportedError extends ORMError {
    constructor(entityName: string) {
        super(`Soft delete is not supported for entity "${entityName}".`);
        this.name = 'SoftDeleteNotSupportedError';
    }
}
