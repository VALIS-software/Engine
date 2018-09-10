import GPUDevice, { AttributeLayout, GPUBuffer, GPUVertexState, VertexAttributeBuffer } from "../rendering/GPUDevice";
import Object2D from "./Object2D";
/**
 * Base class for instance rendering
 *
 * To use, override:
 * - draw()
 * - allocateVertexState()
 * - getVertexCode()
 * - getFragmentCode()
 */
export declare class Object2DInstances<Instance> extends Object2D {
    protected vertexAttributeLayout: AttributeLayout;
    protected instanceAttributeLayout: AttributeLayout;
    protected instanceFieldExtractors: {
        [name: string]: (instance: Instance) => ArrayLike<number>;
    };
    protected attributeLayout: AttributeLayout;
    protected instanceCount: number;
    protected instancePacking: {
        [name: string]: {
            length: number;
            offset: number;
        };
    };
    protected instancePackLength: number;
    protected instanceDataArray: Float32Array;
    protected gpuInstanceBuffer: GPUBuffer;
    constructor(instances: Array<Instance>, vertexAttributeLayout: AttributeLayout, instanceAttributeLayout: AttributeLayout, instanceFieldExtractors: {
        [name: string]: (instance: Instance) => ArrayLike<number>;
    });
    updateInstance(index: number, instance: Instance): void;
    allocateGPUResources(device: GPUDevice): void;
    releaseGPUResources(): void;
    protected writeInstanceAttributes(instanceArray: Float32Array, instance: Instance, instanceIndex: number): void;
    protected allocateGPUVertexState(device: GPUDevice, attributeLayout: AttributeLayout, instanceVertexAttributes: {
        [name: string]: VertexAttributeBuffer;
    }): GPUVertexState;
    protected getVertexCode(): string;
    protected getFragmentCode(): string;
}
export default Object2DInstances;
