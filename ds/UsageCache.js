"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Useful for exploiting coherence between frames
 * - A 'usage cache' determines which objects can be reused and which objects can be released between frames
 */
var UsageCache = /** @class */ (function () {
    function UsageCache() {
        this.cache = {};
        this.count = 0;
    }
    UsageCache.prototype.get = function (key, onCacheMiss) {
        var entry = this.cache[key];
        if (entry === undefined) {
            var value = onCacheMiss(key);
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
    UsageCache.prototype.remove = function (key, onRemove) {
        var entry = this.cache[key];
        if (entry !== undefined) {
            this.count--;
            onRemove(entry.value);
            delete this.cache[key];
        }
    };
    UsageCache.prototype.removeUnused = function (onRemove) {
        for (var key in this.cache) {
            var entry = this.cache[key];
            if (!entry.used) {
                this.count--;
                onRemove(entry.value);
                delete this.cache[key];
            }
        }
    };
    UsageCache.prototype.removeAll = function (onRemove) {
        this.markAllUnused();
        this.removeUnused(onRemove);
    };
    return UsageCache;
}());
exports.UsageCache = UsageCache;
exports.default = UsageCache;
