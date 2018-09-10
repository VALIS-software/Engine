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
export declare class Animator {
    protected static active: Set<{
        object: any;
        animatingFields: {
            [key: string]: {
                state: AnimationState;
                target: number;
                step: (dt_ms: number, state: AnimationState, parameters: any) => void;
                parameters: any;
                stopOnComplete: boolean;
            };
        };
    }>;
    protected static stepCallbacks: Set<(steppedAnimationCount: number) => void>;
    protected static animationCompleteCallbacks: Set<{
        callback: (object: any) => void;
        object: any;
        field: string;
        once: boolean;
    }>;
    static springTo(object: any, fieldTargets: {
        [key: string]: number;
    }, criticalTension: number, velocity?: number): void;
    static springTo(object: any, fieldTargets: {
        [key: string]: number;
    }, parameters: {
        tension: number;
        friction: number;
    }, velocity?: number): void;
    static spring(object: any, fieldTargets: {
        [key: string]: number;
    }, criticalTension: number, velocity?: number): void;
    static spring(object: any, fieldTargets: {
        [key: string]: number;
    }, parameters: {
        tension: number;
        friction: number;
    }, velocity?: number): void;
    static animation<T>(object: any, fieldTargets: {
        [key: string]: number;
    }, step: (dt_ms: number, state: AnimationState, parameters: T) => void, parameters: T, stopOnComplete: boolean, velocity?: number): void;
    static stop(object: any, fields?: Array<string> | {
        [key: string]: number;
    }): void;
    static frame(time_s?: number): void;
    static activeAnimationCount(): number;
    static addAnimationCompleteCallback<T>(object: T, field: string, callback: (object: T) => void, once?: boolean): void;
    static removeAnimationCompleteCallbacks<T>(object: T, field: string, callback: (object: T) => void): boolean;
    /**
     * It's often useful to be able to execute code straight after the global animation step has finished
     */
    static addStepCompleteCallback(callback: (steppedAnimationCount: number) => void): void;
    static removeStepCompleteCallback(callback: (steppedAnimationCount: number) => void): boolean;
    private static fieldComplete;
    private static stringStep;
    private static getActive;
    private static removeActive;
}
declare type AnimationState = {
    x: number;
    v: number;
    pe: number;
    lastT: number;
    t0: number;
};
export default Animator;
