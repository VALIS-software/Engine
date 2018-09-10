/**
 * Dev Notes
 * - State grouping: Often we want hierarchical state - i.e, set viewport for this node _and_ all of its children
 */

import GPUDevice, { GPUDeviceInternal, GPUProgram, GPUProgramInternal, GPUTexture, GPUTextureInternal, GPUVertexState, VertexAttribute, VertexStateDescriptor, AttributeLayout, shaderTypeLength, shaderTypeRows, GPUVertexStateInternal } from './GPUDevice';
import RenderPass from './RenderPass';
import { Renderable, RenderableInternal } from './Renderable';

export enum BlendMode {
	NONE                = 0,

	/**
	 * Premultiplied alpha provides improved alpha blending with the condition that the alpha is multiplied into the rgb channels
	 *	`gl_FragColor = vec4(color.rgb * color.a, color.a)`
	 *
	 * This blend mode also provides additive blending when the alpha channel is set to 0
	 * 	`gl_FragColor = vec4(color.rgb, 0);`
	 */
	PREMULTIPLIED_ALPHA = 1,
}

export enum DrawMode {
	POINTS         = WebGLRenderingContext.POINTS,
	LINE_STRIP     = WebGLRenderingContext.LINE_STRIP,
	LINE_LOOP      = WebGLRenderingContext.LINE_LOOP,
	LINES          = WebGLRenderingContext.LINES,
	TRIANGLE_STRIP = WebGLRenderingContext.TRIANGLE_STRIP,
	TRIANGLE_FAN   = WebGLRenderingContext.TRIANGLE_FAN,
	TRIANGLES      = WebGLRenderingContext.TRIANGLES,
}

export class Renderer {

	protected device: GPUDevice;
	protected deviceInternal: GPUDeviceInternal;
	protected gl: WebGLRenderingContext;
	protected extVao: null | OES_vertex_array_object;
	protected drawContext: DrawContext;

	// if number of unique masks used exceeds MAX_SAFE_MASKS then there may be mask-collisions when nodes overlap
	readonly MAX_SAFE_MASKS = 254;

	constructor(device: GPUDevice) {
		this.device = device;
		this.deviceInternal = device as any as GPUDeviceInternal;
		this.gl = this.deviceInternal.gl;
		this.extVao = this.deviceInternal.extVao;
		this.drawContext = DrawContext.create(device, this.deviceInternal.extInstanced);
	}

