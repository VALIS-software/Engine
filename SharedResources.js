"use strict";
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
    SharedResources.getQuadIndexBuffer = function (device) {
        var h = this.quadIndexBuffers[device.deviceId];
        if (h == null) {
            h = this.quadIndexBuffers[device.deviceId] = device.createIndexBuffer({
                data: new Uint8Array([
                    0, 1, 2,
                    0, 3, 1
                ])
            });
        }
        return h;
    };
    SharedResources.getUnitQuadVertexBuffer = function (device) {
        var h = this.unitQuadVertexBuffers[device.deviceId];
        if (h == null) {
            h = this.unitQuadVertexBuffers[device.deviceId] = device.createBuffer({
                data: new Float32Array([
                    -1.0, -1.0,
                    1.0, 1.0,
                    -1.0, 1.0,
                    1.0, -1.0,
                ]),
            });
        }
        return h;
    };
    SharedResources.getUnitQuadVertexState = function (device) {
        var h = this.unitQuadVertexStates[device.deviceId];
        if (h == null) {
            h = this.unitQuadVertexStates[device.deviceId] = device.createVertexState({
                indexBuffer: this.getQuadIndexBuffer(device),
                attributeLayout: this.quadAttributeLayout,
                attributes: {
                    'position': {
                        buffer: this.getUnitQuadVertexBuffer(device),
                        offsetBytes: 0,
                        strideBytes: 2 * 4
                    }
                }
            });
        }
        return h;
    };
    SharedResources.getQuad1x1VertexBuffer = function (device) {
        var h = this.quad1x1VertexBuffers[device.deviceId];
        if (h == null) {
            h = this.quad1x1VertexBuffers[device.deviceId] = device.createBuffer({
                data: new Float32Array([
                    0, 0,
                    1.0, 1.0,
                    0, 1.0,
                    1.0, 0,
                ]),
            });
        }
        return h;
    };
    SharedResources.getQuad1x1VertexState = function (device) {
        var h = this.quad1x1VertexStates[device.deviceId];
        if (h == null) {
            h = this.quad1x1VertexStates[device.deviceId] = device.createVertexState({
                indexBuffer: this.getQuadIndexBuffer(device),
                attributeLayout: this.quadAttributeLayout,
                attributes: {
                    'position': {
                        buffer: this.getQuad1x1VertexBuffer(device),
                        offsetBytes: 0,
                        strideBytes: 2 * 4
                    }
                }
            });
        }
        return h;
    };
    SharedResources.release = function (device) {
        var programs = this.programs[device.deviceId];
        for (var key in programs) {
            programs[key].delete();
        }
        delete this.programs[device.deviceId];
        var textures = this.textures[device.deviceId];
        for (var key in textures) {
            textures[key].delete();
        }
        delete this.textures[device.deviceId];
        var buffers = this.buffers[device.deviceId];
        for (var key in buffers) {
            buffers[key].delete();
        }
        delete this.buffers[device.deviceId];
        var quadIndexBuffer = this.quadIndexBuffers[device.deviceId];
        if (quadIndexBuffer != null)
            quadIndexBuffer.delete();
        delete this.quadIndexBuffers[device.deviceId];
        var unitQuadVertexBuffer = this.unitQuadVertexBuffers[device.deviceId];
        if (unitQuadVertexBuffer != null)
            unitQuadVertexBuffer.delete();
        delete this.unitQuadVertexBuffers[device.deviceId];
        var unitQuadVertexState = this.unitQuadVertexStates[device.deviceId];
        if (unitQuadVertexState != null)
            unitQuadVertexState.delete();
        delete this.unitQuadVertexStates[device.deviceId];
        var quad1x1VertexBuffer = this.quad1x1VertexBuffers[device.deviceId];
        if (quad1x1VertexBuffer != null)
            quad1x1VertexBuffer.delete();
        delete this.quad1x1VertexBuffers[device.deviceId];
        var quad1x1VertexState = this.quad1x1VertexStates[device.deviceId];
        if (quad1x1VertexState != null)
            quad1x1VertexState.delete();
        delete this.quad1x1VertexStates[device.deviceId];
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
    SharedResources.quadIndexBuffers = {};
    SharedResources.unitQuadVertexBuffers = {};
    SharedResources.unitQuadVertexStates = {};
    SharedResources.quad1x1VertexBuffers = {};
    SharedResources.quad1x1VertexStates = {};
    return SharedResources;
}());
exports.SharedResources = SharedResources;
exports.default = SharedResources;
