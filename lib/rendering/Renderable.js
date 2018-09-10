"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Node_1 = require("./Node");
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
var Renderable = /** @class */ (function (_super) {
    __extends(Renderable, _super);
    function Renderable() {
        var _this = _super.call(this) || this;
        /**
         * Set to false to disable any interaction with the rendering system (including masking).
         * If this is true, the instance must have gpu* fields set before the rendering.
         */
        _this.render = true;
        /**
         * When opacity is less than 1, the object is rendered in the transparent pass with premultiplied alpha blending (unless overridden).
         * When opacity is 0 or less, it's not rendered to the color buffer (but will still be rendered to the stencil buffer).
         */
        _this.opacity = 1;
        /**
         * Set to false to disable writing to the color buffer, however the object will still be drawn to the stencil buffer if it's used as a mask
         */
        _this.visible = true;
        /**
         * Use another renderable as a clipping mask for this renderable. This is done by rendering the mask renderable to the stencil buffer and then stencil testing against it
         */
        _this.mask = null;
        // for future use
        // dependentRenderPasses = new Array<RenderPass>();
        _this.gpuProgram = null;
        _this.gpuVertexState = null;
        _this.gpuResourcesNeedAllocate = true;
        // non-owned fields
        _this._renderStateKey = 0 | 0;
        _this._maskIndex = -1;
        return _this;
    }
    Renderable.prototype.allocateGPUResources = function (device) { };
    Renderable.prototype.releaseGPUResources = function () { };
    Renderable.prototype.draw = function (context) { };
    return Renderable;
}(Node_1.default));
exports.Renderable = Renderable;
exports.default = Renderable;
