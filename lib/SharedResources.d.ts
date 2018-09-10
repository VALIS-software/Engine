import { AttributeLayout, BufferDescriptor, GPUDevice, GPUBuffer, GPUIndexBuffer, GPUProgram, GPUTexture, GPUVertexState, TextureDescriptor } from "./rendering/GPUDevice";
export declare class SharedResources {
    static quadAttributeLayout: AttributeLayout;
    static quadIndexBuffer: GPUIndexBuffer;
    static unitQuadVertexBuffer: GPUBuffer;
    static unitQuadVertexState: GPUVertexState;
    static quad1x1VertexBuffer: GPUBuffer;
    static quad1x1VertexState: GPUVertexState;
    private static programs;
    private static textures;
    private static buffers;
    static getProgram(device: GPUDevice, vertexCode: string, fragmentCode: string, attributeLayout: AttributeLayout): GPUProgram;
    static deleteProgram(vertexCode: string, fragmentCode: string, attributeLayout: AttributeLayout): boolean;
    static getTexture(device: GPUDevice, key: string, descriptor: TextureDescriptor): GPUTexture;
    static deleteTexture(key: string): boolean;
    static getBuffer(device: GPUDevice, key: string, descriptor: BufferDescriptor): GPUBuffer;
    static deleteBuffer(key: string): boolean;
    static initialize(device: GPUDevice): void;
    static release(): void;
}
export default SharedResources;
