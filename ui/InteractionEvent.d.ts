import Object2D from "./Object2D";
/**
 * Interaction Events
 * - Similar to PointerEvents but with a few new events and coordinates tuned for the scene-graph
 */
export interface InteractionEventMap {
    'pointermove': InteractionEvent;
    'pointerdown': InteractionEvent;
    'pointerup': InteractionEvent;
    'pointerenter': InteractionEvent;
    'pointerleave': InteractionEvent;
    'click': InteractionEvent;
    'dblclick': InteractionEvent;
    'wheel': WheelInteractionEvent;
    'dragstart': InteractionEvent;
    'dragmove': InteractionEvent;
    'dragend': InteractionEvent;
}
export declare type InteractionEventInternal = {
    defaultPrevented: boolean;
    propagationStopped: boolean;
};
export interface InteractionEventInit {
    target: Object2D;
    worldX: number;
    worldY: number;
    canvasX: number;
    canvasY: number;
    localX: number;
    localY: number;
    fractionX: number;
    fractionY: number;
    buttonChange: number;
    buttonState: number;
    altKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
    pointerId: number;
    isPrimary: boolean;
    pointerType: 'mouse' | 'pen' | 'touch';
    pressure: number;
    width: number;
    height: number;
    tiltX: number;
    tiltY: number;
}
export declare class InteractionEvent implements InteractionEventInit {
    protected readonly sourceEvent: Event;
    protected defaultPrevented: boolean;
    protected propagationStopped: boolean;
    readonly target: Object2D;
    readonly worldX: number;
    readonly worldY: number;
    readonly canvasX: number;
    readonly canvasY: number;
    readonly localX: number;
    readonly localY: number;
    readonly fractionX: number;
    readonly fractionY: number;
    readonly buttonChange: number;
    readonly buttonState: number;
    readonly altKey: boolean;
    readonly ctrlKey: boolean;
    readonly shiftKey: boolean;
    readonly metaKey: boolean;
    readonly pointerId: number;
    readonly isPrimary: boolean;
    readonly pointerType: 'mouse' | 'pen' | 'touch';
    readonly pressure: number;
    readonly width: number;
    readonly height: number;
    readonly tiltX: number;
    readonly tiltY: number;
    constructor(init: InteractionEventInit | InteractionEvent, sourceEvent: Event);
    preventDefault(): void;
    stopPropagation(): void;
}
export declare enum WheelDeltaMode {
    Pixel = 1,
    Line = 2,
    Page = 3
}
export interface WheelInteractionEventInit extends InteractionEventInit {
    wheelDeltaMode: WheelDeltaMode;
    wheelDeltaX: number;
    wheelDeltaY: number;
    wheelDeltaZ: number;
}
export declare class WheelInteractionEvent extends InteractionEvent {
    readonly wheelDeltaMode: WheelDeltaMode;
    readonly wheelDeltaX: number;
    readonly wheelDeltaY: number;
    readonly wheelDeltaZ: number;
    constructor(init: WheelInteractionEventInit, sourceEvent: Event);
}
export default InteractionEvent;
