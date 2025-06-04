import { createRelationMetadata, getEntityMetadata, saveEntityMetadata } from '../core/EntityMetadata';
import type { WhereClause } from '../types/common';

export interface ManyToOneOptions<T> {
    foreignKey?: string;
    hidden?: boolean;
    where?: WhereClause<T>
}

export const ManyToOne = <T>(
    target: () => Function,
    options: ManyToOneOptions<T> = {},
): PropertyDecorator => {
    return (targetObj: any, propertyKey: string | symbol) => {
        const entityMetadata = getEntityMetadata(targetObj.constructor);

        const relationMetadata = createRelationMetadata({
            propertyKey: propertyKey.toString(),
            type: 'ManyToOne',
            target,
            foreignKey: options.foreignKey,
            where: options.where,
            hidden: options.hidden ?? false,
        });

        entityMetadata.relations.push(relationMetadata);
        saveEntityMetadata(targetObj.constructor, entityMetadata);
    };
};
