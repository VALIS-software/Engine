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

export type InteractionEventInternal = {
    defaultPrevented: boolean;
    propagationStopped: boolean;
}

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

export class InteractionEvent {

    protected defaultPrevented = false;
    protected propagationStopped = false;
    
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

    // advanced data from PointerEvents API
    // https://www.w3.org/TR/pointerevents/
    readonly pointerId: number;
    readonly isPrimary: boolean;
    readonly pointerType: 'mouse' | 'pen' | 'touch';

    readonly pressure: number;
    readonly width: number;
    readonly height: number;
    readonly tiltX: number;
    readonly tiltY: number;

    constructor(init: InteractionEventInit, protected readonly sourceEvent: Event) {
        this.target = init.target;
        this.worldX = init.worldX;
        this.worldY = init.worldY;
        this.canvasX = init.canvasX;
        this.canvasY = init.canvasY;
        this.localX = init.localX;
        this.localY = init.localY;
        this.fractionX = init.fractionX;
        this.fractionY = init.fractionY;
        this.buttonChange = init.buttonChange;
        this.buttonState = init.buttonState;
        this.altKey = init.altKey;
        this.ctrlKey = init.ctrlKey;
        this.shiftKey = init.shiftKey;
        this.metaKey = init.metaKey;

        this.pointerId = init.pointerId;
        this.isPrimary = init.isPrimary;
        this.pointerType = init.pointerType;
        this.pressure = init.pressure;
        this.width = init.width;
        this.height = init.height;
        this.tiltX = init.tiltX;
        this.tiltY = init.tiltY;
    }

    preventDefault() {
        this.defaultPrevented = true;
        this.sourceEvent.preventDefault();
    }

    stopPropagation() {
        this.propagationStopped = true;
    }

}

export enum WheelDeltaMode {
    Pixel = 0x01,
    Line = 0x02,
    Page = 0x03,
}

export interface WheelInteractionEventInit extends InteractionEventInit {
    wheelDeltaMode: WheelDeltaMode,
    wheelDeltaX: number;
    wheelDeltaY: number;
    wheelDeltaZ: number;
}

export class WheelInteractionEvent extends InteractionEvent {
    readonly wheelDeltaMode: WheelDeltaMode;
    readonly wheelDeltaX: number;
    readonly wheelDeltaY: number;
    readonly wheelDeltaZ: number;

    constructor(init: WheelInteractionEventInit, sourceEvent: Event) {
        super(init, sourceEvent);
        this.wheelDeltaMode = init.wheelDeltaMode;
        this.wheelDeltaX = init.wheelDeltaX;
        this.wheelDeltaY = init.wheelDeltaY;
        this.wheelDeltaZ = init.wheelDeltaZ;
    }

}

export default InteractionEvent;