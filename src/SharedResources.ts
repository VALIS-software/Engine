import { AttributeLayout, BufferDescriptor, GPUDevice, GPUBuffer, GPUIndexBuffer, GPUProgram, GPUTexture, GPUVertexState, AttributeType, TextureDescriptor } from "./rendering/GPUDevice";

export class SharedResources {

    static quadAttributeLayout: AttributeLayout = [
        { name: 'position', type: AttributeType.VEC2 },
    ];

    private static programs: { [deviceId: string]: { [key: string]: GPUProgram } } = {};
    private static textures: { [deviceId: string]: { [key: string]: GPUTexture } } = {};
    private static buffers: { [deviceId: string]: { [key: string]: GPUBuffer } } = {};

    private static quadIndexBuffers: { [deviceId: string]: GPUIndexBuffer } = {};

    private static unitQuadVertexBuffers: { [deviceId: string]: GPUBuffer } = {};
    private static unitQuadVertexStates: { [deviceId: string]: GPUVertexState } = {};

    private static quad1x1VertexBuffers: { [deviceId: string]: GPUBuffer } = {};
    private static quad1x1VertexStates: { [deviceId: string]: GPUVertexState } = {};

    static getProgram(device: GPUDevice, vertexCode: string, fragmentCode: string, attributeLayout: AttributeLayout) {
        let programs = SharedResources.getPrograms(device);

        let key = vertexCode + '\x1D' + fragmentCode + '\x1D' + attributeLayout.map(a => a.name + ':' + a.type).join('\x1F');
        let gpuProgram = programs[key];

        if (gpuProgram == null) {
            gpuProgram = device.createProgram(vertexCode, fragmentCode, attributeLayout);
            programs[key] = gpuProgram;
        }

        return gpuProgram;
    }

    static deleteProgram(device: GPUDevice, vertexCode: string, fragmentCode: string, attributeLayout: AttributeLayout) {
        let programs = SharedResources.getPrograms(device);
        
        let key = vertexCode + '\x1D' + fragmentCode + '\x1D' + attributeLayout.map(a => a.name + ':' + a.type).join('\x1F');
        let gpuProgram = programs[key];

        if (gpuProgram != null) {
            gpuProgram.delete();
            delete programs[key];
            return true;
        }

        return false;
    }

    static getTexture(device: GPUDevice, key: string, descriptor: TextureDescriptor) {
        let textures = SharedResources.getTextures(device);

        let gpuTexture = textures[key];

        if (gpuTexture == null) {
            gpuTexture = device.createTexture(descriptor);
            textures[key] = gpuTexture;
        }

        return gpuTexture;
    }

    static deleteTexture(device: GPUDevice, key: string) {
        let textures = SharedResources.getTextures(device);

        let gpuTexture = textures[key];

        if (gpuTexture != null) {
            gpuTexture.delete();
            delete textures[key];
            return true;
        }

        return false;
    }

    static getBuffer(device: GPUDevice, key: string, descriptor: BufferDescriptor) {
        let buffers = SharedResources.getBuffers(device);

        let gpuBuffer = buffers[key];

        if (gpuBuffer == null) {
            gpuBuffer = device.createBuffer(descriptor);
            buffers[key] = gpuBuffer;
        }

        return gpuBuffer;
    }

    static deleteBuffer(device: GPUDevice, key: string) {
        let buffers = SharedResources.getBuffers(device);

        let gpuBuffer = buffers[key];

        if (gpuBuffer != null) {
            gpuBuffer.delete();
            delete buffers[key];
            return true;
        }

        return false;
    }

    static getQuadIndexBuffer(device: GPUDevice) {
        let h = this.quadIndexBuffers[device.deviceId];
        if (h == null) {
            h = this.quadIndexBuffers[device.deviceId] = device.createIndexBuffer({
                data: new Uint8Array([
                    0, 1, 2,
                    0, 3, 1
                ])
            });
        }
        return h;
    }

    static getUnitQuadVertexBuffer(device: GPUDevice) {
        let h = this.unitQuadVertexBuffers[device.deviceId];
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
    }

    static getUnitQuadVertexState(device: GPUDevice) {
        let h = this.unitQuadVertexStates[device.deviceId];
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
    }

    static getQuad1x1VertexBuffer(device: GPUDevice) {
        let h = this.quad1x1VertexBuffers[device.deviceId];
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
    }

    static getQuad1x1VertexState(device: GPUDevice) {
        let h = this.quad1x1VertexStates[device.deviceId];
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
    }

    static release(device: GPUDevice) {
        let programs = this.programs[device.deviceId];
        for (let key in programs) {
            programs[key].delete();
        }
        delete this.programs[device.deviceId];

        let textures = this.textures[device.deviceId];
        for (let key in textures) {
            textures[key].delete();
        }
        delete this.textures[device.deviceId];

        let buffers = this.buffers[device.deviceId];
        for (let key in buffers) {
            buffers[key].delete();
        }
        delete this.buffers[device.deviceId];

        let quadIndexBuffer = this.quadIndexBuffers[device.deviceId];
        if (quadIndexBuffer != null) quadIndexBuffer.delete();
        delete this.quadIndexBuffers[device.deviceId];

        let unitQuadVertexBuffer = this.unitQuadVertexBuffers[device.deviceId];
        if (unitQuadVertexBuffer != null) unitQuadVertexBuffer.delete();
        delete this.unitQuadVertexBuffers[device.deviceId];

        let unitQuadVertexState = this.unitQuadVertexStates[device.deviceId];
        if (unitQuadVertexState != null) unitQuadVertexState.delete();
        delete this.unitQuadVertexStates[device.deviceId];

        let quad1x1VertexBuffer = this.quad1x1VertexBuffers[device.deviceId];
        if (quad1x1VertexBuffer != null) quad1x1VertexBuffer.delete();
        delete this.quad1x1VertexBuffers[device.deviceId];

        let quad1x1VertexState = this.quad1x1VertexStates[device.deviceId];
        if (quad1x1VertexState != null) quad1x1VertexState.delete();
        delete this.quad1x1VertexStates[device.deviceId];
    }

    private static getPrograms(device: GPUDevice) {
        let a = this.programs[device.deviceId];
        if (a == null) {
            a = this.programs[device.deviceId] = {};
        }
        return a;
    }

    private static getTextures(device: GPUDevice) {
        let a = this.textures[device.deviceId];
        if (a == null) {
            a = this.textures[device.deviceId] = {};
        }
        return a;
    }

    private static getBuffers(device: GPUDevice) {
        let a = this.buffers[device.deviceId];
        if (a == null) {
            a = this.buffers[device.deviceId] = {};
        }
        return a;
    }

}

export default SharedResources;