import { getEntityMetadata, saveEntityMetadata } from '../core/EntityMetadata';

export function BeforeSave() {
    return (value: Function, context: ClassMethodDecoratorContext) => {
        context.addInitializer(function() {
            const constructor = (this as Function).constructor;
            const metadata = getEntityMetadata(constructor);

            metadata.transformHooks.beforeSave = (entity: any) => {
                return value.call(entity);
            };

            saveEntityMetadata(constructor, metadata);
        });
    };
}

export function AfterLoad() {
    return (value: Function, context: ClassMethodDecoratorContext) => {
        context.addInitializer(function() {
            const constructor = (this as Function).constructor;
            const metadata = getEntityMetadata(constructor);

            metadata.transformHooks.afterLoad = (entity: any) => {
                return value.call(entity);
            };

            saveEntityMetadata(constructor, metadata);
        });
    };
}
