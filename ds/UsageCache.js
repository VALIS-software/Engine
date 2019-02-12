"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Useful for exploiting coherence between frames
 * - A 'usage cache' determines which objects can be reused and which objects can be released between frames
 */
var UsageCache = /** @class */ (function () {
    function UsageCache(onCacheMiss, onRemove) {
        this.onCacheMiss = onCacheMiss;
        this.onRemove = onRemove;
        this.cache = {};
        this.count = 0;
    }
    UsageCache.prototype.get = function (key, onCacheMiss) {
        var entry = this.cache[key];
        if (entry === undefined) {
            var value = onCacheMiss != null ? onCacheMiss(key) : this.onCacheMiss(key);
            entry = this.cache[key] = {
                value: value,
                used: true,
            };
            this.count++;
        }
        entry.used = true;
        return entry.value;
    };
    UsageCache.prototype.keys = function () {
        return Object.keys(this.cache);
    };
    UsageCache.prototype.forEachUsed = function (callback) {
        for (var key in this.cache) {
            var entry = this.cache[key];
            if (entry.used) {
                callback(entry.value);
            }
        }
    };
    UsageCache.prototype.markUnused = function (key) {
        this.cache[key].used = false;
    };
    UsageCache.prototype.markAllUnused = function () {
        // reset 'used' flag in cache
        for (var key in this.cache) {
            this.cache[key].used = false;
        }
    };
    UsageCache.prototype.remove = function (key) {
        var entry = this.cache[key];
        if (entry !== undefined) {
            this.count--;
            this.onRemove(entry.value);
            delete this.cache[key];
        }
    };
    UsageCache.prototype.removeUnused = function () {
        for (var key in this.cache) {
            var entry = this.cache[key];
            if (!entry.used) {
                this.count--;
                this.onRemove(entry.value);
                delete this.cache[key];
            }
        }
    };
    UsageCache.prototype.removeAll = function () {
        this.markAllUnused();
        this.removeUnused();
    };
    return UsageCache;
}());
exports.UsageCache = UsageCache;
exports.default = UsageCache;