	private _masks = new Array<Renderable<any>>();
	private _opaque = new Array<Renderable<any>>();
	private _transparent = new Array<Renderable<any>>();
	render(pass: RenderPass) {
		const gl = this.gl;
		const drawContextInternal = this.drawContext as any as DrawContextInternal;

		pass.root.applyTransformToSubNodes(true);

		// render-state = transparent, programId, vertexStateId, blendMode, user
		// when transparent, z sort should override everything, but same-z should still sort by state
		// when opaque, z sort should come after user sort and depth within tree 
		//		programId, vertexStateId, blendMode, user-state, z, tree-depth

		// to avoid re-allocating a new array each frame, we reuse display list arrays from the previous frame and trim any excess
		let opaqueIndex = 0;
		let opaque = this._opaque;

		let transparentIndex = 0;
		let transparent = this._transparent;

		let maskIndex = 0;
		let masks = this._masks;

		// iterate nodes, build state-change minimizing list for rendering
		// for (let node of pass.root)
		pass.root.forEachSubNode((node) => {
			if (node instanceof Renderable && node.render === true) {
				let nodeInternal = node as any as RenderableInternal;

				// @! for future
				// render any dependent render passes
				// for (let subpass of node.dependentRenderPasses) {
					// this.render(subpass);
				// }

				if (node.mask != null) {
					// we can't used indexOf because masks may contain data from previous frame that extends beyond existingMaskIndex
					let existingMaskIndex = -1;
					for (let i = 0; i < maskIndex; i++) {
						if (masks[i] === node.mask) {
							existingMaskIndex = i;
							break;
						}
					}

					if (existingMaskIndex === -1) {
						nodeInternal._maskIndex = maskIndex;
						masks[maskIndex++] = node.mask;
					} else {
						nodeInternal._maskIndex = existingMaskIndex;
					}
				} else {
					nodeInternal._maskIndex = -1;
				}

				// perform any necessary allocations
				if (nodeInternal.gpuResourcesNeedAllocate) {
					nodeInternal.allocateGPUResources(this.device);
					if (nodeInternal.gpuProgram == null) {
						throw `Renderable field "gpuProgram" must be set before rendering (or set node's render field to false)`;
					}
					if (nodeInternal.gpuVertexState == null) {
						throw `Renderable field "gpuVertexState" must be set before rendering (or set node's render field to false)`;
					}
					nodeInternal.gpuResourcesNeedAllocate = false;
				}

				// if node.transparent is not defined then use opacity to determine if transparency pass is required
				let useTransparentPass = node.transparent;
				if (useTransparentPass === undefined) {
					useTransparentPass = node.opacity < 1 ? true : false;
				}

				// when blend mode is not specified, assume it's alpha-blending when it's in the transparency pass
				let blendMode = node.blendMode;
				if (blendMode === undefined) {
					blendMode = useTransparentPass ? BlendMode.PREMULTIPLIED_ALPHA : BlendMode.NONE;
				}

				// store most important state in 32-bit key
				nodeInternal._renderStateKey = this.encodeRenderState(
					nodeInternal.gpuProgram.id,
					nodeInternal.gpuVertexState.id,
					blendMode
				);

				// add node into pass bucket
				// transparent nodes are rendered from furthest to nearest
				if (useTransparentPass) {
					transparent[transparentIndex++] = node;
				} else {
					opaque[opaqueIndex++] = node;
				}
			}
		});

		// trim any excess elements from the last frame
		if (opaqueIndex < opaque.length) {
			opaque.length = opaqueIndex;
		}
		if (transparentIndex < transparent.length) {
			transparent.length = transparentIndex;
		}
		if (maskIndex < masks.length) {
			masks.length = maskIndex;
		}

		// sort opaque objects for rendering
		// @! this could be optimized by bucketing
		opaque.sort((a, b) => {
			let ai = a as any as RenderableInternal;
			let bi = b as any as RenderableInternal;
			let delta = ai._renderStateKey - bi._renderStateKey;
			if (delta === 0) {
				// front to back z-ordering
				return ai.renderOrderZ - bi.renderOrderZ;
			} else {
				return delta;
			}
		});

		transparent.sort((a, b) => {
			let ai = a as any as RenderableInternal;
			let bi = b as any as RenderableInternal;
			// back to front z-ordering
			let delta = bi.renderOrderZ - ai.renderOrderZ;
			if (delta === 0) {
				// when elements have the same z-index, use render-state to sort
				return ai._renderStateKey - bi._renderStateKey;
			} else {
				return delta;
			}
		});

		// begin rendering
		this.resetGLStateAssumptions();

		if (this.currentFramebuffer !== pass.target) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, pass.target);
			this.currentFramebuffer = pass.target;
		}

		// by default, when starting a rendering pass the viewport is set to the render target dimensions
		if (pass.target == null) {
			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
			drawContextInternal.viewport.x = 0;
			drawContextInternal.viewport.y = 0;
			drawContextInternal.viewport.w = gl.drawingBufferWidth;
			drawContextInternal.viewport.h = gl.drawingBufferHeight;
		} else {
			// @! todo
			throw 'Todo, custom framebuffers: use framebuffers size for viewport';
		}

		let clearFlags = 0;
		if (pass.clearOptions.clearColor != null) {
			clearFlags |= gl.COLOR_BUFFER_BIT;
			gl.clearColor(pass.clearOptions.clearColor[0], pass.clearOptions.clearColor[1], pass.clearOptions.clearColor[2], pass.clearOptions.clearColor[3]);
		}

		if (pass.clearOptions.clearDepth != null) {
			clearFlags |= gl.DEPTH_BUFFER_BIT;
			gl.clearDepth(pass.clearOptions.clearDepth);
		}

		if (pass.clearOptions.clearStencil != null) {
			clearFlags |= gl.STENCIL_BUFFER_BIT;
			gl.clearStencil(pass.clearOptions.clearStencil);
		}

		gl.clear(clearFlags);

		// draw mask nodes to stencil buffer
		if (masks.length > 0) {
			// enable stencil operations (required to write to the stencil buffer)
			gl.enable(gl.STENCIL_TEST);
			this.currentStencilTestEnabled = 1;
			// disable writing to the color buffer
			gl.colorMask(false, false, false, false);
			// enable writing to the depth buffer
			gl.depthMask(true);
			// @! do we actually benefit from disabling blending if we're false across the colorMask?
			gl.disable(gl.BLEND);
			this.currentBlendMode = BlendMode.NONE;
			// (depth-testing is assumed to be enabled)

			// enable stencil writing
			gl.stencilFunc(gl.ALWAYS, 0xFF, 0xFF);
			this.currentMaskTestValue = -1;
			gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);

			// draw mask nodes, each with a stencil write-mask
			for (let i = 0; i < masks.length; i++) {
				let renderable = masks[i];
				let internal = renderable as any as RenderableInternal;

				this.setProgram(internal);
				this.setVertexState(internal);

				// write (i + 1) into the stencil buffer
				let writeMaskValue = i + 1;
				gl.stencilMask(writeMaskValue);

				renderable.draw(this.drawContext);
			}

			// clear depth for main pass
			if (pass.clearOptions.clearDepth != null) {
				clearFlags |= gl.DEPTH_BUFFER_BIT;
				gl.clearDepth(pass.clearOptions.clearDepth);
			}
		}

		// draw opaque objects
		gl.colorMask(true, true, true, true);
		gl.depthMask(true);
		// disable writing to the stencil buffer
		gl.stencilMask(0x00);

		if (masks.length === 0) {
			gl.disable(gl.STENCIL_TEST);
			this.currentStencilTestEnabled = 0;
		} else {
			gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
		}

		this.renderArray(opaque);

		// draw transparent objects
		// transparent objects perform depth-test but don't write to the depth buffer
		gl.depthMask(false);
		this.renderArray(transparent);
	}

	protected renderArray(renderables: Array<Renderable<any>>) {
		for (let i = 0; i < renderables.length; i++) {
			let renderable = renderables[i];
			if (renderable.opacity <= 0 || (renderable.visible === false)) continue;

			let internal = renderable as any as RenderableInternal;

			// extract blend mode from render state (because it may not explicitly specified on the object)
			let blendMode = this.decodeRenderStateBlendMode(internal._renderStateKey);

			// set state for renderable
			this.setProgram(internal);
			this.setVertexState(internal);
			this.setBlendMode(blendMode);
			// mask state
			this.setMaskTest(internal._maskIndex !== -1, (internal._maskIndex + 1) % (0xFF + 1));

			renderable.draw(this.drawContext);
		}
	}

	// gl state assumptions
	protected currentFramebuffer: number = -1;
	protected currentProgramId: number = -1;
	protected currentVertexStateId: number = -1;
	protected currentBlendMode = -1;
	protected currentStencilTestEnabled = -1;
	protected currentMaskTestValue = -1;
	protected currentVaoFallbackAttributeLayout: AttributeLayout = undefined;

	protected resetGLStateAssumptions() {
		this.currentFramebuffer = undefined;
		this.currentProgramId = -1;
		this.currentVertexStateId = -1;
		this.currentBlendMode = -1;
		this.currentStencilTestEnabled = -1;
		this.currentMaskTestValue = -1;
		// this.currentVaoFallbackAttributeLayout = undefined;
	}

	protected setProgram(internal: RenderableInternal) {
		const gl = this.gl;
		const drawContextInternal = this.drawContext as any as DrawContextInternal;

		if (internal.gpuProgram.id !== this.currentProgramId) {
			gl.useProgram(internal.gpuProgram.native);
			drawContextInternal.program = internal.gpuProgram;
			this.currentProgramId = internal.gpuProgram.id;
		}
	}

	protected setVertexState(internal: RenderableInternal) {
		const gl = this.gl;
		const drawContextInternal = this.drawContext as any as DrawContextInternal;

		if (internal.gpuVertexState.id !== this.currentVertexStateId) {
			
			if (internal.gpuVertexState.native !== null) {
				this.extVao.bindVertexArrayOES(internal.gpuVertexState.native);
			} else {
				// handle setting vertex state when VAO extension is not available 

				// WebGL requires that all enabled attribute vertex arrays must have valid buffers, whether consumed by shader or not
				// to work around this we disable all vertex arrays enabled by the last layout
				// applying the new layout then re-enables just the vertex arrays required
				if (this.currentVaoFallbackAttributeLayout !== undefined) {
					let attributeRow = 0;
					for (let i = 0; i < this.currentVaoFallbackAttributeLayout.length; i++) {
						let type = this.currentVaoFallbackAttributeLayout[i].type;
						// determine how many rows this attribute will cover
						// e.g. float -> 1, vec4 -> 1, mat2 -> 2, mat4 -> 4
						let attributeRowSpan = shaderTypeRows[type];
						if (attributeRowSpan === 1) {
							// fast path
							gl.disableVertexAttribArray(attributeRow);
						} else {
							for (let r = 0; r < attributeRowSpan; r++) {
								gl.disableVertexAttribArray(attributeRow + r);
							}
						}
						attributeRow += attributeRowSpan;
					}
				}

				// @! todo: this is incomplete – it doesn't account for changes to global state caused be previous calls
				// example: a number of vertex attributes may be set to array mode (enableVertexAttribArray), but never disabled
				this.deviceInternal.applyVertexStateDescriptor((internal.gpuVertexState as any as GPUVertexStateInternal)._vaoFallbackDescriptor);

				this.currentVaoFallbackAttributeLayout = internal.gpuVertexState.attributeLayout;
			}

			drawContextInternal.vertexState = internal.gpuVertexState;
			this.currentVertexStateId = internal.gpuVertexState.id;
		}
	}

	protected setBlendMode(blendMode: BlendMode) {
		const gl = this.gl;

		if (blendMode !== this.currentBlendMode) {

			if (blendMode === 0) {
				gl.disable(gl.BLEND);
			} else {
				if (this.currentBlendMode <= 0) {
					gl.enable(gl.BLEND);
				}

				switch (blendMode) {
					case BlendMode.PREMULTIPLIED_ALPHA:
						gl.blendEquation(gl.FUNC_ADD);
						gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
						break;
					default:
						throw `Blend mode "${BlendMode[blendMode]}" not yet implemented`;
				}
			}

			this.currentBlendMode = blendMode;
		}
	}

	protected setMaskTest(enabled: boolean, maskValue: number) {
		const gl = this.gl;
		
		if (enabled) {
			if (this.currentStencilTestEnabled !== 1) {
				gl.enable(gl.STENCIL_TEST);
				this.currentStencilTestEnabled = 1;
			}

			if (this.currentMaskTestValue !== maskValue) {
				gl.stencilFunc(gl.EQUAL, maskValue, 0xFF);
				this.currentMaskTestValue = maskValue;
			}
		} else {
			if (this.currentStencilTestEnabled !== 0) {
				gl.disable(gl.STENCIL_TEST);
				this.currentStencilTestEnabled = 0;
			}
		}
	}

	// In JavaScript we're limited to 32-bit for bitwise operations
	// 00000000 00000000 00000000 00000000
	// ssssssss bbbbbbbb bbbbbbbb bbbbmmmm
	protected readonly stateSOffset = 24;
	protected readonly stateSMask = 0xFF000000;
	protected readonly stateBOffset = 4;
	protected readonly stateBMask = 0x00FFFFF0;
	protected readonly stateMOffset = 0;
	protected readonly stateMMask = 0x0000000F;

	readonly MAX_SHADERS = this.stateSMask >>> this.stateSOffset;
	readonly MAX_BUFFERS = this.stateBMask >>> this.stateBOffset;
	readonly MAX_BLEND_MODES = this.stateMMask >>> this.stateMOffset;

	protected encodeRenderState(programId: number, vertexStateId: number, blendMode: number): number {
		return (programId << this.stateSOffset) |
			(vertexStateId << this.stateBOffset) |
			(blendMode << this.stateMOffset);
	}

	protected decodeRenderState(bits: number) {
		return {
			programId: (bits & this.stateSMask) >>> this.stateSOffset,
			vertexStateId: (bits & this.stateBMask) >>> this.stateBOffset,
			blendMode: (bits & this.stateMMask) >>> this.stateMOffset
		}
	}

	protected decodeRenderStateBlendMode(bits: number) {
		return (bits & this.stateMMask) >>> this.stateMOffset;
	}

}

