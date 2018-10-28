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
export declare class AnimatorInstance {
    protected active: Set<{
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
    protected stepCallbacks: Set<(steppedAnimationCount: number) => void>;
    protected animationCompleteCallbacks: Set<{
        callback: (object: any) => void;
        object: any;
        field: string;
        once: boolean;
    }>;
    springTo(object: any, fieldTargets: {
        [key: string]: number;
    }, criticalTension: number, velocity?: number): void;
    springTo(object: any, fieldTargets: {
        [key: string]: number;
    }, parameters: {
        tension: number;
        friction: number;
    }, velocity?: number): void;
    spring(object: any, fieldTargets: {
        [key: string]: number;
    }, criticalTension: number, velocity?: number): void;
    spring(object: any, fieldTargets: {
        [key: string]: number;
    }, parameters: {
        tension: number;
        friction: number;
    }, velocity?: number): void;
    animation<T>(object: any, fieldTargets: {
        [key: string]: number;
    }, step: (dt_ms: number, state: AnimationState, parameters: T) => void, parameters: T, stopOnComplete: boolean, velocity?: number): void;
    stop(object: any, fields?: Array<string> | {
        [key: string]: number;
    }): void;
    frame(time_s?: number): void;
    activeAnimationCount(): number;
    addAnimationCompleteCallback<T>(object: T, field: string, callback: (object: T) => void, once?: boolean): void;
    removeAnimationCompleteCallbacks<T>(object: T, field: string, callback: (object: T) => void): boolean;
    /**
     * It's often useful to be able to execute code straight after the global animation step has finished
     */
    addStepCompleteCallback(callback: (steppedAnimationCount: number) => void): void;
    removeStepCompleteCallback(callback: (steppedAnimationCount: number) => void): boolean;
    private fieldComplete;
    private stringStep;
    private getActive;
    private removeActive;
}
declare type AnimationState = {
    x: number;
    v: number;
    pe: number;
    lastT: number;
    t0: number;
};
export default AnimatorInstance;
