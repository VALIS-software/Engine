import Node from './Node';
import RenderPass from './RenderPass';
import { GPUDevice, GPUProgram, GPUVertexState } from './GPUDevice';
import { BlendMode, DrawContext } from './Renderer';

export type RenderableInternal = {
	gpuResourcesNeedAllocate: boolean,
	gpuProgram: GPUProgram,
	gpuVertexState: GPUVertexState,
	renderOrderZ: number;
	_renderStateKey: number,
	_maskIndex: number,
	allocateGPUResources: (device: GPUDevice) => void,
}

/**
 * Renderable is the base type for a node that can be rendered via Renderer
 * 
 * Renderer will call:
 * - `allocateGPUResources(device)` just before rendering the first time or if `gpuResourcesNeedAllocate` is true.
 * - `draw(context)` when executing `gpuProgram` with `gpuVertexState`
 * 
 * Renderer will not call `releaseGPUResources()`, this is up to the Renderable instance or owner to call
 * 
 * `allocateGPUResources(device)` must set the `gpu` prefixed fields before the instance is valid for rendering
 */
export class Renderable<T extends Node<any>> extends Node<T> {

	/**
	 * Set to false to disable any interaction with the rendering system (including masking).
	 * If this is true, the instance must have gpu* fields set before the rendering.
	 */
	render = true;
	/**
	 * When opacity is less than 1, the object is rendered in the transparent pass with premultiplied alpha blending (unless overridden).
	 * When opacity is 0 or less, it's not rendered to the color buffer (but will still be rendered to the stencil buffer).
	 */
	opacity: number = 1;
	/**
	 * Set to false to disable writing to the color buffer, however the object will still be drawn to the stencil buffer if it's used as a mask
	 */
	visible: boolean = true;
	/**
	 * When true, object is rendered in the transparency pass, this has a performance cost because z ordering has to take precedence over state-change-minimization ordering.
	 * When undefined the renderer assumes true if opacity < 1.
	 */
	transparent?: boolean;
	/**
	 * Blending preset to use when drawing (defaults to NONE or PREMULTIPLIED_ALPHA when opacity < 1)
	 */
	blendMode?: BlendMode;
	/**
	 * Use another renderable as a clipping mask for this renderable. This is done by rendering the mask renderable to the stencil buffer and then stencil testing against it
	 */
	mask: Renderable<any> = null;
	
	// for future use
	// dependentRenderPasses = new Array<RenderPass>();

	protected gpuProgram: GPUProgram = null;
	protected gpuVertexState: GPUVertexState = null;
	protected gpuResourcesNeedAllocate = true;

	/**
	 * influences render order if transparent and sets precedence between otherwise equal render state
	 */
	protected renderOrderZ: number;

	// non-owned fields
	private _renderStateKey: number = 0 | 0;
	private _maskIndex: number = -1;

	constructor() {
		super();
	}

	allocateGPUResources(device: GPUDevice) {}
	releaseGPUResources() {}
	draw(context: DrawContext) {}

}

export default Renderable;