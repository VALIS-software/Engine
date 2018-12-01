"use strict";
/**
 * Dev Notes
 * - State grouping: Often we want hierarchical state - i.e, set viewport for this node _and_ all of its children
 */
Object.defineProperty(exports, "__esModule", { value: true });
var GPUDevice_1 = require("./GPUDevice");
var Renderable_1 = require("./Renderable");
var BlendMode;
(function (BlendMode) {
    BlendMode[BlendMode["NONE"] = 0] = "NONE";
    /**
     * Premultiplied alpha provides improved alpha blending with the condition that the alpha is multiplied into the rgb channels
     *	`gl_FragColor = vec4(color.rgb * color.a, color.a)`
     *
     * This blend mode also provides additive blending when the alpha channel is set to 0
     * 	`gl_FragColor = vec4(color.rgb, 0);`
     */
    BlendMode[BlendMode["PREMULTIPLIED_ALPHA"] = 1] = "PREMULTIPLIED_ALPHA";
})(BlendMode = exports.BlendMode || (exports.BlendMode = {}));
var DrawMode;
(function (DrawMode) {
    DrawMode[DrawMode["POINTS"] = WebGLRenderingContext.POINTS] = "POINTS";
    DrawMode[DrawMode["LINE_STRIP"] = WebGLRenderingContext.LINE_STRIP] = "LINE_STRIP";
    DrawMode[DrawMode["LINE_LOOP"] = WebGLRenderingContext.LINE_LOOP] = "LINE_LOOP";
    DrawMode[DrawMode["LINES"] = WebGLRenderingContext.LINES] = "LINES";
    DrawMode[DrawMode["TRIANGLE_STRIP"] = WebGLRenderingContext.TRIANGLE_STRIP] = "TRIANGLE_STRIP";
    DrawMode[DrawMode["TRIANGLE_FAN"] = WebGLRenderingContext.TRIANGLE_FAN] = "TRIANGLE_FAN";
    DrawMode[DrawMode["TRIANGLES"] = WebGLRenderingContext.TRIANGLES] = "TRIANGLES";
})(DrawMode = exports.DrawMode || (exports.DrawMode = {}));
var Renderer = /** @class */ (function () {
    function Renderer(device) {
        // if number of unique masks used exceeds MAX_SAFE_MASKS then there may be mask-collisions when nodes overlap
        this.MAX_SAFE_MASKS = 254;
        this._masks = new Array();
        this._opaque = new Array();
        this._transparent = new Array();
        // gl state assumptions
        this.currentFramebuffer = -1;
        this.currentProgramId = -1;
        this.currentVertexStateId = -1;
        this.currentBlendMode = -1;
        this.currentStencilTestEnabled = -1;
        this.currentMaskTestValue = -1;
        this.currentVaoFallbackAttributeLayout = undefined;
        // In JavaScript we're limited to 32-bit for bitwise operations
        // 00000000 00000000 00000000 00000000
        // ssssssss bbbbbbbb bbbbbbbb bbbbmmmm
        this.stateSOffset = 24;
        this.stateSMask = 0xFF000000;
        this.stateBOffset = 4;
        this.stateBMask = 0x00FFFFF0;
        this.stateMOffset = 0;
        this.stateMMask = 0x0000000F;
        this.MAX_SHADERS = this.stateSMask >>> this.stateSOffset;
        this.MAX_BUFFERS = this.stateBMask >>> this.stateBOffset;
        this.MAX_BLEND_MODES = this.stateMMask >>> this.stateMOffset;
        this.device = device;
        this.deviceInternal = device;
        this.gl = this.deviceInternal.gl;
        this.extVao = this.deviceInternal.extVao;
        this.drawContext = DrawContext.create(device, this.deviceInternal.extInstanced);
    }
    Renderer.prototype.render = function (pass) {
        var _this = this;
        var gl = this.gl;
        var drawContextInternal = this.drawContext;
        pass.root.applyTransformToSubNodes(true);
        // render-state = transparent, programId, vertexStateId, blendMode, user
        // when transparent, z sort should override everything, but same-z should still sort by state
        // when opaque, z sort should come after user sort and depth within tree 
        //		programId, vertexStateId, blendMode, user-state, z, tree-depth
        // to avoid re-allocating a new array each frame, we reuse display list arrays from the previous frame and trim any excess
        var opaqueIndex = 0;
        var opaque = this._opaque;
        var transparentIndex = 0;
        var transparent = this._transparent;
        var maskIndex = 0;
        var masks = this._masks;
        // iterate nodes, build state-change minimizing list for rendering
        // for (let node of pass.root)
        pass.root.forEachSubNode(function (node) {
            if (node instanceof Renderable_1.Renderable && node.render === true) {
                var nodeInternal = node;
                // @! for future
                // render any dependent render passes
                // for (let subpass of node.dependentRenderPasses) {
                // this.render(subpass);
                // }
                if (node.mask != null && node.mask.render === true) {
                    // we can't used indexOf because masks may contain data from previous frame that extends beyond existingMaskIndex
                    var existingMaskIndex = -1;
                    for (var i = 0; i < maskIndex; i++) {
                        if (masks[i] === node.mask) {
                            existingMaskIndex = i;
                            break;
                        }
                    }
                    if (existingMaskIndex === -1) {
                        nodeInternal._maskIndex = maskIndex;
                        masks[maskIndex++] = node.mask;
                    }
                    else {
                        nodeInternal._maskIndex = existingMaskIndex;
                    }
                }
                else {
                    nodeInternal._maskIndex = -1;
                }
                // perform any necessary allocations
                if (nodeInternal.gpuResourcesNeedAllocate) {
                    nodeInternal.allocateGPUResources(_this.device);
                    if (nodeInternal.gpuProgram == null) {
                        throw "Renderable field \"gpuProgram\" must be set before rendering (or set node's render field to false)";
                    }
                    if (nodeInternal.gpuVertexState == null) {
                        throw "Renderable field \"gpuVertexState\" must be set before rendering (or set node's render field to false)";
                    }
                    nodeInternal.gpuResourcesNeedAllocate = false;
                }
                // if node.transparent is not defined then use opacity to determine if transparency pass is required
                var useTransparentPass = node.transparent;
                if (useTransparentPass === undefined) {
                    useTransparentPass = node.opacity < 1 ? true : false;
                }
                // when blend mode is not specified, assume it's alpha-blending when it's in the transparency pass
                var blendMode = node.blendMode;
                if (blendMode === undefined) {
                    blendMode = useTransparentPass ? BlendMode.PREMULTIPLIED_ALPHA : BlendMode.NONE;
                }
                // store most important state in 32-bit key
                nodeInternal._renderStateKey = _this.encodeRenderState(nodeInternal.gpuProgram.id, nodeInternal.gpuVertexState.id, blendMode);
                // add node into pass bucket
                // transparent nodes are rendered from furthest to nearest
                if (useTransparentPass) {
                    transparent[transparentIndex++] = node;
                }
                else {
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
        opaque.sort(function (a, b) {
            var ai = a;
            var bi = b;
            var delta = ai._renderStateKey - bi._renderStateKey;
            if (delta === 0) {
                // front to back z-ordering
                return ai.renderOrderZ - bi.renderOrderZ;
            }
            else {
                return delta;
            }
        });
        transparent.sort(function (a, b) {
            var ai = a;
            var bi = b;
            // back to front z-ordering
            var delta = bi.renderOrderZ - ai.renderOrderZ;
            if (delta === 0) {
                // when elements have the same z-index, use render-state to sort
                return ai._renderStateKey - bi._renderStateKey;
            }
            else {
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
        }
        else {
            // @! todo
            throw 'Todo, custom framebuffers: use framebuffers size for viewport';
        }
        var clearFlags = 0;
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
            for (var i = 0; i < masks.length; i++) {
                var renderable = masks[i];
                var internal = renderable;
                this.setProgram(internal);
                this.setVertexState(internal);
                // write (i + 1) into the stencil buffer
                var writeMaskValue = i + 1;
                gl.stencilMask(writeMaskValue);
                renderable.draw(this.drawContext);
            }
            // clear depth for main pass
            if (pass.clearOptions.clearDepth != null) {
                gl.clearDepth(pass.clearOptions.clearDepth);
                gl.clear(gl.DEPTH_BUFFER_BIT);
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
        }
        else {
            gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
        }
        this.renderArray(opaque);
        // draw transparent objects
        // transparent objects perform depth-test but don't write to the depth buffer
        gl.depthMask(false);
        this.renderArray(transparent);
    };
    Renderer.prototype.renderArray = function (renderables) {
        for (var i = 0; i < renderables.length; i++) {
            var renderable = renderables[i];
            if (renderable.opacity <= 0 || (renderable.visible === false))
                continue;
            var internal = renderable;
            // extract blend mode from render state (because it may not explicitly specified on the object)
            var blendMode = this.decodeRenderStateBlendMode(internal._renderStateKey);
            // set state for renderable
            this.setProgram(internal);
            this.setVertexState(internal);
            this.setBlendMode(blendMode);
            // mask state
            this.setMaskTest(internal._maskIndex !== -1, (internal._maskIndex + 1) % (0xFF + 1));
            renderable.draw(this.drawContext);
        }
    };
    Renderer.prototype.resetGLStateAssumptions = function () {
        this.currentFramebuffer = undefined;
        this.currentProgramId = -1;
        this.currentVertexStateId = -1;
        this.currentBlendMode = -1;
        this.currentStencilTestEnabled = -1;
        this.currentMaskTestValue = -1;
        // this.currentVaoFallbackAttributeLayout = undefined;
    };
    Renderer.prototype.setProgram = function (internal) {
        var gl = this.gl;
        var drawContextInternal = this.drawContext;
        if (internal.gpuProgram.id !== this.currentProgramId) {
            gl.useProgram(internal.gpuProgram.native);
            drawContextInternal.program = internal.gpuProgram;
            this.currentProgramId = internal.gpuProgram.id;
        }
    };
    Renderer.prototype.setVertexState = function (internal) {
        var gl = this.gl;
        var drawContextInternal = this.drawContext;
        if (internal.gpuVertexState.id !== this.currentVertexStateId) {
            if (internal.gpuVertexState.native !== null) {
                this.extVao.bindVertexArrayOES(internal.gpuVertexState.native);
            }
            else {
                // handle setting vertex state when VAO extension is not available 
                // WebGL requires that all enabled attribute vertex arrays must have valid buffers, whether consumed by shader or not
                // to work around this we disable all vertex arrays enabled by the last layout
                // applying the new layout then re-enables just the vertex arrays required
                if (this.currentVaoFallbackAttributeLayout !== undefined) {
                    var attributeRow = 0;
                    for (var i = 0; i < this.currentVaoFallbackAttributeLayout.length; i++) {
                        var type = this.currentVaoFallbackAttributeLayout[i].type;
                        // determine how many rows this attribute will cover
                        // e.g. float -> 1, vec4 -> 1, mat2 -> 2, mat4 -> 4
                        var attributeRowSpan = GPUDevice_1.shaderTypeRows[type];
                        if (attributeRowSpan === 1) {
                            // fast path
                            gl.disableVertexAttribArray(attributeRow);
                        }
                        else {
                            for (var r = 0; r < attributeRowSpan; r++) {
                                gl.disableVertexAttribArray(attributeRow + r);
                            }
                        }
                        attributeRow += attributeRowSpan;
                    }
                }
                // @! todo: this is incomplete – it doesn't account for changes to global state caused be previous calls
                // example: a number of vertex attributes may be set to array mode (enableVertexAttribArray), but never disabled
                this.deviceInternal.applyVertexStateDescriptor(internal.gpuVertexState._vaoFallbackDescriptor);
                this.currentVaoFallbackAttributeLayout = internal.gpuVertexState.attributeLayout;
            }
            drawContextInternal.vertexState = internal.gpuVertexState;
            this.currentVertexStateId = internal.gpuVertexState.id;
        }
    };
    Renderer.prototype.setBlendMode = function (blendMode) {
        var gl = this.gl;
        if (blendMode !== this.currentBlendMode) {
            if (blendMode === 0) {
                gl.disable(gl.BLEND);
            }
            else {
                if (this.currentBlendMode <= 0) {
                    gl.enable(gl.BLEND);
                }
                switch (blendMode) {
                    case BlendMode.PREMULTIPLIED_ALPHA:
                        gl.blendEquation(gl.FUNC_ADD);
                        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
                        break;
                    default:
                        throw "Blend mode \"" + BlendMode[blendMode] + "\" not yet implemented";
                }
            }
            this.currentBlendMode = blendMode;
        }
    };
    Renderer.prototype.setMaskTest = function (enabled, maskValue) {
        var gl = this.gl;
        if (enabled) {
            if (this.currentStencilTestEnabled !== 1) {
                gl.enable(gl.STENCIL_TEST);
                this.currentStencilTestEnabled = 1;
            }
            if (this.currentMaskTestValue !== maskValue) {
                gl.stencilFunc(gl.EQUAL, maskValue, 0xFF);
                this.currentMaskTestValue = maskValue;
            }
        }
        else {
            if (this.currentStencilTestEnabled !== 0) {
                gl.disable(gl.STENCIL_TEST);
                this.currentStencilTestEnabled = 0;
            }
        }
    };
    Renderer.prototype.encodeRenderState = function (programId, vertexStateId, blendMode) {
        return (programId << this.stateSOffset) |
            (vertexStateId << this.stateBOffset) |
            (blendMode << this.stateMOffset);
    };
    Renderer.prototype.decodeRenderState = function (bits) {
        return {
            programId: (bits & this.stateSMask) >>> this.stateSOffset,
            vertexStateId: (bits & this.stateBMask) >>> this.stateBOffset,
            blendMode: (bits & this.stateMMask) >>> this.stateMOffset
        };
    };
    Renderer.prototype.decodeRenderStateBlendMode = function (bits) {
        return (bits & this.stateMMask) >>> this.stateMOffset;
    };
    return Renderer;
}());
exports.Renderer = Renderer;
var DrawContext = /** @class */ (function () {
    function DrawContext(device, extInstanced) {
        this.device = device;
        this.extInstanced = extInstanced;
        // current state
        this.viewport = { x: 0, y: 0, w: 0, h: 0 };
        var gl = device.gl;
        this.gl = gl;
    }
    DrawContext.prototype.uniform1f = function (name, x) {
        var stateCache = this.program.stateCache;
        if (stateCache[name] !== x) {
            this.gl.uniform1f(this.program.uniformLocation[name], x);
            stateCache[name] = x;
        }
    };
    DrawContext.prototype.uniform1fv = function (name, v) {
        this.gl.uniform1fv(this.program.uniformLocation[name], v);
    };
    DrawContext.prototype.uniform1i = function (name, x) {
        var stateCache = this.program.stateCache;
        if (stateCache[name] !== x) {
            this.gl.uniform1i(this.program.uniformLocation[name], x);
            stateCache[name] = x;
        }
    };
    DrawContext.prototype.uniform1iv = function (name, v) {
        this.gl.uniform1iv(this.program.uniformLocation[name], v);
    };
    DrawContext.prototype.uniform2f = function (name, x, y) {
        var stateCache = this.program.stateCache;
        var cacheValue = stateCache[name];
        if (cacheValue === undefined) { // allocate cache entry
            cacheValue = stateCache[name] = new Array(2);
        }
        if ((cacheValue[0] !== x) ||
            (cacheValue[1] !== y)) {
            this.gl.uniform2f(this.program.uniformLocation[name], x, y);
            cacheValue[0] = x;
            cacheValue[1] = y;
        }
    };
    DrawContext.prototype.uniform2fv = function (name, v) {
        this.gl.uniform2fv(this.program.uniformLocation[name], v);
    };
    DrawContext.prototype.uniform2i = function (name, x, y) {
        var stateCache = this.program.stateCache;
        var cacheValue = stateCache[name];
        if (cacheValue === undefined) { // allocate cache entry
            cacheValue = stateCache[name] = new Array(2);
        }
        if ((cacheValue[0] !== x) ||
            (cacheValue[1] !== y)) {
            this.gl.uniform2i(this.program.uniformLocation[name], x, y);
            cacheValue[0] = x;
            cacheValue[1] = y;
        }
    };
    DrawContext.prototype.uniform2iv = function (name, v) {
        this.gl.uniform2iv(this.program.uniformLocation[name], v);
    };
    DrawContext.prototype.uniform3f = function (name, x, y, z) {
        var stateCache = this.program.stateCache;
        var cacheValue = stateCache[name];
        if (cacheValue === undefined) { // allocate cache entry
            cacheValue = stateCache[name] = new Array(3);
        }
        if ((cacheValue[0] !== x) ||
            (cacheValue[1] !== y) ||
            (cacheValue[2] !== z)) {
            this.gl.uniform3f(this.program.uniformLocation[name], x, y, z);
            cacheValue[0] = x;
            cacheValue[1] = y;
            cacheValue[2] = z;
        }
    };
    DrawContext.prototype.uniform3fv = function (name, v) {
        this.gl.uniform3fv(this.program.uniformLocation[name], v);
    };
    DrawContext.prototype.uniform3i = function (name, x, y, z) {
        var stateCache = this.program.stateCache;
        var cacheValue = stateCache[name];
        if (cacheValue === undefined) { // allocate cache entry
            cacheValue = stateCache[name] = new Array(3);
        }
        if ((cacheValue[0] !== x) ||
            (cacheValue[1] !== y) ||
            (cacheValue[2] !== z)) {
            this.gl.uniform3i(this.program.uniformLocation[name], x, y, z);
            cacheValue[0] = x;
            cacheValue[1] = y;
            cacheValue[2] = z;
        }
    };
    DrawContext.prototype.uniform3iv = function (name, v) {
        this.gl.uniform3iv(this.program.uniformLocation[name], v);
    };
    DrawContext.prototype.uniform4f = function (name, x, y, z, w) {
        var stateCache = this.program.stateCache;
        var cacheValue = stateCache[name];
        if (cacheValue === undefined) { // allocate cache entry
            cacheValue = stateCache[name] = new Array(4);
        }
        if ((cacheValue[0] !== x) ||
            (cacheValue[1] !== y) ||
            (cacheValue[2] !== z) ||
            (cacheValue[3] !== w)) {
            this.gl.uniform4f(this.program.uniformLocation[name], x, y, z, w);
            cacheValue[0] = x;
            cacheValue[1] = y;
            cacheValue[2] = z;
            cacheValue[3] = w;
        }
    };
    DrawContext.prototype.uniform4fv = function (name, v) {
        this.gl.uniform4fv(this.program.uniformLocation[name], v);
    };
    DrawContext.prototype.uniform4i = function (name, x, y, z, w) {
        var stateCache = this.program.stateCache;
        var cacheValue = stateCache[name];
        if (cacheValue === undefined) { // allocate cache entry
            cacheValue = stateCache[name] = new Array(4);
        }
        if ((cacheValue[0] !== x) ||
            (cacheValue[1] !== y) ||
            (cacheValue[2] !== z) ||
            (cacheValue[3] !== w)) {
            this.gl.uniform4i(this.program.uniformLocation[name], x, y, z, w);
            cacheValue[0] = x;
            cacheValue[1] = y;
            cacheValue[2] = z;
            cacheValue[3] = w;
        }
    };
    DrawContext.prototype.uniform4iv = function (name, v) {
        this.gl.uniform4iv(this.program.uniformLocation[name], v);
    };
    DrawContext.prototype.uniformMatrix2fv = function (name, transpose, value) {
        this.gl.uniformMatrix2fv(this.program.uniformLocation[name], transpose, value);
    };
    DrawContext.prototype.uniformMatrix3fv = function (name, transpose, value) {
        this.gl.uniformMatrix3fv(this.program.uniformLocation[name], transpose, value);
    };
    DrawContext.prototype.uniformMatrix4fv = function (name, transpose, value) {
        this.gl.uniformMatrix4fv(this.program.uniformLocation[name], transpose, value);
    };
    DrawContext.prototype.uniformTexture2D = function (name, texture) {
        var deviceInternal = this.device;
        var textureInternal = texture;
        // texture already has an assigned unit
        if (textureInternal.boundUnit !== -1) {
            this.uniform1i(name, textureInternal.boundUnit);
            // since we're not binding the texture we've got to manually mark the usage
            // (this helps the texture-unit system decide which units are least used)
            deviceInternal.markTextureUsage(texture);
        }
        else {
            deviceInternal.bindTexture(texture);
            this.uniform1i(name, textureInternal.boundUnit);
        }
    };
    /**
     * Draw, automatically accounting for vertex indexing
     */
    DrawContext.prototype.draw = function (mode, indexCount, indexOffset) {
        var gl = this.gl;
        if (this.vertexState.indexType != null) {
            gl.drawElements(mode, indexCount, this.vertexState.indexType, indexOffset);
        }
        else {
            gl.drawArrays(mode, indexOffset, indexCount);
        }
    };
    /**
     * Draw instances, automatically accounting for vertex indexing
     */
    DrawContext.prototype.extDrawInstanced = function (mode, indexCount, indexOffset, primCount) {
        if (this.vertexState.indexType != null) {
            this.extInstanced.drawElementsInstancedANGLE(mode, indexCount, this.vertexState.indexType, indexOffset, primCount);
        }
        else {
            this.extInstanced.drawArraysInstancedANGLE(mode, indexOffset, indexCount, primCount);
        }
    };
    DrawContext.create = function (device, extInstanced) {
        return new DrawContext(device, extInstanced);
    };
    return DrawContext;
}());
exports.DrawContext = DrawContext;
exports.default = Renderer;
