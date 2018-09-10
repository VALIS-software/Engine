"use strict";
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var GPUDevice_1 = require("./rendering/GPUDevice");
var SharedResources = /** @class */ (function () {
    function SharedResources() {
    }
    SharedResources.getProgram = function (device, vertexCode, fragmentCode, attributeLayout) {
        var key = vertexCode + '\x1D' + fragmentCode + '\x1D' + attributeLayout.map(function (a) { return a.name + ':' + a.type; }).join('\x1F');
        var gpuProgram = this.programs[key];
        if (gpuProgram == null) {
            gpuProgram = device.createProgram(vertexCode, fragmentCode, attributeLayout);
            this.programs[key] = gpuProgram;
        }
        return gpuProgram;
    };
    SharedResources.deleteProgram = function (vertexCode, fragmentCode, attributeLayout) {
        var key = vertexCode + '\x1D' + fragmentCode + '\x1D' + attributeLayout.map(function (a) { return a.name + ':' + a.type; }).join('\x1F');
        var gpuProgram = this.programs[key];
        if (gpuProgram != null) {
            gpuProgram.delete();
            delete this.programs[key];
            return true;
        }
        return false;
    };
    SharedResources.getTexture = function (device, key, descriptor) {
        var gpuTexture = this.textures[key];
        if (gpuTexture == null) {
            gpuTexture = device.createTexture(descriptor);
            this.textures[key] = gpuTexture;
        }
        return gpuTexture;
    };
    SharedResources.deleteTexture = function (key) {
        var gpuTexture = this.textures[key];
        if (gpuTexture != null) {
            gpuTexture.delete();
            delete this.textures[key];
            return true;
        }
        return false;
    };
    SharedResources.getBuffer = function (device, key, descriptor) {
        var gpuBuffer = this.buffers[key];
        if (gpuBuffer == null) {
            gpuBuffer = device.createBuffer(descriptor);
            this.buffers[key] = gpuBuffer;
        }
        return gpuBuffer;
    };
    SharedResources.deleteBuffer = function (key) {
        var gpuBuffer = this.buffers[key];
        if (gpuBuffer != null) {
            gpuBuffer.delete();
            delete this.buffers[key];
            return true;
        }
        return false;
    };
    SharedResources.initialize = function (device) {
        this.quadIndexBuffer = device.createIndexBuffer({
            data: new Uint8Array([
                0, 1, 2,
                0, 3, 1
            ])
        });
        this.unitQuadVertexBuffer = device.createBuffer({
            data: new Float32Array([
                -1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0,
                1.0, -1.0,
            ]),
        });
        this.unitQuadVertexState = device.createVertexState({
            indexBuffer: this.quadIndexBuffer,
            attributeLayout: this.quadAttributeLayout,
            attributes: {
                'position': {
                    buffer: this.unitQuadVertexBuffer,
                    offsetBytes: 0,
                    strideBytes: 2 * 4
                }
            }
        });
        this.quad1x1VertexBuffer = device.createBuffer({
            data: new Float32Array([
                0, 0,
                1.0, 1.0,
                0, 1.0,
                1.0, 0,
            ]),
        });
        this.quad1x1VertexState = device.createVertexState({
            indexBuffer: this.quadIndexBuffer,
            attributeLayout: this.quadAttributeLayout,
            attributes: {
                'position': {
                    buffer: this.quad1x1VertexBuffer,
                    offsetBytes: 0,
                    strideBytes: 2 * 4
                }
            }
        });
    };
    SharedResources.release = function () {
        var e_1, _a, e_2, _b, e_3, _c;
        this.quadIndexBuffer.delete();
        this.quadIndexBuffer = null;
        this.unitQuadVertexState.delete();
        this.unitQuadVertexState = null;
        this.unitQuadVertexBuffer.delete();
        this.unitQuadVertexBuffer = null;
        this.quad1x1VertexState.delete();
        this.quad1x1VertexState = null;
        this.quad1x1VertexBuffer.delete();
        this.quad1x1VertexBuffer = null;
        try {
            for (var _d = __values(Object.keys(this.programs)), _e = _d.next(); !_e.done; _e = _d.next()) {
                var key = _e.value;
                this.programs[key].delete();
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.programs = {};
        try {
            for (var _f = __values(Object.keys(this.textures)), _g = _f.next(); !_g.done; _g = _f.next()) {
                var key = _g.value;
                this.textures[key].delete();
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
            }
            finally { if (e_2) throw e_2.error; }
        }
        this.textures = {};
        try {
            for (var _h = __values(Object.keys(this.buffers)), _j = _h.next(); !_j.done; _j = _h.next()) {
                var key = _j.value;
                this.buffers[key].delete();
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
            }
            finally { if (e_3) throw e_3.error; }
        }
        this.buffers = {};
    };
    SharedResources.quadAttributeLayout = [
        { name: 'position', type: GPUDevice_1.AttributeType.VEC2 },
    ];
    SharedResources.programs = {};
    SharedResources.textures = {};
    SharedResources.buffers = {};
    return SharedResources;
}());
exports.SharedResources = SharedResources;
exports.default = SharedResources;
