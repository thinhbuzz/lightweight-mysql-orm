import type { EntityMetadata, JsonSerializable } from '../types/common';
import { getEntityMetadata } from './EntityMetadata';

export interface IJsonSerializable {
    toJSON(): Record<string, any>;
}

export function callToSJSON(object?: Partial<IJsonSerializable>) {
    if (!object) {
        return object;
    }
    return object.toJSON ? object.toJSON() : object;
}

export class JsonSerialize {
    toJSON() {
        const metadata: EntityMetadata = getEntityMetadata(this.constructor);
        const json: Record<string, any> = {};
        metadata.columns.forEach(column => {
            if (!column.hidden) {
                json[column.columnName] = this[column.propertyKey as keyof this];
            }
        });
        metadata.relations.forEach(relation => {
            if (!relation.hidden) {
                const instance = this[relation.propertyKey as keyof this] as JsonSerializable | JsonSerializable[] | undefined;
                json[relation.propertyKey] = Array.isArray(instance) ? instance.map((item) => callToSJSON(item)) : callToSJSON(instance);
            }
        });
        return json;
    }
}
