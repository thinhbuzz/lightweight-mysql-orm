import { getEntityMetadata, saveEntityMetadata } from '../core/EntityMetadata';
import type { EntityMetadata } from '../types/common';

export interface EntityOptions {
    tableName: string;
    softDelete?: boolean;
    softDeleteColumn?: string;
}

export const Entity = (options: EntityOptions): ClassDecorator => {
    return (target: Function) => {
        const metadata: EntityMetadata = getEntityMetadata(target);
        metadata.tableName = options.tableName;
        metadata.softDelete = metadata.softDelete ?? options.softDelete ?? !!options.softDeleteColumn;
        metadata.softDeleteColumn = metadata.softDeleteColumn ?? options.softDeleteColumn ?? (options.softDelete ? 'deleted_at' : undefined);
        saveEntityMetadata(target, metadata);
    };
};
