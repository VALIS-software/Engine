"use strict";
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
/**
 * Physically based animation
 *
 * Todo:
 * - Improve data structures:
 *      - Can we avoid brute-force searches? (We should store hidden fields on the object, ugly but fast)
 *          - Risky if the object might iterate over keys
 *      - We could have an 'Animatable' type which could codify things like velocity
 *          - Less flexible more more powerful
 * - Parameterize springs by duration and normalized dampening
 * - Replace energy threshold with some user-controlled parameter?
 * - Implement traditional easing via step functions
 * - For fixed time springs we can implement a fix/physical blended version of springStep, that lerps to 0 as t -> duration
 */
var Animator = /** @class */ (function () {
    function Animator() {
        this.active = new Set();
        this.stepCallbacks = new Set();
        this.animationCompleteCallbacks = new Set();
    }
    Animator.prototype.springTo = function (object, fieldTargets, parameters, velocity) {
        // handle multiple types of spring parameters
        var springParameters = parameters instanceof Object ? parameters : {
            tension: parameters,
            friction: Math.sqrt(parameters) * 2
        };
        this.animation(object, fieldTargets, this.stringStep, springParameters, true, velocity);
    };
    Animator.prototype.spring = function (object, fieldTargets, parameters, velocity) {
        // handle multiple types of spring parameters
        var springParameters = parameters instanceof Object ? parameters : {
            tension: parameters,
            friction: Math.sqrt(parameters) * 2
        };
        this.animation(object, fieldTargets, this.stringStep, springParameters, false, velocity);
    };
    Animator.prototype.animation = function (object, fieldTargets, step, parameters, stopOnComplete, velocity) {
        var e_1, _a;
        var t_s = window.performance.now() / 1000;
        var entry = this.getActive(object);
        if (entry == null) {
            entry = {
                object: object,
                animatingFields: {},
            };
            this.active.add(entry);
        }
        var fields = Object.keys(fieldTargets);
        try {
            for (var fields_1 = __values(fields), fields_1_1 = fields_1.next(); !fields_1_1.done; fields_1_1 = fields_1.next()) {
                var field = fields_1_1.value;
                var target = fieldTargets[field];
                var current = object[field];
                var animation = entry.animatingFields[field];
                // create or update dynamic motion fields
                if (animation == null) {
                    animation = {
                        state: {
                            // initial state
                            x: target - current,
                            v: velocity == null ? 0 : velocity,
                            pe: 0,
                            t0: t_s,
                            lastT: t_s,
                        },
                        target: fieldTargets[field],
                        step: step,
                        parameters: parameters,
                        stopOnComplete: stopOnComplete,
                    };
                    entry.animatingFields[field] = animation;
                }
                else {
                    // animation is already active, update state
                    animation.state.x = target - current;
                    animation.state.v = velocity == null ? animation.state.v : velocity;
                    animation.state.t0 = t_s; // set t0 so easings are reset
                    animation.target = target;
                    animation.step = step;
                    animation.parameters = parameters;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (fields_1_1 && !fields_1_1.done && (_a = fields_1.return)) _a.call(fields_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    Animator.prototype.stop = function (object, fields) {
        var e_2, _a;
        if (fields == null) {
            this.removeActive(object);
        }
        else {
            var entry = this.getActive(object);
            if (entry === null)
                return;
            var fieldNames = Array.isArray(fields) ? fields : Object.keys(fields);
            try {
                for (var fieldNames_1 = __values(fieldNames), fieldNames_1_1 = fieldNames_1.next(); !fieldNames_1_1.done; fieldNames_1_1 = fieldNames_1.next()) {
                    var field = fieldNames_1_1.value;
                    delete entry.animatingFields[field];
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (fieldNames_1_1 && !fieldNames_1_1.done && (_a = fieldNames_1.return)) _a.call(fieldNames_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            // if there's no field animations left then remove the entry
            if (Object.keys(entry.animatingFields).length === 0) {
                this.active.delete(entry);
            }
        }
    };
    Animator.prototype.frame = function (time_s) {
        if (time_s === void 0) { time_s = window.performance.now() / 1000; }
        var e_3, _a, e_4, _b, e_5, _c;
        var steppedAnimationCount = 0;
        try {
            for (var _d = __values(this.active), _e = _d.next(); !_e.done; _e = _d.next()) {
                var entry = _e.value;
                var object = entry.object;
                var animatingFields = Object.keys(entry.animatingFields);
                try {
                    for (var animatingFields_1 = __values(animatingFields), animatingFields_1_1 = animatingFields_1.next(); !animatingFields_1_1.done; animatingFields_1_1 = animatingFields_1.next()) {
                        var field = animatingFields_1_1.value;
                        var animation = entry.animatingFields[field];
                        animation.state.x = animation.target - object[field];
                        animation.step(time_s, animation.state, animation.parameters);
                        object[field] = animation.target - animation.state.x;
                        steppedAnimationCount++;
                        // in joules
                        var kineticEnergy = .5 * animation.state.v * animation.state.v;
                        var totalEnergy = animation.state.pe + kineticEnergy;
                        // @! magic number: can we derive a condition that's linked to user-known properties
                        if (animation.stopOnComplete && totalEnergy < 0.000001) {
                            delete entry.animatingFields[field];
                            object[field] = animation.target;
                            this.fieldComplete(object, field);
                        }
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (animatingFields_1_1 && !animatingFields_1_1.done && (_b = animatingFields_1.return)) _b.call(animatingFields_1);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
                // if there's no field animations left then remove the entry
                if (Object.keys(entry.animatingFields).length === 0) {
                    this.active.delete(entry);
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
            }
            finally { if (e_3) throw e_3.error; }
        }
        try {
            // execute post-step callbacks
            for (var _f = __values(this.stepCallbacks), _g = _f.next(); !_g.done; _g = _f.next()) {
                var callback = _g.value;
                callback(steppedAnimationCount);
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_c = _f.return)) _c.call(_f);
            }
            finally { if (e_5) throw e_5.error; }
        }
    };
    Animator.prototype.activeAnimationCount = function () {
        return this.active.size;
    };
    Animator.prototype.addAnimationCompleteCallback = function (object, field, callback, once) {
        if (once === void 0) { once = true; }
        this.animationCompleteCallbacks.add({
            callback: callback,
            object: object,
            field: field,
            once: once,
        });
    };
    Animator.prototype.removeAnimationCompleteCallbacks = function (object, field, callback) {
        var e_6, _a;
        var removed = 0;
        try {
            for (var _b = __values(this.animationCompleteCallbacks), _c = _b.next(); !_c.done; _c = _b.next()) {
                var e = _c.value;
                if (e.callback === callback &&
                    e.field === field &&
                    e.object === object) {
                    this.animationCompleteCallbacks.delete(e);
                    removed++;
                }
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_6) throw e_6.error; }
        }
        return removed > 0;
    };
    /**
     * It's often useful to be able to execute code straight after the global animation step has finished
     */
    Animator.prototype.addStepCompleteCallback = function (callback) {
        this.stepCallbacks.add(callback);
    };
    Animator.prototype.removeStepCompleteCallback = function (callback) {
        return this.stepCallbacks.delete(callback);
    };
    Animator.prototype.fieldComplete = function (object, field) {
        var e_7, _a;
        try {
            for (var _b = __values(this.animationCompleteCallbacks), _c = _b.next(); !_c.done; _c = _b.next()) {
                var e = _c.value;
                if (e.object === object && e.field === field) {
                    // delete the callback if set to 'once'
                    if (e.once) {
                        this.animationCompleteCallbacks.delete(e);
                    }
                    e.callback(object);
                }
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_7) throw e_7.error; }
        }
    };
    Animator.prototype.stringStep = function (t_s, state, parameters) {
        var dt_s = t_s - state.lastT;
        state.lastT = t_s;
        // analytic integration (unconditionally stable)
        // references:
        // http://mathworld.wolfram.com/OverdampedSimpleHarmonicMotion.html
        // http://mathworld.wolfram.com/CriticallyDampedSimpleHarmonicMotion.html
        var k = parameters.tension;
        var f = parameters.friction;
        var t = dt_s;
        var v0 = state.v;
        var x0 = state.x;
        var critical = k * 4 - f * f;
        if (critical === 0) {
            // critically damped
            var w = Math.sqrt(k);
            var A = x0;
            var B = v0 + w * x0;
            var e = Math.exp(-w * t);
            state.x = (A + B * t) * e;
            state.v = (B - w * (A + B * t)) * e;
        }
        else if (critical <= 0) {
            // over-damped
            var sqrt = Math.sqrt(-critical);
            var rp = 0.5 * (-f + sqrt);
            var rn = 0.5 * (-f - sqrt);
            var B = (rn * x0 - v0) / (rn - rp);
            var A = x0 - B;
            var en = Math.exp(rn * t);
            var ep = Math.exp(rp * t);
            state.x = A * en + B * ep;
            state.v = A * rn * en + B * rp * ep;
        }
        else {
            // under-damped
            var a = -f / 2;
            var b = Math.sqrt(critical * 0.25);
            var phaseShift = Math.atan(b / ((v0 / x0) - a));
            var A = x0 / Math.sin(phaseShift);
            var e = Math.exp(a * t);
            var s = Math.sin(b * t + phaseShift);
            var c = Math.cos(b * t + phaseShift);
            state.x = A * e * s;
            state.v = A * e * (a * s + b * c);
        }
        state.pe = 0.5 * k * state.x * state.x;
    };
    Animator.prototype.getActive = function (object) {
        var e_8, _a;
        try {
            for (var _b = __values(this.active), _c = _b.next(); !_c.done; _c = _b.next()) {
                var entry = _c.value;
                if (object === entry.object)
                    return entry;
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_8) throw e_8.error; }
        }
        return null;
    };
    Animator.prototype.removeActive = function (object) {
        var e_9, _a;
        try {
            for (var _b = __values(this.active), _c = _b.next(); !_c.done; _c = _b.next()) {
                var entry = _c.value;
                if (entry.object === object) {
                    this.active.delete(entry);
                    return;
                }
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_9) throw e_9.error; }
        }
    };
    return Animator;
}());
exports.Animator = Animator;
exports.default = Animator;
