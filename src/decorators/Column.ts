import { createColumnMetadata, getEntityMetadata, saveEntityMetadata } from '../core/EntityMetadata';
import type { ColumnType } from '../types/common';

export interface ColumnOptions {
    name?: string;
    type?: ColumnType;
    hidden?: boolean;
    primary?: boolean;
    softDelete?: boolean;
}

export const Column = (options: ColumnOptions = {}): PropertyDecorator => {
    return (target: object, propertyKey: string | symbol) => {
        // Get the constructor from the prototype or directly from target
        const constructor = target.constructor;
        const entityMetadata = getEntityMetadata(constructor);

        const columnMetadata = createColumnMetadata({
            propertyKey: propertyKey.toString(),
            columnName: options.name || propertyKey.toString(),
            type: options.type || 'string',
            hidden: options.hidden ?? false,
            primary: options.primary ?? false,
            softDelete: options.softDelete ?? false,
        });

        entityMetadata.columns.push(columnMetadata);
        if (columnMetadata.softDelete) {
            entityMetadata.softDelete = true;
            entityMetadata.softDeleteColumn = columnMetadata.columnName;
        }
        saveEntityMetadata(constructor, entityMetadata);
    };
};
