import type { ColumnMetadata, EntityMetadata, RelationMetadata, TransformHooks } from '../types/common';

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

export const saveEntityMetadata = (
    target: Function,
    metadata: EntityMetadata,
) => {
    metadataStore.set(target, metadata);
};

export const createColumnMetadata = (
    options: Partial<ColumnMetadata> = {},
): ColumnMetadata => {
    return {
        propertyKey: options.propertyKey || '',
        columnName: options.columnName || '',
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
    options: Partial<RelationMetadata> = {},
): RelationMetadata => {
    return {
        propertyKey: options.propertyKey || '',
        type: options.type || 'OneToOne',
        target: options.target || (() => Object),
        foreignKey: options.foreignKey,
        inverseSide: options.inverseSide,
        where: options.where,
        hidden: options.hidden,
    };
};
