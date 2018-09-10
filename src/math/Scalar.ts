export class Scalar {

    static clamp(x: number, min: number, max: number) {
        return Math.min(Math.max(x, min), max);
    }

    /**
     * Linearly interpolate from `a` to `b` using `t`, where return is `a` for `t = 0` and `b` for `t = 1`
     */
    static lerp(a: number, b: number, t: number) {
        return a * (1 - t) + b * t;
    }

    /**
     * Return 0 at x <= edge0, return 1 for x >= edge1 and linearly interpolate in-between
     */
    static linstep(edge0: number, edge1: number, x: number) {
        return Scalar.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    }

    /**
     * Replicate GLSL smoothstep
     * - Return 0 for x <= edge0, 1 for x >= edge 1, and interpolate via 3x^2 - 2x^3 in-between
     * - Gradient is 0 at x = 0 and x = 1
     */
    static smoothstep(edge0: number, edge1: number, x: number) {
        x = Scalar.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return x * x * (3 - 2 * x);
    }

    // polyfill for ECMAScript 2015 Math methods

    static log2(x: number) {
        return Math.log(x) * Math.LOG2E;
    }

    static log10(x: number) {
        return Math.log(x) * Math.LOG10E;
    }

    static sign(x: number) {
        return (((x > 0) as any) - ((x < 0) as any)) || +x;
    }

}

export default Scalar;