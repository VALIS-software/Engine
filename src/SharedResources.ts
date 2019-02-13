import { AttributeLayout, BufferDescriptor, GPUDevice, GPUBuffer, GPUIndexBuffer, GPUProgram, GPUTexture, GPUVertexState, AttributeType, TextureDescriptor } from "./rendering/GPUDevice";

export class SharedResources {

    static quadAttributeLayout: AttributeLayout = [
        { name: 'position', type: AttributeType.VEC2 },
    ];

    static quadIndexBuffer: GPUIndexBuffer;

    static unitQuadVertexBuffer: GPUBuffer;
    static unitQuadVertexState: GPUVertexState;

    static quad1x1VertexBuffer: GPUBuffer;
    static quad1x1VertexState: GPUVertexState;

    private static programs: { [deviceId: string]: { [key: string]: GPUProgram } } = {};
    private static textures: { [deviceId: string]: { [key: string]: GPUTexture } } = {};
    private static buffers: { [deviceId: string]: { [key: string]: GPUBuffer } } = {};

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

    static initialize(device: GPUDevice) {
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
                  0,   0,
                1.0, 1.0,
                  0, 1.0,
                1.0,   0,
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
    }

    static release(device: GPUDevice) {
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

        for (let deviceId of Object.keys(this.programs)) {
            let programs = this.programs[deviceId];
            for (let key of Object.keys(this.programs)) {
                programs[key].delete();
            }
        }
        this.programs = {};

        for (let deviceId of Object.keys(this.textures)) {
            let textures = this.textures[deviceId];
            for (let key of Object.keys(this.textures)) {
                textures[key].delete();
            }
        }
        this.textures = {};

        for (let deviceId of Object.keys(this.buffers)) {
            let buffers = this.buffers[deviceId];
            for (let key of Object.keys(this.buffers)) {
                buffers[key].delete();
            }
        }
        this.buffers = {};
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