import { AttributeLayout, BufferDescriptor, GPUDevice, GPUBuffer, GPUIndexBuffer, GPUProgram, GPUTexture, GPUVertexState, TextureDescriptor } from "./rendering/GPUDevice";
export declare class SharedResources {
    static quadAttributeLayout: AttributeLayout;
    private static programs;
    private static textures;
    private static buffers;
    private static quadIndexBuffers;
    private static unitQuadVertexBuffers;
    private static unitQuadVertexStates;
    private static quad1x1VertexBuffers;
    private static quad1x1VertexStates;
    static getProgram(device: GPUDevice, vertexCode: string, fragmentCode: string, attributeLayout: AttributeLayout): GPUProgram;
    static deleteProgram(device: GPUDevice, vertexCode: string, fragmentCode: string, attributeLayout: AttributeLayout): boolean;
    static getTexture(device: GPUDevice, key: string, descriptor: TextureDescriptor): GPUTexture;
    static deleteTexture(device: GPUDevice, key: string): boolean;
    static getBuffer(device: GPUDevice, key: string, descriptor: BufferDescriptor): GPUBuffer;
    static deleteBuffer(device: GPUDevice, key: string): boolean;
    static getQuadIndexBuffer(device: GPUDevice): GPUIndexBuffer;
    static getUnitQuadVertexBuffer(device: GPUDevice): GPUBuffer;
    static getUnitQuadVertexState(device: GPUDevice): GPUVertexState;
    static getQuad1x1VertexBuffer(device: GPUDevice): GPUBuffer;
    static getQuad1x1VertexState(device: GPUDevice): GPUVertexState;
    static release(device: GPUDevice): void;
    private static getPrograms;
    private static getTextures;
    private static getBuffers;
}
export default SharedResources;