export type DrawContextInternal = {
	gl: WebGLRenderingContext;
	program: GPUProgram;
	vertexState: GPUVertexState;
	viewport: {
		x: number, y: number,
		w: number, h: number
	};
}

export class DrawContext {

	readonly gl: WebGLRenderingContext;

	// current state
	readonly viewport: {
		x: number, y: number,
		w: number, h: number
	} = {x: 0, y: 0, w: 0, h: 0};
	readonly program: GPUProgram;
	readonly vertexState: GPUVertexState;

	protected constructor(protected readonly device: GPUDevice, protected readonly extInstanced: ANGLE_instanced_arrays) {
		const gl = (device as any as GPUDeviceInternal).gl;
		this.gl = gl;
	}

	uniform1f(name: string, x: GLfloat) {
		const stateCache = (this.program as any as GPUProgramInternal).stateCache;
		if (stateCache[name] !== x) {
			this.gl.uniform1f(this.program.uniformLocation[name], x);
			stateCache[name] = x;
		}
	}
	uniform1fv(name: string, v: Float32Array) {
		this.gl.uniform1fv(this.program.uniformLocation[name], v);
	}
	uniform1i(name: string, x: GLint) {
		const stateCache = (this.program as any as GPUProgramInternal).stateCache;
		if (stateCache[name] !== x) {
			this.gl.uniform1i(this.program.uniformLocation[name], x);
			stateCache[name] = x;
		}
	}
	uniform1iv(name: string, v: Int32Array) {
		this.gl.uniform1iv(this.program.uniformLocation[name], v);
	}
	uniform2f(name: string, x: GLfloat, y: GLfloat) {
		const stateCache = (this.program as any as GPUProgramInternal).stateCache;
		let cacheValue = stateCache[name];

		if (cacheValue === undefined) { // allocate cache entry
			cacheValue = stateCache[name] = new Array(2);
		}
		
		if (
			(cacheValue[0] !== x) ||
			(cacheValue[1] !== y)
		) {
			this.gl.uniform2f(this.program.uniformLocation[name], x, y);
			cacheValue[0] = x;
			cacheValue[1] = y;
		}
	}
	uniform2fv(name: string, v: Float32Array) {
		this.gl.uniform2fv(this.program.uniformLocation[name], v);
	}
	uniform2i(name: string, x: GLint, y: GLint) {
		const stateCache = (this.program as any as GPUProgramInternal).stateCache;
		let cacheValue = stateCache[name];

		if (cacheValue === undefined) { // allocate cache entry
			cacheValue = stateCache[name] = new Array(2);
		}

		if (
			(cacheValue[0] !== x) ||
			(cacheValue[1] !== y)
		) {
			this.gl.uniform2i(this.program.uniformLocation[name], x, y);
			cacheValue[0] = x;
			cacheValue[1] = y;
		}
	}
	uniform2iv(name: string, v: Int32Array) {
		this.gl.uniform2iv(this.program.uniformLocation[name], v);
	}
	uniform3f(name: string, x: GLfloat, y: GLfloat, z: GLfloat) {
		const stateCache = (this.program as any as GPUProgramInternal).stateCache;
		let cacheValue = stateCache[name];

		if (cacheValue === undefined) { // allocate cache entry
			cacheValue = stateCache[name] = new Array(3);
		}

		if (
			(cacheValue[0] !== x) ||
			(cacheValue[1] !== y) ||
			(cacheValue[2] !== z)
		) {
			this.gl.uniform3f(this.program.uniformLocation[name], x, y, z);
			cacheValue[0] = x;
			cacheValue[1] = y;
			cacheValue[2] = z;
		}
	}
	uniform3fv(name: string, v: Float32Array) {
		this.gl.uniform3fv(this.program.uniformLocation[name], v);
	}
	uniform3i(name: string, x: GLint, y: GLint, z: GLint) {
		const stateCache = (this.program as any as GPUProgramInternal).stateCache;
		let cacheValue = stateCache[name];

		if (cacheValue === undefined) { // allocate cache entry
			cacheValue = stateCache[name] = new Array(3);
		}

		if (
			(cacheValue[0] !== x) ||
			(cacheValue[1] !== y) ||
			(cacheValue[2] !== z)
		) {
			this.gl.uniform3i(this.program.uniformLocation[name], x, y, z);
			cacheValue[0] = x;
			cacheValue[1] = y;
			cacheValue[2] = z;
		}
	}
	uniform3iv(name: string, v: Int32Array) {
		this.gl.uniform3iv(this.program.uniformLocation[name], v);
	}
	uniform4f(name: string, x: GLfloat, y: GLfloat, z: GLfloat, w: GLfloat) {
		const stateCache = (this.program as any as GPUProgramInternal).stateCache;
		let cacheValue = stateCache[name];

		if (cacheValue === undefined) { // allocate cache entry
			cacheValue = stateCache[name] = new Array(4);
		}

		if (
			(cacheValue[0] !== x) ||
			(cacheValue[1] !== y) ||
			(cacheValue[2] !== z) ||
			(cacheValue[3] !== w)
		) {
			this.gl.uniform4f(this.program.uniformLocation[name], x, y, z, w);
			cacheValue[0] = x;
			cacheValue[1] = y;
			cacheValue[2] = z;
			cacheValue[3] = w;
		}
	}
	uniform4fv(name: string, v: Float32Array) {
		this.gl.uniform4fv(this.program.uniformLocation[name], v);
	}
	uniform4i(name: string, x: GLint, y: GLint, z: GLint, w: GLint) {
		const stateCache = (this.program as any as GPUProgramInternal).stateCache;
		let cacheValue = stateCache[name];

		if (cacheValue === undefined) { // allocate cache entry
			cacheValue = stateCache[name] = new Array(4);
		}

		if (
			(cacheValue[0] !== x) ||
			(cacheValue[1] !== y) ||
			(cacheValue[2] !== z) ||
			(cacheValue[3] !== w)
		) {
			this.gl.uniform4i(this.program.uniformLocation[name], x, y, z, w);
			cacheValue[0] = x;
			cacheValue[1] = y;
			cacheValue[2] = z;
			cacheValue[3] = w;
		}
	}
	uniform4iv(name: string, v: Int32Array) {
		this.gl.uniform4iv(this.program.uniformLocation[name], v);
	}
	uniformMatrix2fv(name: string, transpose: boolean, value: Float32Array) {
		this.gl.uniformMatrix2fv(this.program.uniformLocation[name], transpose, value);
	}
	uniformMatrix3fv(name: string, transpose: boolean, value: Float32Array) {
		this.gl.uniformMatrix3fv(this.program.uniformLocation[name], transpose, value);
	}
	uniformMatrix4fv(name: string, transpose: boolean, value: Float32Array) {
		this.gl.uniformMatrix4fv(this.program.uniformLocation[name], transpose, value);
	}

