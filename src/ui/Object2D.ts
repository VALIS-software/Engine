import { EventEmitter } from 'events';
import { Renderable, RenderableInternal } from '../rendering/Renderable';
import { InteractionEventMap } from './InteractionEvent';

export type Object2DInternal = RenderableInternal & {
    eventEmitter: EventEmitter,
    worldTransformNeedsUpdate: boolean,
    worldTransformMat4: Float32Array,
    computedX: number,
    computedY: number,
    computedWidth: number,
    computedHeight: number,
    interactionEventListenerCount: { [Name in keyof InteractionEventMap]: number },
}

export interface Layout {
    x: number,
    y: number,
    w: number,
    h: number,

    originX: number,
    originY: number,
    
    relativeW: number,
    relativeH: number,

    relativeX: number,
    relativeY: number,
}

/**
 * Implements 2D transforms, hierarchical layout and user interaction event handling
 * - Doesn't imply any particular display units
 */
export class Object2D extends Renderable<Object2D> implements Layout {

    // position
    set x(v: number) { this._x = v; this.worldTransformNeedsUpdate = true; }
    get x() { return this._x; }
    set y(v: number) { this._y = v; this.worldTransformNeedsUpdate = true; }
    get y() { return this._y; }
    set z(v: number) { this._z = v; this.worldTransformNeedsUpdate = true; }
    get z() { return this._z; }

    // scale
    set sx(v: number) { this._sx = v; this.worldTransformNeedsUpdate = true; }
    get sx() { return this._sx; }
    set sy(v: number) { this._sy = v; this.worldTransformNeedsUpdate = true; }
    get sy() { return this._sy; }
    set sz(v: number) { this._sz = v; this.worldTransformNeedsUpdate = true; }
    get sz() { return this._sz }

    // width & height
    // interpreted individually by subclasses and does not correspond directly to vertex geometry
    set w(w: number) { this._w = w; this.worldTransformNeedsUpdate = true; };
    get w() { return this._w; }
    set h(h: number) { this._h = h; this.worldTransformNeedsUpdate = true; };
    get h() { return this._h; }

    /**
     * When computing the world-transform, originX applies an offset in units of _this_ object's width.
     * For example, setting originX and originY to -1 will offset the object so the bottom right corner is placed where top-left used to be
     * 
     */
    set originX(wx: number) { this._originX = wx; this.worldTransformNeedsUpdate = true; }
    get originX() { return this._originX; }
    /**
     * When computing the world-transform, originY applies an offset in units of _this_ object's height
     */
    set originY(hy: number) { this._originY = hy; this.worldTransformNeedsUpdate = true; }
    get originY() { return this._originY; }
    /**
     * When computing the world-transform, relativeX applies an offset in units of this object's _parent's_ width
     */
    set relativeX(wx: number) { this._relativeX = wx; this.worldTransformNeedsUpdate = true; }
    get relativeX() { return this._relativeX; }
    /**
     * When computing the world-transform, relativeY applies an offset in units of this object's _parent's_ height
     */
    set relativeY(hy: number) { this._relativeY = hy; this.worldTransformNeedsUpdate = true; }
    get relativeY() { return this._relativeY; }
    /**
     * When computing the world-transform, relativeW applies an offset to this object's width in units of this object's _parent's_ width
     */
    set relativeW(w: number) { this._relativeW = w; this.worldTransformNeedsUpdate = true; }
    get relativeW() { return this._relativeW; }
    /**
     * When computing the world-transform, relativeH applies an offset to this object's height in units of this object's _parent's_ height
     */
    set relativeH(h: number) { this._relativeH = h; this.worldTransformNeedsUpdate = true; }
    get relativeH() { return this._relativeH; }

    cursorStyle: null | string = null;

    // transform parameters
    protected _x: number = 0;
    protected _y: number = 0;

    // the default local z-offset is 1 so that if z isn't changed then: worldZ = treeDepth
    protected _z: number = 1;

    protected _sx: number = 1;
    protected _sy: number = 1;
    protected _sz: number = 1;

    protected _w: number = 0;
    protected _h: number = 0;

    // layout parameters
    protected _originX: number = 0;
    protected _originY: number = 0;
    protected _relativeX: number = 0;
    protected _relativeY: number = 0;
    protected _relativeW: number = 0;
    protected _relativeH: number = 0;

    // we track the number of listeners for each interaction event to prevent work when emitting events
    protected interactionEventListenerCount: { [Name in keyof InteractionEventMap]: number } = null;

