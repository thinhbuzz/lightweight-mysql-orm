export  type UnionToIntersection<U> =
    (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

export function applyMixins(derivedCtor: any, baseCtors: any[]) {
    baseCtors.forEach(baseCtor => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
            if (name !== 'constructor') {
                const descriptor = Object.getOwnPropertyDescriptor(baseCtor.prototype, name);
                if (descriptor) {
                    Object.defineProperty(derivedCtor.prototype, name, descriptor);
                }
            }
        });
    });
}

export function mixins<T extends (new (...args: any[]) => any)[]>(...classes: T) {
    class MixinClass {
    }

    applyMixins(MixinClass, classes);
    return MixinClass as new () => UnionToIntersection<InstanceType<T[number]>>;
}
