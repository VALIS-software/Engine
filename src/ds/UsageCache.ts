/**
 * Useful for exploiting coherence between frames
 * - A 'usage cache' determines which objects can be reused and which objects can be released between frames
 */
export class UsageCache<T> {

    protected cache: {
        [key: string]: {
            value: T,
            used: boolean,
        }
    } = {};

    readonly count: number = 0;

    constructor() {}

    get(key: string, onCacheMiss: (key: string) => T) {
        let entry = this.cache[key];

        if (entry === undefined) {
            let value = onCacheMiss(key);

            entry = this.cache[key] = {
                value: value,
                used: true,
            };

            (this.count as any)++;
        }

        entry.used = true;

        return entry.value;
    }

    keys() {
        return Object.keys(this.cache);
    }

    markUnused(key: string) {
        this.cache[key].used = false;
    }

    markAllUnused() {
        // reset 'used' flag in cache
        for (let key in this.cache) {
            this.cache[key].used = false;
        }
    }

    remove(key: string, onRemove: (value: T) => void) {
        let entry = this.cache[key];
        if (entry !== undefined) {
            (this.count as any)--;
            onRemove(entry.value);
            delete this.cache[key];
        }
    }

    removeUnused(onRemove: (value: T) => void) {
        for (let key in this.cache) {
            let entry = this.cache[key];
            if (!entry.used) {
                (this.count as any)--;
                onRemove(entry.value);
                delete this.cache[key];
            }
        }
    }

    removeAll(onRemove: (value: T) => void) {
        this.markAllUnused();
        this.removeUnused(onRemove);
    }

}

export default UsageCache;