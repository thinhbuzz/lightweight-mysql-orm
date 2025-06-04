import { createRelationMetadata, getEntityMetadata, saveEntityMetadata } from '../core/EntityMetadata';
import type { WhereClause } from '../types/common';

export interface ManyToManyOptions<T> {
    joinTableName: string;
    joinColumnName: string; // Foreign key in join table pointing to the current entity
    inverseJoinColumnName: string; // Foreign key in join table pointing to the target entity
    hidden?: boolean;
    where?: WhereClause<T>;
}

export const ManyToMany = <T>(
    target: () => Function,
    options: ManyToManyOptions<T>,
): PropertyDecorator => {
    return (targetObj: any, propertyKey: string | symbol) => {
        const entityMetadata = getEntityMetadata(targetObj.constructor);

        const relationMetadata = createRelationMetadata({
            propertyKey: propertyKey.toString(),
            type: 'ManyToMany',
            target,
            joinTableName: options.joinTableName,
            joinColumnName: options.joinColumnName,
            inverseJoinColumnName: options.inverseJoinColumnName,
            where: options.where,
            hidden: options.hidden ?? false,
        });

        entityMetadata.relations.push(relationMetadata);
        saveEntityMetadata(targetObj.constructor, entityMetadata);
    };
}; 