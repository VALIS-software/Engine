"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Scalar = /** @class */ (function () {
    function Scalar() {
    }
    Scalar.clamp = function (x, min, max) {
        return Math.min(Math.max(x, min), max);
    };
    /**
     * Linearly interpolate from `a` to `b` using `t`, where return is `a` for `t = 0` and `b` for `t = 1`
     */
    Scalar.lerp = function (a, b, t) {
        return a * (1 - t) + b * t;
    };
    /**
     * Return 0 at x <= edge0, return 1 for x >= edge1 and linearly interpolate in-between
     */
    Scalar.linstep = function (edge0, edge1, x) {
        return Scalar.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    };
    /**
     * Replicate GLSL smoothstep
     * - Return 0 for x <= edge0, 1 for x >= edge 1, and interpolate via 3x^2 - 2x^3 in-between
     * - Gradient is 0 at x = 0 and x = 1
     */
    Scalar.smoothstep = function (edge0, edge1, x) {
        x = Scalar.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return x * x * (3 - 2 * x);
    };
    // polyfill for ECMAScript 2015 Math methods
    Scalar.log2 = function (x) {
        return Math.log(x) * Math.LOG2E;
    };
    Scalar.log10 = function (x) {
        return Math.log(x) * Math.LOG10E;
    };
    Scalar.sign = function (x) {
        return ((x > 0) - (x < 0)) || +x;
    };
    return Scalar;
}());
exports.Scalar = Scalar;
exports.default = Scalar;
