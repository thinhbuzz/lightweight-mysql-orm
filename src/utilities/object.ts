export function cast<T extends object>(entityClass: new () => T, data: object): T {
    return Object.assign(new entityClass() as T, data) as T;
}
