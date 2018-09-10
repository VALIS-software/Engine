import { AttributeLayout, BufferDescriptor, GPUDevice, GPUBuffer, GPUIndexBuffer, GPUProgram, GPUTexture, GPUVertexState, AttributeType, TextureDescriptor } from "engine/rendering/GPUDevice";

export class SharedResources {

    static quadAttributeLayout: AttributeLayout = [
        { name: 'position', type: AttributeType.VEC2 },
    ];

    static quadIndexBuffer: GPUIndexBuffer;

    static unitQuadVertexBuffer: GPUBuffer;
    static unitQuadVertexState: GPUVertexState;

    static quad1x1VertexBuffer: GPUBuffer;
    static quad1x1VertexState: GPUVertexState;

    private static programs: { [key: string]: GPUProgram } = {};
    private static textures: { [key: string]: GPUTexture } = {};
    private static buffers: { [key: string]: GPUBuffer } = {};

    static getProgram(device: GPUDevice, vertexCode: string, fragmentCode: string, attributeLayout: AttributeLayout) {
        let key = vertexCode + '\x1D' + fragmentCode + '\x1D' + attributeLayout.map(a => a.name + ':' + a.type).join('\x1F');
        let gpuProgram = this.programs[key];

        if (gpuProgram == null) {
            gpuProgram = device.createProgram(vertexCode, fragmentCode, attributeLayout);
            this.programs[key] = gpuProgram;
        }

        return gpuProgram;
    }

    static deleteProgram(vertexCode: string, fragmentCode: string, attributeLayout: AttributeLayout) {
        let key = vertexCode + '\x1D' + fragmentCode + '\x1D' + attributeLayout.map(a => a.name + ':' + a.type).join('\x1F');
        let gpuProgram = this.programs[key];

        if (gpuProgram != null) {
            gpuProgram.delete();
            delete this.programs[key];
            return true;
        }

        return false;
    }

    static getTexture(device: GPUDevice, key: string, descriptor: TextureDescriptor) {
        let gpuTexture = this.textures[key];

        if (gpuTexture == null) {
            gpuTexture = device.createTexture(descriptor);
            this.textures[key] = gpuTexture;
        }

        return gpuTexture;
    }

    static deleteTexture(key: string) {
        let gpuTexture = this.textures[key];

        if (gpuTexture != null) {
            gpuTexture.delete();
            delete this.textures[key];
            return true;
        }

        return false;
    }

    static getBuffer(device: GPUDevice, key: string, descriptor: BufferDescriptor) {
        let gpuBuffer = this.buffers[key];

        if (gpuBuffer == null) {
            gpuBuffer = device.createBuffer(descriptor);
            this.buffers[key] = gpuBuffer;
        }

        return gpuBuffer;
    }

    static deleteBuffer(key: string) {
        let gpuBuffer = this.buffers[key];

        if (gpuBuffer != null) {
            gpuBuffer.delete();
            delete this.buffers[key];
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

    static release() {
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

        for (let key of Object.keys(this.programs)) {
            this.programs[key].delete();
        }
        this.programs = {};

        for (let key of Object.keys(this.textures)) {
            this.textures[key].delete();
        }
        this.textures = {};

        for (let key of Object.keys(this.buffers)) {
            this.buffers[key].delete();
        }
        this.buffers = {};
    }

}

export default SharedResources;