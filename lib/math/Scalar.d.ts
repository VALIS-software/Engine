export declare class Scalar {
    static clamp(x: number, min: number, max: number): number;
    /**
     * Linearly interpolate from `a` to `b` using `t`, where return is `a` for `t = 0` and `b` for `t = 1`
     */
    static lerp(a: number, b: number, t: number): number;
    /**
     * Return 0 at x <= edge0, return 1 for x >= edge1 and linearly interpolate in-between
     */
    static linstep(edge0: number, edge1: number, x: number): number;
    /**
     * Replicate GLSL smoothstep
     * - Return 0 for x <= edge0, 1 for x >= edge 1, and interpolate via 3x^2 - 2x^3 in-between
     * - Gradient is 0 at x = 0 and x = 1
     */
    static smoothstep(edge0: number, edge1: number, x: number): number;
    static log2(x: number): number;
    static log10(x: number): number;
    static sign(x: number): number;
}
export default Scalar;
