import GPUDevice, { AttributeLayout, GPUBuffer, GPUVertexState, shaderTypeLength, VertexAttributeBuffer } from "../rendering/GPUDevice";
import Object2D from "./Object2D";
import SharedResources from "../SharedResources";

/**
 * Base class for instance rendering
 * 
 * To use, override:
 * - draw()
 * - allocateVertexState()
 * - getVertexCode()
 * - getFragmentCode()
 */
export class Object2DInstances<Instance> extends Object2D {

    // do not override; filled by class
    protected attributeLayout: AttributeLayout;
    protected instanceCount: number;
    protected instancePacking: {
        [name: string]: {
            length: number,
            offset: number,
        }
    };
    protected instancePackLength: number;
    protected instanceDataArray: Float32Array;

    protected gpuInstanceBuffer: GPUBuffer;

    constructor(
        instances: Array<Instance>,
        protected vertexAttributeLayout: AttributeLayout,
        protected instanceAttributeLayout: AttributeLayout,
        protected instanceFieldExtractors: { [name: string]: (instance: Instance) => ArrayLike<number> }
    ) {
        super();
        this.render = true;

        this.attributeLayout = this.vertexAttributeLayout.concat(this.instanceAttributeLayout);

        this.instanceCount = instances.length;

        // translate attribute layout into a details for packing attributes into a buffer
        this.instancePacking = {};

        let runningLength = 0;
        for (let instanceAttribute of this.instanceAttributeLayout) {
            let typeLength = shaderTypeLength[instanceAttribute.type];
            this.instancePacking[instanceAttribute.name] = {
                length: typeLength,
                offset: runningLength
            };
            runningLength += typeLength;
        }

        // length in floats of a single set of instance attributes
        this.instancePackLength = runningLength;

        // allocate a array large enough to fit all instance attribute for all instances
        this.instanceDataArray = new Float32Array(this.instancePackLength * instances.length);

        // populate the array with attribute data (interleaved into a single array)
        for (let i = 0; i < instances.length; i++) {
            this.writeInstanceAttributes(this.instanceDataArray, instances[i], i);
        }
    }

    updateInstance(index: number, instance: Instance) {
        this.writeInstanceAttributes(this.instanceDataArray, instance, index);

        if (this.gpuInstanceBuffer != null) {
            // upload to subsection of gpu buffer
            let offsetFloats = index * this.instancePackLength;
            let offsetBytes = offsetFloats * 4;
            this.gpuInstanceBuffer.updateBufferData(this.instanceDataArray.subarray(offsetFloats, offsetFloats + this.instancePackLength), offsetBytes);
        }
    }

    allocateGPUResources(device: GPUDevice) {
        this.gpuInstanceBuffer = device.createBuffer({ data: this.instanceDataArray });

        let instanceVertexAttributes: { [name: string]: VertexAttributeBuffer } = {};
        for (let instanceAttribute of this.instanceAttributeLayout) {
            instanceVertexAttributes[instanceAttribute.name] = {
                buffer: this.gpuInstanceBuffer,
                offsetBytes: this.instancePacking[instanceAttribute.name].offset * 4,
                strideBytes: this.instancePackLength * 4,
                instanceDivisor: 1
            }
        }

        // create vertex state
        this.gpuVertexState = this.allocateGPUVertexState(device, this.attributeLayout, instanceVertexAttributes);

        this.gpuProgram = SharedResources.getProgram(
            device,
            this.getVertexCode(),
            this.getFragmentCode(),
            this.attributeLayout
        );
    }

    releaseGPUResources() {
        if (this.gpuVertexState != null) {
            this.gpuVertexState.delete();
            this.gpuVertexState = null;
        }
        if (this.gpuInstanceBuffer != null) {
            this.gpuInstanceBuffer.delete();
            this.gpuInstanceBuffer = null;
        }
        // since our resources are shared we don't actually want to release anything here
        this.gpuProgram = null;
    }

    protected writeInstanceAttributes(instanceArray: Float32Array, instance: Instance, instanceIndex: number) {
        let instanceOffset = this.instancePackLength * instanceIndex;

        for (let instanceAttribute of this.instanceAttributeLayout) {
            let name = instanceAttribute.name;
            let packing = this.instancePacking[name];
            let attributeOffset = instanceOffset + packing.offset;
            let attributeData = this.instanceFieldExtractors[name](instance);
            if (attributeData.length !== packing.length) {
                console.warn(`Instance attribute data length was ${attributeData.length}, but expected length ${packing.length}`);
            }
            instanceArray.set(attributeData, attributeOffset);
        }
    }

    // override the following
    protected allocateGPUVertexState(
        device: GPUDevice,
        attributeLayout: AttributeLayout,
        instanceVertexAttributes: { [name: string]: VertexAttributeBuffer }
    ): GPUVertexState {
        return null;
    }
    protected getVertexCode(): string { return null; }
    protected getFragmentCode(): string { return null; }

}

export default Object2DInstances;