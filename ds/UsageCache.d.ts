/**
 * Useful for exploiting coherence between frames
 * - A 'usage cache' determines which objects can be reused and which objects can be released between frames
 */
export declare class UsageCache<T> {
    protected cache: {
        [key: string]: {
            value: T;
            used: boolean;
        };
    };
    readonly count: number;
    constructor();
    get(key: string, onCacheMiss: (key: string) => T): T;
    keys(): string[];
    forEachUsed(callback: (value: T) => void): void;
    markUnused(key: string): void;
    markAllUnused(): void;
    remove(key: string, onRemove: (value: T) => void): void;
    removeUnused(onRemove: (value: T) => void): void;
    removeAll(onRemove: (value: T) => void): void;
}
export default UsageCache;
