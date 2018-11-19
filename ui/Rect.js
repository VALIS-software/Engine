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
var GPUDevice_1 = require("../rendering/GPUDevice");
var SharedResources_1 = require("../SharedResources");
var Renderer_1 = require("../rendering/Renderer");
var Object2D_1 = require("./Object2D");
/**
 * Rectangle UI element
 *
 * Todo:
 * - Support rounded corners, stroke, glow & shadows, background shaders
 */
var Rect = /** @class */ (function (_super) {
    __extends(Rect, _super);
    function Rect(w, h, color) {
        if (w === void 0) { w = 10; }
        if (h === void 0) { h = 10; }
        if (color === void 0) { color = [1, 0, 0, 1]; }
        var _this = _super.call(this) || this;
        _this.color = new Float32Array([0, 0, 0, 1]);
        /**
         * When set to 0, blending is additive, when set to 1, blending is normal alpha blending
         */
        _this.additiveBlending = 0;
        _this.attributeLayout = [
            { name: 'position', type: GPUDevice_1.AttributeType.VEC2 },
        ];
        _this.render = true;
        _this.w = w;
        _this.h = h;
        _this.color.set(color);
        return _this;
    }
    Rect.prototype.allocateGPUResources = function (device) {
        this.gpuVertexState = SharedResources_1.SharedResources.quad1x1VertexState;
        this.gpuProgram = SharedResources_1.SharedResources.getProgram(device, this.getVertexCode(), this.getFragmentCode(), this.attributeLayout);
    };
    Rect.prototype.releaseGPUResources = function () {
        // since our resources are shared we don't actually want to release anything here
        this.gpuVertexState = null;
        this.gpuProgram = null;
    };
    Rect.prototype.draw = function (context) {
        context.uniform1f('blendFactor', 1.0 - this.additiveBlending);
        context.uniform2f('size', this.computedWidth, this.computedHeight);
        context.uniformMatrix4fv('model', false, this.worldTransformMat4);
        context.uniform4f('color', this.color[0], this.color[1], this.color[2], this.color[3] * this.opacity);
        context.draw(Renderer_1.DrawMode.TRIANGLES, 6, 0);
    };
    Rect.prototype.getVertexCode = function () {
        return "\n            #version 100\n\n            attribute vec2 position;\n            uniform mat4 model;\n            uniform vec2 size;\n\n            varying vec2 vUv;\n\n            void main() {\n                vUv = position;\n                gl_Position = model * vec4(position * size, 0., 1.0);\n            }\n        ";
    };
    Rect.prototype.getFragmentCode = function () {
        return "\n            #version 100\n\n            precision mediump float;\n            varying vec2 vUv;\n\n            uniform float blendFactor;\n            uniform vec4 color;\n            \n            void main() {\n                gl_FragColor = vec4(color.rgb, blendFactor) * color.a;\n            }\n        ";
    };
    return Rect;
}(Object2D_1.Object2D));
exports.Rect = Rect;
exports.default = Rect;