	uniformTexture2D(name: string, texture: GPUTexture) {
		const deviceInternal = this.device as any as GPUDeviceInternal;
		const textureInternal = texture as any as GPUTextureInternal;

		// texture already has an assigned unit
		if (textureInternal.boundUnit !== -1) {
			this.uniform1i(name, textureInternal.boundUnit);
			// since we're not binding the texture we've got to manually mark the usage
			// (this helps the texture-unit system decide which units are least used)
			deviceInternal.markTextureUsage(texture);			
		} else {
			deviceInternal.bindTexture(texture);
			this.uniform1i(name, textureInternal.boundUnit);
		}
	}

	/**
	 * Draw, automatically accounting for vertex indexing
	 */
	draw(mode: DrawMode, indexCount: number, indexOffset: number) {
		const gl = this.gl;
		if (this.vertexState.indexType != null) {
			gl.drawElements(mode, indexCount, this.vertexState.indexType, indexOffset);
		} else {
			gl.drawArrays(mode, indexOffset, indexCount);
		}
	}

	/**
	 * Draw instances, automatically accounting for vertex indexing
	 */
	extDrawInstanced(mode: DrawMode, indexCount: number, indexOffset: number, primCount: number) {
		if (this.vertexState.indexType != null) {
			this.extInstanced.drawElementsInstancedANGLE(mode, indexCount, this.vertexState.indexType, indexOffset, primCount);
		} else {
			this.extInstanced.drawArraysInstancedANGLE(mode, indexOffset, indexCount, primCount);
		}
	}

	static create(device: GPUDevice, extInstanced: ANGLE_instanced_arrays) {
		return new DrawContext(device, extInstanced);
	}

}

export default Renderer;