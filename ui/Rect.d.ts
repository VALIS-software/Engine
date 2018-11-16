import { GPUDevice, AttributeLayout } from "../rendering/GPUDevice";
import { DrawContext } from "../rendering/Renderer";
import { Object2D } from "./Object2D";
/**
 * Rectangle UI element
 *
 * Todo:
 * - Support rounded corners, stroke, glow & shadows, background shaders
 */
export declare class Rect extends Object2D {
    color: Float32Array;
    /**
     * When set to 0, blending is additive, when set to 1, blending is normal alpha blending
     */
    blendFactor: number;
    protected attributeLayout: AttributeLayout;
    constructor(w?: number, h?: number, color?: ArrayLike<number>);
    allocateGPUResources(device: GPUDevice): void;
    releaseGPUResources(): void;
    draw(context: DrawContext): void;
    protected getVertexCode(): string;
    protected getFragmentCode(): string;
}
export default Rect;
