import { getEntityMetadata } from './EntityMetadata';

export interface ISoftDelete {
    deleted(): boolean;
}

export type DeletedFindOptions = { withDeleted?: boolean };

export class SoftDelete implements ISoftDelete {
    deleted(): boolean {
        const entityMetadata = getEntityMetadata(this.constructor);
        if (!entityMetadata.softDelete || !entityMetadata.softDeleteColumn) {
            return false;
        }
        const deletedAt = this[entityMetadata.softDeleteColumn as keyof this];
        return deletedAt !== null && deletedAt !== undefined;
    }
}
