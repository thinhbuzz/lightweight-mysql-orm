import { createRelationMetadata, getEntityMetadata, saveEntityMetadata } from '../core/EntityMetadata';
import type { WhereClause } from '../types/common';

export interface OneToManyOptions<T> {
    foreignKey?: string;
    inverseSide: string;
    hidden?: boolean;
    where?: WhereClause<T>;
}

export const OneToMany = <T>(
    target: () => Function,
    options: OneToManyOptions<T>,
): PropertyDecorator => {
    return (targetObj: any, propertyKey: string | symbol) => {
        const entityMetadata = getEntityMetadata(targetObj.constructor);

        const relationMetadata = createRelationMetadata({
            propertyKey: propertyKey.toString(),
            type: 'OneToMany',
            target,
            foreignKey: options.foreignKey,
            inverseSide: options.inverseSide,
            where: options.where,
            hidden: options.hidden ?? false,
        });

        entityMetadata.relations.push(relationMetadata);
        saveEntityMetadata(targetObj.constructor, entityMetadata);
    };
};
