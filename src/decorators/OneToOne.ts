import { createRelationMetadata, getEntityMetadata, saveEntityMetadata } from '../core/EntityMetadata';
import type { WhereClause } from '../types/common';

export interface OneToOneOptions<T> {
    foreignKey?: string;
    localKey?: string;
    hidden?: boolean;
    where?: WhereClause<T>;
}

export const OneToOne = <T>(
    target: () => Function,
    options: OneToOneOptions<T> = {},
): PropertyDecorator => {
    return (targetObj: any, propertyKey: string | symbol) => {
        const entityMetadata = getEntityMetadata(targetObj.constructor);

        const relationMetadata = createRelationMetadata({
            propertyKey: propertyKey.toString(),
            type: 'OneToOne',
            target,
            foreignKey: options.foreignKey,
            localKey: options.localKey,
            where: options.where,
            hidden: options.hidden ?? false,
        });

        entityMetadata.relations.push(relationMetadata);
        saveEntityMetadata(targetObj.constructor, entityMetadata);
    };
};
