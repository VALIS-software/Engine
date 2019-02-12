/**
 * Useful for exploiting coherence between frames
 * - A 'usage cache' determines which objects can be reused and which objects can be released between frames
 */
export declare class UsageCache<T> {
    protected onCacheMiss: (key: string) => T;
    protected onRemove: (value: T) => void;
    protected cache: {
        [key: string]: {
            value: T;
            used: boolean;
        };
    };
    readonly count: number;
    constructor(onCacheMiss: (key: string) => T, onRemove: (value: T) => void);
    get(key: string, onCacheMiss?: (key: string) => T): T;
    keys(): string[];
    forEachUsed(callback: (value: T) => void): void;
    markUnused(key: string): void;
    markAllUnused(): void;
    remove(key: string): void;
    removeUnused(): void;
    removeAll(): void;
}
export default UsageCache;
