"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("events");
var Renderable_1 = require("../rendering/Renderable");
/**
 * Implements 2D transforms, hierarchical layout and user interaction event handling
 * - Doesn't imply any particular display units
 */
var Object2D = /** @class */ (function (_super) {
    __extends(Object2D, _super);
    function Object2D() {
        var _this = _super.call(this) || this;
        _this.cursorStyle = null;
        // transform parameters
        _this._x = 0;
        _this._y = 0;
        // the default local z-offset is 1 so that if z isn't changed then: worldZ = treeDepth
        _this._z = 1;
        _this._sx = 1;
        _this._sy = 1;
        _this._sz = 1;
        _this._w = 0;
        _this._h = 0;
        // layout parameters
        _this._originX = 0;
        _this._originY = 0;
        _this._relativeX = 0;
        _this._relativeY = 0;
        _this._relativeW = 0;
        _this._relativeH = 0;
        // we track the number of listeners for each interaction event to prevent work when emitting events
        _this.interactionEventListenerCount = null;
        _this.worldTransformNeedsUpdate = true;
        _this.worldTransformMat4 = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
        _this.computedX = 0;
        _this.computedY = 0;
        _this.computedWidth = 0;
        _this.computedHeight = 0;
        _this.eventEmitter = new events_1.EventEmitter();
        _this.resetEventListenerCount();
        // an Object2D cannot be rendered by itself but subclasses which can should set render to true
        _this.render = false;
        return _this;
    }
    Object.defineProperty(Object2D.prototype, "x", {
        get: function () { return this._x; },
        // position
        set: function (v) { this._x = v; this.worldTransformNeedsUpdate = true; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Object2D.prototype, "y", {
        get: function () { return this._y; },
        set: function (v) { this._y = v; this.worldTransformNeedsUpdate = true; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Object2D.prototype, "z", {
        get: function () { return this._z; },
        set: function (v) { this._z = v; this.worldTransformNeedsUpdate = true; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Object2D.prototype, "sx", {
        get: function () { return this._sx; },
        // scale
        set: function (v) { this._sx = v; this.worldTransformNeedsUpdate = true; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Object2D.prototype, "sy", {
        get: function () { return this._sy; },
        set: function (v) { this._sy = v; this.worldTransformNeedsUpdate = true; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Object2D.prototype, "sz", {
        get: function () { return this._sz; },
        set: function (v) { this._sz = v; this.worldTransformNeedsUpdate = true; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Object2D.prototype, "w", {
        get: function () { return this._w; },
        // width & height
        // interpreted individually by subclasses and does not correspond directly to vertex geometry
        set: function (w) { this._w = w; this.worldTransformNeedsUpdate = true; },
        enumerable: true,
        configurable: true
    });
    ;
    Object.defineProperty(Object2D.prototype, "h", {
        get: function () { return this._h; },
        set: function (h) { this._h = h; this.worldTransformNeedsUpdate = true; },
        enumerable: true,
        configurable: true
    });
    ;
    Object.defineProperty(Object2D.prototype, "originX", {
        get: function () { return this._originX; },
        /**
         * When computing the world-transform, originX applies an offset in units of _this_ object's width.
         * For example, setting originX and originY to -1 will offset the object so the bottom right corner is placed where top-left used to be
         *
         */
        set: function (wx) { this._originX = wx; this.worldTransformNeedsUpdate = true; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Object2D.prototype, "originY", {
        get: function () { return this._originY; },
        /**
         * When computing the world-transform, originY applies an offset in units of _this_ object's height
         */
        set: function (hy) { this._originY = hy; this.worldTransformNeedsUpdate = true; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Object2D.prototype, "relativeX", {
        get: function () { return this._relativeX; },
        /**
         * When computing the world-transform, relativeX applies an offset in units of this object's _parent's_ width
         */
        set: function (wx) { this._relativeX = wx; this.worldTransformNeedsUpdate = true; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Object2D.prototype, "relativeY", {
        get: function () { return this._relativeY; },
        /**
         * When computing the world-transform, relativeY applies an offset in units of this object's _parent's_ height
         */
        set: function (hy) { this._relativeY = hy; this.worldTransformNeedsUpdate = true; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Object2D.prototype, "relativeW", {
        get: function () { return this._relativeW; },
        /**
         * When computing the world-transform, relativeW applies an offset to this object's width in units of this object's _parent's_ width
         */
        set: function (w) { this._relativeW = w; this.worldTransformNeedsUpdate = true; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Object2D.prototype, "relativeH", {
        get: function () { return this._relativeH; },
        /**
         * When computing the world-transform, relativeH applies an offset to this object's height in units of this object's _parent's_ height
         */
        set: function (h) { this._relativeH = h; this.worldTransformNeedsUpdate = true; },
        enumerable: true,
        configurable: true
    });
    Object2D.prototype.add = function (child) {
        _super.prototype.add.call(this, child);
        child.worldTransformNeedsUpdate = true;
        child.onAdded();
    };
    Object2D.prototype.remove = function (child) {
        if (_super.prototype.remove.call(this, child)) {
            child.onRemoved();
        }
        else {
            return false;
        }
    };
    Object2D.prototype.addEventListener = function (event, listener) {
        var isInteractionEvent = Object.keys(this.interactionEventListenerCount).indexOf(event) !== -1;
        if (isInteractionEvent) {
            this.addInteractionListener(event, listener);
        }
        else {
            this.eventEmitter.addListener(event, listener);
        }
    };
    Object2D.prototype.removeEventListener = function (event, listener) {
        var isInteractionEvent = Object.keys(this.interactionEventListenerCount).indexOf(event) !== -1;
        if (isInteractionEvent) {
            this.removeInteractionListener(event, listener);
        }
        else {
            this.eventEmitter.removeListener(event, listener);
        }
    };
    Object2D.prototype.addInteractionListener = function (event, listener) {
        this.eventEmitter.addListener(event, listener);
        this.interactionEventListenerCount[event]++;
    };
    Object2D.prototype.removeInteractionListener = function (event, listener) {
        if (this.eventEmitter.listenerCount(event) > 0) {
            this.eventEmitter.removeListener(event, listener);
            this.interactionEventListenerCount[event]--;
        }
    };
    Object2D.prototype.removeAllListeners = function (recursive) {
        var e_1, _a;
        this.eventEmitter.removeAllListeners();
        this.resetEventListenerCount();
        if (recursive) {
            try {
                for (var _b = __values(this.children), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var child = _c.value;
                    child.removeAllListeners(recursive);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
    };
    Object2D.prototype.emit = function (event, args) {
        this.eventEmitter.emit(event, args);
    };
    Object2D.prototype.applyTransformToSubNodes = function (root) {
        if (root === void 0) { root = true; }
        var e_2, _a;
        if (root && this.worldTransformNeedsUpdate) {
            this.computeLayout(0, 0);
            this.applyWorldTransform(null);
        }
        try {
            // apply world transform to children
            for (var _b = __values(this.children), _c = _b.next(); !_c.done; _c = _b.next()) {
                var child = _c.value;
                if (child.worldTransformNeedsUpdate) {
                    child.computeLayout(this.computedWidth, this.computedHeight);
                    child.applyWorldTransform(this.worldTransformMat4);
                }
                child.applyTransformToSubNodes(false);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
    };
    /**
     * Returns the local-space bounds in world-space coordinates
     * Assumes the scene-graph world transforms are all up-to-date
     */
    Object2D.prototype.getWorldBounds = function () {
        var w = this.worldTransformMat4;
        var b = this.getLocalBounds();
        return {
            l: w[0] * b.l + w[12],
            r: w[0] * b.r + w[12],
            t: w[5] * b.t + w[13],
            b: w[5] * b.b + w[13],
        };
    };
    Object2D.prototype.getWorldZ = function () {
        return this.worldTransformMat4[14];
    };
    Object2D.prototype.getComputedWidth = function () {
        return this.computedWidth;
    };
    Object2D.prototype.getComputedHeight = function () {
        return this.computedHeight;
    };
    Object2D.prototype.getComputedX = function () {
        return this.computedX;
    };
    Object2D.prototype.getComputedY = function () {
        return this.computedY;
    };
    Object2D.prototype.onAdded = function () { };
    Object2D.prototype.onRemoved = function () { };
    /**
     * Returns bounds in local-space coordinate after layout has been applied
     * Must be called _after_ tree transformations have been applied to correctly factor in layout
     */
    Object2D.prototype.getLocalBounds = function () {
        return {
            l: 0,
            r: this.computedWidth,
            t: 0,
            b: this.computedHeight,
        };
    };
    Object2D.prototype.computeLayout = function (parentWidth, parentHeight) {
        this.computedWidth = Math.max(this._w + parentWidth * this._relativeW, 0);
        this.computedHeight = Math.max(this._h + parentHeight * this._relativeH, 0);
        this.computedX = this._x + parentWidth * this._relativeX + this.computedWidth * this._originX;
        this.computedY = this._y + parentHeight * this._relativeY + this.computedHeight * this._originY;
    };
    Object2D.prototype.applyWorldTransform = function (transformMat4) {
        var e_3, _a, e_4, _b;
        if (transformMat4 == null) {
            var cx = this.computedX;
            var cy = this.computedY;
            this.worldTransformMat4.set([
                this._sx, 0, 0, 0,
                0, this._sy, 0, 0,
                0, 0, this._sz, 0,
                cx, cy, this._z, 1
            ]);
            this.worldTransformNeedsUpdate = false;
            try {
                for (var _c = __values(this.children), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var c = _d.value;
                    c.worldTransformNeedsUpdate = true;
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
        else {
            var p = transformMat4;
            // in non-rotational affine transformation only elements 0, 5, 12, 13, 14 are non-zero
            // scale
            var m0 = p[0] * this._sx; // x
            var m5 = p[5] * this._sy; // y
            var m10 = p[10] * this._sz; // z
            var m15 = 1; // w
            // translation
            var m12 = p[0] * this.computedX + p[12]; // x
            var m13 = p[5] * this.computedY + p[13]; // y
            var m14 = p[10] * this._z + p[14]; // z
            // set world matrix
            var w = this.worldTransformMat4;
            w[0] = m0;
            w[1] = 0;
            w[2] = 0;
            w[3] = 0;
            w[4] = 0;
            w[5] = m5;
            w[6] = 0;
            w[7] = 0;
            w[8] = 0;
            w[9] = 0;
            w[10] = m10;
            w[11] = 0;
            w[12] = m12;
            w[13] = m13;
            w[14] = m14;
            w[15] = m15;
            this.worldTransformNeedsUpdate = false;
            try {
                // if the world matrix of the child has changed, then we must inform the children that they're out of sync also
                for (var _e = __values(this.children), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var cc = _f.value;
                    cc.worldTransformNeedsUpdate = true;
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
        this.renderOrderZ = this.worldTransformMat4[14];
    };
    Object2D.prototype.resetEventListenerCount = function () {
        this.interactionEventListenerCount = {
            pointermove: 0,
            pointerdown: 0,
            pointerup: 0,
            pointerenter: 0,
            pointerleave: 0,
            click: 0,
            dblclick: 0,
            wheel: 0,
            dragstart: 0,
            dragmove: 0,
            dragend: 0,
        };
    };
    return Object2D;
}(Renderable_1.Renderable));
exports.Object2D = Object2D;
exports.default = Object2D;
