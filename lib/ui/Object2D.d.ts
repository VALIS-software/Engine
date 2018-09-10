/// <reference types="node" />
import { EventEmitter } from 'events';
import { Renderable, RenderableInternal } from '../rendering/Renderable';
import { InteractionEventMap } from './InteractionEvent';
export declare type Object2DInternal = RenderableInternal & {
    eventEmitter: EventEmitter;
    worldTransformNeedsUpdate: boolean;
    worldTransformMat4: Float32Array;
    computedX: number;
    computedY: number;
    computedWidth: number;
    computedHeight: number;
    interactionEventListenerCount: {
        [Name in keyof InteractionEventMap]: number;
    };
};
export interface Layout {
    x: number;
    y: number;
    w: number;
    h: number;
    layoutX: number;
    layoutY: number;
    layoutW: number;
    layoutH: number;
    layoutParentX: number;
    layoutParentY: number;
}
/**
 * Implements 2D transforms, hierarchical layout and user interaction event handling
 * - Doesn't imply any particular display units
 */
export declare class Object2D extends Renderable<Object2D> implements Layout {
    x: number;
    y: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
    w: number;
    h: number;
    /**
     * When computing the world-transform, layoutX applies an offset in units of _this_ object's width
     */
    layoutX: number;
    /**
     * When computing the world-transform, layoutY applies an offset in units of _this_ object's height
     */
    layoutY: number;
    /**
     * When computing the world-transform, layoutParentX applies an offset in units of this object's _parent's_ width
     */
    layoutParentX: number;
    /**
     * When computing the world-transform, layoutParentY applies an offset in units of this object's _parent's_ height
     */
    layoutParentY: number;
    /**
     * When computing the world-transform, layoutW applies an offset to this object's width in units of this object's _parent's_ width
     */
    layoutW: number;
    /**
     * When computing the world-transform, layoutH applies an offset to this object's height in units of this object's _parent's_ height
     */
    layoutH: number;
    cursorStyle: null | string;
    protected _x: number;
    protected _y: number;
    protected _z: number;
    protected _sx: number;
    protected _sy: number;
    protected _sz: number;
    protected _w: number;
    protected _h: number;
    protected _layoutX: number;
    protected _layoutY: number;
    protected _layoutParentX: number;
    protected _layoutParentY: number;
    protected _layoutW: number;
    protected _layoutH: number;
    protected interactionEventListenerCount: {
        [Name in keyof InteractionEventMap]: number;
    };
    protected worldTransformNeedsUpdate: boolean;
    protected worldTransformMat4: Float32Array;
    protected computedX: number;
    protected computedY: number;
    protected computedWidth: number;
    protected computedHeight: number;
    protected eventEmitter: EventEmitter;
    constructor();
    add(child: Object2D): void;
    remove(child: Object2D): boolean;
    addEventListener(event: string, listener: (...args: any[]) => void): void;
    removeEventListener(event: string, listener: (...args: any[]) => void): void;
    addInteractionListener<K extends keyof InteractionEventMap>(event: K, listener: (e: InteractionEventMap[K]) => void): void;
    removeInteractionListener<K extends keyof InteractionEventMap>(event: K, listener: (e: InteractionEventMap[K]) => void): void;
    removeAllListeners(recursive: boolean): void;
    emit(event: string | symbol, args: any): void;
    applyTransformToSubNodes(root?: boolean): void;
    /**
     * Returns the local-space bounds in world-space coordinates
     * Assumes the scene-graph world transforms are all up-to-date
     */
    getWorldBounds(): {
        l: number;
        r: number;
        t: number;
        b: number;
    };
    getWorldZ(): number;
    getComputedWidth(): number;
    getComputedHeight(): number;
    getComputedX(): number;
    getComputedY(): number;
    protected onAdded(): void;
    protected onRemoved(): void;
    /**
     * Returns bounds in local-space coordinate after layout has been applied
     * Must be called _after_ tree transformations have been applied to correctly factor in layout
     */
    protected getLocalBounds(): {
        l: number;
        r: number;
        t: number;
        b: number;
    };
    protected computeLayout(parentWidth: number, parentHeight: number): void;
    protected applyWorldTransform(transformMat4: Float32Array | null): void;
    protected resetEventListenerCount(): void;
}
export default Object2D;
