import type {
    ColumnMetadata,
    EntityMetadata,
    ManyToManyRelationMetadata,
    ManyToOneRelationMetadata,
    OneToManyRelationMetadata,
    OneToOneRelationMetadata,
    RelationMetadata,
    TransformHooks,
} from '../types/common';

const metadataStore = new Map<Function, EntityMetadata>();

export const getEntityMetadata = (target: Function): EntityMetadata => {
    let metadata = metadataStore.get(target) || null;
    if (!metadata) {
        metadata = {
            tableName: '',
            softDelete: false,
            softDeleteColumn: undefined,
            columns: [],
            relations: [],
            transformHooks: {
                beforeSave: undefined,
                afterLoad: undefined,
            },
        } as EntityMetadata;
        saveEntityMetadata(target, metadata);
    }
    return metadata;
};

export const saveEntityMetadata = (target: Function, metadata: EntityMetadata): void => {
    metadataStore.set(target, metadata);
};

export const createColumnMetadata = (
    options: Partial<ColumnMetadata> = {},
): ColumnMetadata => {
    return {
        propertyKey: options.propertyKey || '',
        columnName: options.columnName || options.propertyKey || '',
        type: options.type || 'string',
        hidden: options.hidden ?? false,
        primary: options.primary ?? false,
        softDelete: options.softDelete ?? false,
    };
};

export const initializeTransformHooks = (): TransformHooks<any> => ({
    beforeSave: undefined,
    afterLoad: undefined,
});

export const createRelationMetadata = (
    relationData: RelationMetadata,
): RelationMetadata => {
    const propertyKey = relationData.propertyKey || '';
    const target = relationData.target || (() => Object);
    const hidden = relationData.hidden ?? false;
    const where = relationData.where;

    switch (relationData.type) {
        case 'OneToOne':
            return {
                type: 'OneToOne',
                propertyKey,
                target,
                hidden,
                where,
                foreignKey: relationData.foreignKey,
                localKey: relationData.localKey,
            } as OneToOneRelationMetadata;
        case 'OneToMany':
            return {
                type: 'OneToMany',
                propertyKey,
                target,
                hidden,
                where,
                foreignKey: relationData.foreignKey,
                inverseSide: relationData.inverseSide,
            } as OneToManyRelationMetadata;
        case 'ManyToOne':
            return {
                type: 'ManyToOne',
                propertyKey,
                target,
                hidden,
                where,
                foreignKey: relationData.foreignKey,
            } as ManyToOneRelationMetadata;
        case 'ManyToMany':
            return {
                type: 'ManyToMany',
                propertyKey,
                target,
                hidden,
                where,
                joinTableName: relationData.joinTableName,
                joinColumnName: relationData.joinColumnName,
                inverseJoinColumnName: relationData.inverseJoinColumnName,
            } as ManyToManyRelationMetadata;
        default:
            throw new Error(`Unknown relation type: ${(relationData as any).type}`);
    }
};
