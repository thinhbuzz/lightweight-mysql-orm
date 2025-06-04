import { getEntityMetadata, saveEntityMetadata } from '../core/EntityMetadata';
import type { EntityMetadata } from '../types/common';

export interface EntityOptions {
    tableName: string;
    softDelete?: boolean;
    softDeleteColumn?: string;
}

export const Entity = (options: EntityOptions): ClassDecorator => {
    return (target: Function) => {
        if (!('toJSON' in target)) {
            target.prototype.toJSON = function () {
                const metadata: EntityMetadata = getEntityMetadata(target);
                const json: Record<string, any> = {};
                metadata.columns.forEach(column => {
                    if (!column.hidden) {
                        json[column.columnName] = this[column.propertyKey];
                    }
                });
                metadata.relations.forEach(relation => {
                    if (!relation.hidden) {
                        json[relation.propertyKey] = this[relation.propertyKey]?.toJSON();
                    }
                });
                return json;
            };
        }
        const metadata: EntityMetadata = getEntityMetadata(target);
        metadata.tableName = options.tableName;
        metadata.softDelete = metadata.softDelete ?? options.softDelete ?? !!options.softDeleteColumn;
        metadata.softDeleteColumn = metadata.softDeleteColumn ?? options.softDeleteColumn ?? (options.softDelete ? 'deleted_at' : undefined);
        saveEntityMetadata(target, metadata);
    };
};
