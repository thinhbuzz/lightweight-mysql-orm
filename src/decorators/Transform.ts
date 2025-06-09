import { getEntityMetadata, saveEntityMetadata } from '../core/EntityMetadata';

export function BeforeSave() {
    return <T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<(entity: Partial<T>) => Partial<T>>) => {
        const constructor = target.constructor;
        const metadata = getEntityMetadata(constructor);
        metadata.transformHooks.beforeSave = descriptor.value;

        saveEntityMetadata(constructor, metadata);
    };
}

export function AfterLoad() {
    return <T>(target: Object, _: string | symbol, descriptor: TypedPropertyDescriptor<(this: T) => T>) => {
        const constructor = target.constructor;
        const metadata = getEntityMetadata(constructor);
        metadata.transformHooks.afterLoad = descriptor.value;

        saveEntityMetadata(constructor, metadata);
    };
}
