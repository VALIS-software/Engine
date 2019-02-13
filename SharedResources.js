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
        var programs = SharedResources.getPrograms(device);
        var key = vertexCode + '\x1D' + fragmentCode + '\x1D' + attributeLayout.map(function (a) { return a.name + ':' + a.type; }).join('\x1F');
        var gpuProgram = programs[key];
        if (gpuProgram == null) {
            gpuProgram = device.createProgram(vertexCode, fragmentCode, attributeLayout);
            programs[key] = gpuProgram;
        }
        return gpuProgram;
    };
    SharedResources.deleteProgram = function (device, vertexCode, fragmentCode, attributeLayout) {
        var programs = SharedResources.getPrograms(device);
        var key = vertexCode + '\x1D' + fragmentCode + '\x1D' + attributeLayout.map(function (a) { return a.name + ':' + a.type; }).join('\x1F');
        var gpuProgram = programs[key];
        if (gpuProgram != null) {
            gpuProgram.delete();
            delete programs[key];
            return true;
        }
        return false;
    };
    SharedResources.getTexture = function (device, key, descriptor) {
        var textures = SharedResources.getTextures(device);
        var gpuTexture = textures[key];
        if (gpuTexture == null) {
            gpuTexture = device.createTexture(descriptor);
            textures[key] = gpuTexture;
        }
        return gpuTexture;
    };
    SharedResources.deleteTexture = function (device, key) {
        var textures = SharedResources.getTextures(device);
        var gpuTexture = textures[key];
        if (gpuTexture != null) {
            gpuTexture.delete();
            delete textures[key];
            return true;
        }
        return false;
    };
    SharedResources.getBuffer = function (device, key, descriptor) {
        var buffers = SharedResources.getBuffers(device);
        var gpuBuffer = buffers[key];
        if (gpuBuffer == null) {
            gpuBuffer = device.createBuffer(descriptor);
            buffers[key] = gpuBuffer;
        }
        return gpuBuffer;
    };
    SharedResources.deleteBuffer = function (device, key) {
        var buffers = SharedResources.getBuffers(device);
        var gpuBuffer = buffers[key];
        if (gpuBuffer != null) {
            gpuBuffer.delete();
            delete buffers[key];
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
    SharedResources.release = function (device) {
        var e_1, _a, e_2, _b, e_3, _c, e_4, _d, e_5, _e, e_6, _f;
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
            for (var _g = __values(Object.keys(this.programs)), _h = _g.next(); !_h.done; _h = _g.next()) {
                var deviceId = _h.value;
                var programs = this.programs[deviceId];
                try {
                    for (var _j = __values(Object.keys(this.programs)), _k = _j.next(); !_k.done; _k = _j.next()) {
                        var key = _k.value;
                        programs[key].delete();
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_k && !_k.done && (_b = _j.return)) _b.call(_j);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_h && !_h.done && (_a = _g.return)) _a.call(_g);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.programs = {};
        try {
            for (var _l = __values(Object.keys(this.textures)), _m = _l.next(); !_m.done; _m = _l.next()) {
                var deviceId = _m.value;
                var textures = this.textures[deviceId];
                try {
                    for (var _o = __values(Object.keys(this.textures)), _p = _o.next(); !_p.done; _p = _o.next()) {
                        var key = _p.value;
                        textures[key].delete();
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_p && !_p.done && (_d = _o.return)) _d.call(_o);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_m && !_m.done && (_c = _l.return)) _c.call(_l);
            }
            finally { if (e_3) throw e_3.error; }
        }
        this.textures = {};
        try {
            for (var _q = __values(Object.keys(this.buffers)), _r = _q.next(); !_r.done; _r = _q.next()) {
                var deviceId = _r.value;
                var buffers = this.buffers[deviceId];
                try {
                    for (var _s = __values(Object.keys(this.buffers)), _t = _s.next(); !_t.done; _t = _s.next()) {
                        var key = _t.value;
                        buffers[key].delete();
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (_t && !_t.done && (_f = _s.return)) _f.call(_s);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_r && !_r.done && (_e = _q.return)) _e.call(_q);
            }
            finally { if (e_5) throw e_5.error; }
        }
        this.buffers = {};
    };
    SharedResources.getPrograms = function (device) {
        var a = this.programs[device.deviceId];
        if (a == null) {
            a = this.programs[device.deviceId] = {};
        }
        return a;
    };
    SharedResources.getTextures = function (device) {
        var a = this.textures[device.deviceId];
        if (a == null) {
            a = this.textures[device.deviceId] = {};
        }
        return a;
    };
    SharedResources.getBuffers = function (device) {
        var a = this.buffers[device.deviceId];
        if (a == null) {
            a = this.buffers[device.deviceId] = {};
        }
        return a;
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
