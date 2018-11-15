/**
 * Physically based animation
 *
 * Todo:
 * - Parameterize springs by duration and normalized dampening
 * - Replace energy threshold with some user-controlled parameter?
 * - Implement traditional easing via step functions
 * - For fixed time springs we can implement a fix/physical blended version of springStep, that lerps to 0 as t -> duration
 */
export declare class AnimatorInstance {
    protected active: Map<any, {
        [field: string]: {
            state: AnimationState;
            target: number;
            step: (dt_ms: number, state: AnimationState, parameters: any) => void;
            parameters: any;
            stopOnComplete: boolean;
        };
    }>;
    protected stepCallbacks: Set<(steppedAnimationCount: number) => void>;
    protected animationCompleteCallbacks: Set<{
        callback: (object: any) => void;
        object: any;
        field: string;
        once: boolean;
    }>;
    springTo<T>(object: T, fieldTargets: {
        [K in keyof T]?: number;
    }, criticalTension: number, velocity?: number): void;
    springTo<T>(object: T, fieldTargets: {
        [K in keyof T]?: number;
    }, parameters: {
        tension: number;
        friction: number;
    }, velocity?: number): void;
    spring<T>(object: T, fieldTargets: {
        [K in keyof T]?: number;
    }, criticalTension: number, velocity?: number): void;
    spring<T>(object: T, fieldTargets: {
        [K in keyof T]?: number;
    }, parameters: {
        tension: number;
        friction: number;
    }, velocity?: number): void;
    animation<T extends {
        [key: string]: any;
    }, P>(object: T, fieldTargets: {
        [K in keyof T]?: number;
    }, step: (dt_ms: number, state: AnimationState, parameters: P) => void, parameters: P, stopOnComplete: boolean, velocity?: number): void;
    stop<T extends {
        [key: string]: any;
    }>(object: T, fields?: Array<keyof T> | {
        [K in keyof T]?: number;
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
}
declare type AnimationState = {
    x: number;
    v: number;
    pe: number;
    lastT: number;
    t0: number;
};
export default AnimatorInstance;