    protected worldTransformNeedsUpdate = true;
    protected worldTransformMat4 = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);

    protected computedX: number = 0;
    protected computedY: number = 0;
    protected computedWidth: number = 0;
    protected computedHeight: number = 0;

    protected eventEmitter = new EventEmitter();

    constructor() {
        super();
        this.resetEventListenerCount();
        // an Object2D cannot be rendered by itself but subclasses which can should set render to true
        this.render = false;
    }

    add(child: Object2D) {
        super.add(child);
        child.worldTransformNeedsUpdate = true;
        child.onAdded();
    }

    remove(child: Object2D) {
        if (super.remove(child)) {
            child.onRemoved();
        } else {
            return false;
        }
    }

    addEventListener(event: string, listener: (... args: any[]) => void) {
        let isInteractionEvent = Object.keys(this.interactionEventListenerCount).indexOf(event) !== -1;
        if (isInteractionEvent) {
            this.addInteractionListener(event as any, listener);
        } else {
            this.eventEmitter.addListener(event, listener);
        }
    }

    removeEventListener(event: string, listener: (...args: any[]) => void) {
        let isInteractionEvent = Object.keys(this.interactionEventListenerCount).indexOf(event) !== -1;
        if (isInteractionEvent) {
            this.removeInteractionListener(event as any, listener);
        } else  {
            this.eventEmitter.removeListener(event, listener);
        }
    }

    addInteractionListener<K extends keyof InteractionEventMap>(event: K, listener: (e: InteractionEventMap[K]) => void) {
        this.eventEmitter.addListener(event, listener);
        this.interactionEventListenerCount[event]++;
    }

    removeInteractionListener<K extends keyof InteractionEventMap>(event: K, listener: (e: InteractionEventMap[K]) => void) {
        if (this.eventEmitter.listenerCount(event) > 0) {
            this.eventEmitter.removeListener(event, listener);
            this.interactionEventListenerCount[event]--;
        }
    }

    removeAllListeners(recursive: boolean) {
        this.eventEmitter.removeAllListeners();
        this.resetEventListenerCount();
        if (recursive) {
            for (let child of this.children) {
                child.removeAllListeners(recursive);
            }
        }
    }

    emit(event: string | symbol, args: any) {
        this.eventEmitter.emit(event, args);
    }

    applyTransformToSubNodes(root: boolean = true) {
        if (root && this.worldTransformNeedsUpdate) {
            this.computeLayout(0, 0);
            this.applyWorldTransform(null);
        }

        // apply world transform to children
        for (let child of this.children) {
            if (child.worldTransformNeedsUpdate) {
                child.computeLayout(this.computedWidth, this.computedHeight);
                child.applyWorldTransform(this.worldTransformMat4);
            }

            child.applyTransformToSubNodes(false);
        }
    }

    /**
     * Returns the local-space bounds in world-space coordinates
     * Assumes the scene-graph world transforms are all up-to-date
     */
    getWorldBounds() {
        let w = this.worldTransformMat4;
        let b = this.getLocalBounds();

        return {
            l: w[0] * b.l + w[12],
            r: w[0] * b.r + w[12],
            t: w[5] * b.t + w[13],
            b: w[5] * b.b + w[13],
        }
    }

    getWorldZ() {
        return this.worldTransformMat4[14];
    }

    getComputedWidth() {
        return this.computedWidth;
    }

    getComputedHeight() {
        return this.computedHeight;
    }

    getComputedX() {
        return this.computedX;
    }

    getComputedY() {
        return this.computedY;
    }

    protected onAdded() { }
    protected onRemoved() { }

    /**
     * Returns bounds in local-space coordinate after layout has been applied
     * Must be called _after_ tree transformations have been applied to correctly factor in layout
     */
    protected getLocalBounds() {
        return {
            l: 0,
            r: this.computedWidth,
            t: 0,
            b: this.computedHeight,
        }
    }

    protected computeLayout(parentWidth: number, parentHeight: number) {
        this.computedWidth = Math.max(this._w + parentWidth * this._relativeW, 0);
        this.computedHeight = Math.max(this._h + parentHeight * this._relativeH, 0);

        this.computedX = this._x + parentWidth * this._relativeX + this.computedWidth * this._originX;
        this.computedY = this._y + parentHeight * this._relativeY + this.computedHeight * this._originY;
    }

    protected applyWorldTransform(transformMat4: Float32Array | null) {
        if (transformMat4 == null) {
            let cx = this.computedX;
            let cy = this.computedY;

            this.worldTransformMat4.set([
                this._sx , 0        , 0        , 0 ,
                0        , this._sy , 0        , 0 ,
                0        , 0        , this._sz , 0 ,
                cx       , cy       , this._z  , 1
            ]);

            this.worldTransformNeedsUpdate = false;

            for (let c of this.children) c.worldTransformNeedsUpdate = true;
        } else {
            let p = transformMat4;

            // in non-rotational affine transformation only elements 0, 5, 12, 13, 14 are non-zero
            // scale
            let m0 = p[0] * this._sx;   // x
            let m5 = p[5] * this._sy;   // y
            let m10 = p[10] * this._sz; // z
            let m15 = 1;                // w

            // translation
            let m12 = p[0] * this.computedX + p[12];  // x
            let m13 = p[5] * this.computedY + p[13];  // y
            let m14 = p[10] * this._z + p[14];        // z

            // set world matrix
            let w = this.worldTransformMat4;
            w[0]  = m0;   w[1] = 0;     w[2] = 0;    w[3] = 0;
            w[4]  = 0;    w[5] = m5;    w[6] = 0;    w[7] = 0;
            w[8]  = 0;    w[9] = 0;    w[10] = m10; w[11] = 0;
            w[12] = m12; w[13] = m13;  w[14] = m14; w[15] = m15;

            this.worldTransformNeedsUpdate = false;


            // if the world matrix of the child has changed, then we must inform the children that they're out of sync also
            for (let cc of this.children) cc.worldTransformNeedsUpdate = true;
        }

        this.renderOrderZ = this.worldTransformMat4[14];
    }

    protected resetEventListenerCount() {
        this.interactionEventListenerCount = {
            pointermove: 0,
            pointerdown: 0,
            pointerup: 0,
            pointerenter: 0,
            pointerleave: 0,
            click: 0,
            dblclick: 0,
            wheel: 0,
            dragstart: 0,
            dragmove: 0,
            dragend: 0,
        };
    }

}

export default Object2D;