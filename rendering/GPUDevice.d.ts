/**

Dev Notes:
- Should be dependency free, doesn't know about Renderer
- Should not have any public state; purely object management
- TextureManager
    "Performance problems have been observed on some implementations when using uniform1i to update sampler uniforms. To change the texture referenced by a sampler uniform, binding a new texture to the texture unit referenced by the uniform should be preferred over using uniform1i to update the uniform itself."

**/
export declare type GPUDeviceInternal = {
    gl: WebGLRenderingContext;
    extVao: OES_vertex_array_object;
    extInstanced: ANGLE_instanced_arrays;
    compileShader: (code: string, type: number) => WebGLShader;
    applyVertexStateDescriptor: (vertexStateDescriptor: VertexStateDescriptor) => void;
    assignTextureUnit(): number;
    bindTexture(handle: GPUTexture): void;
    clearTextureUnit(unit: number): void;
    markTextureUsage(handle: GPUTexture): void;
    textureUnitState: Array<{
        texture: GPUTexture;
        usageMetric: number;
    }>;
};
export declare class GPUDevice {
    readonly programCount: number;
    readonly vertexStateCount: number;
    readonly bufferCount: number;
    capabilities: {
        vertexArrayObjects: boolean;
        instancing: boolean;
        availableTextureUnits: number;
    };
    readonly name: string;
    protected gl: WebGLRenderingContext;
    protected vertexStateIds: IdManager;
    protected programIds: IdManager;
    protected vertexShaderCache: ReferenceCountCache<WebGLShader>;
    protected fragmentShaderCache: ReferenceCountCache<WebGLShader>;
    protected extVao: null | OES_vertex_array_object;
    protected extInstanced: null | ANGLE_instanced_arrays;
    protected textureUnitState: Array<{
        texture: GPUTexture;
        usageMetric: number;
    }>;
    protected textureUnitUsageCounter: number;
    private _programCount;
    private _vertexStateCount;
    private _bufferCount;
    private _textureCount;
    constructor(gl: WebGLRenderingContext);
    createBuffer(bufferDescriptor: BufferDescriptor): GPUBuffer;
    /**
     * @throws string if index data requires UInt extension on a device that doesn't support it
     * @throws string if both dataType _and_ data are not set
     */
    createIndexBuffer(indexBufferDescriptor: IndexBufferDescriptor): GPUIndexBuffer;
    updateBufferData(handle: GPUBuffer | GPUIndexBuffer, data: BufferDataSource, offsetBytes?: number): void;
    deleteBuffer(handle: GPUBuffer | GPUIndexBuffer): void;
    createVertexState(vertexStateDescriptor: VertexStateDescriptor): GPUVertexState;
    deleteVertexState(handle: GPUVertexState): void;
    createTexture(textureDescriptor: TextureDescriptor): GPUTexture;
    updateTextureData(handle: GPUTexture, level: number, format: TextureFormat, data: TexImageSource | ArrayBufferView, x?: number, y?: number, w?: number, h?: number): void;
    deleteTexture(handle: GPUTexture): void;
    /**
     * @throws string if shaders cannot be compiled or program cannot be linked
     */
    createProgram(vertexCode: string, fragmentCode: string, attributeLayout: AttributeLayout): GPUProgram;
    deleteProgram(handle: GPUProgram): void;
    protected compileShader(code: string, type: number): WebGLShader;
    protected applyVertexStateDescriptor(vertexStateDescriptor: VertexStateDescriptor): void;
    protected assignTextureUnit(): number;
    protected bindTexture(handle: GPUTexture): void;
    protected clearTextureUnit(unit: number): void;
    protected markTextureUsage(handle: GPUTexture): void;
}
export declare enum IndexDataType {
    UNSIGNED_BYTE,
    UNSIGNED_SHORT,
    UNSIGNED_INT
}
export declare enum VertexAttributeSourceType {
    BYTE,
    SHORT,
    UNSIGNED_BYTE,
    UNSIGNED_SHORT,
    FLOAT
}
export declare enum BufferUsageHint {
    STREAM,
    STATIC,
    DYNAMIC
}
export declare enum UniformType {
    FLOAT,
    VEC2,
    VEC3,
    VEC4,
    IVEC2,
    IVEC3,
    IVEC4,
    BOOL,
    BVEC2,
    BVEC3,
    BVEC4,
    MAT2,
    MAT3,
    MAT4,
    SAMPLER_2D,
    SAMPLER_CUBE
}
export declare enum AttributeType {
    FLOAT,
    VEC2,
    VEC3,
    VEC4,
    MAT2,
    MAT3,
    MAT4
}
export declare type AttributeLayout = Array<{
    name: string | null;
    type: AttributeType;
}>;
export declare type BufferDataSource = Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array | DataView | ArrayBuffer;
export declare type BufferDescriptor = {
    data?: BufferDataSource;
    size?: number;
    usageHint?: BufferUsageHint;
};
export declare type IndexBufferDescriptor = {
    data?: Uint8Array | Uint8ClampedArray | Uint16Array | Uint32Array;
    size?: number;
    dataType?: IndexDataType;
    usageHint?: BufferUsageHint;
};
export declare type VertexAttributeConstant = {
    type: AttributeType;
    data: Float32Array;
};
export declare type VertexAttributeBuffer = {
    buffer: GPUBuffer;
    offsetBytes: number;
    strideBytes: number;
    sourceColumns?: number;
    sourceDataType?: VertexAttributeSourceType;
    normalize?: boolean;
    instanceDivisor?: number;
};
export declare type VertexAttribute = VertexAttributeConstant | VertexAttributeBuffer;
export declare type VertexStateDescriptor = {
    indexBuffer?: GPUIndexBuffer;
    attributeLayout: AttributeLayout;
    attributes: {
        [name: string]: VertexAttribute;
    };
};
export declare enum TextureDataType {
    UNSIGNED_BYTE,
    UNSIGNED_SHORT_5_6_5,
    UNSIGNED_SHORT_4_4_4_4,
    UNSIGNED_SHORT_5_5_5_1,
    FLOAT
}
export declare enum TextureFormat {
    ALPHA,
    RGB,
    RGBA,
    LUMINANCE,
    LUMINANCE_ALPHA
}
export declare enum ColorSpaceConversion {
    NONE,
    DEFAULT
}
export declare enum TextureMagFilter {
    NEAREST,
    LINEAR
}
export declare enum TextureMinFilter {
    NEAREST,
    LINEAR,
    NEAREST_MIPMAP_NEAREST,
    LINEAR_MIPMAP_NEAREST,
    NEAREST_MIPMAP_LINEAR,
    LINEAR_MIPMAP_LINEAR
}
export declare enum TextureWrapMode {
    REPEAT,
    CLAMP_TO_EDGE,
    MIRRORED_REPEAT
}
export declare type TexImageSource = ImageBitmap | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
export declare enum TextureUsageHint {
    LONG_LIFE = 1,
    TRANSIENT = 0
}
export declare type TextureDescriptor = {
    format: TextureFormat;
    generateMipmaps: boolean;
    mipmapData?: Array<ArrayBufferView | TexImageSource>;
    width?: number;
    height?: number;
    dataType?: TextureDataType;
    usageHint?: TextureUsageHint;
    samplingParameters?: {
        magFilter?: TextureMagFilter;
        minFilter?: TextureMinFilter;
        wrapS?: TextureWrapMode;
        wrapT?: TextureWrapMode;
    };
    pixelStorage?: {
        packAlignment?: number;
        unpackAlignment?: number;
        flipY?: boolean;
        premultiplyAlpha?: boolean;
        colorSpaceConversion?: ColorSpaceConversion;
    };
};
export declare const shaderTypeLength: {
    [x: number]: number;
};
export declare const shaderTypeRows: {
    [x: number]: number;
};
export declare const shaderTypeColumns: {
    [x: number]: number;
};
export declare const dataTypeByteLength: {
    [x: number]: number;
};
interface GPUObjectHandle {
    delete: () => void;
}
export declare class GPUBuffer implements GPUObjectHandle {
    protected readonly device: GPUDevice;
    readonly native: WebGLBuffer;
    constructor(device: GPUDevice, native: WebGLBuffer);
    updateBufferData(data: BufferDataSource, offsetBytes?: number): void;
    delete(): void;
}
export declare class GPUIndexBuffer extends GPUBuffer {
    readonly dataType: IndexDataType;
    constructor(device: GPUDevice, native: WebGLBuffer, dataType: IndexDataType);
}
export declare type GPUVertexStateInternal = {
    _vaoFallbackDescriptor: VertexStateDescriptor;
};
export declare class GPUVertexState implements GPUObjectHandle {
    protected readonly device: GPUDevice;
    readonly id: number;
    readonly native: null | WebGLVertexArrayObjectOES;
    readonly attributeLayout: AttributeLayout;
    readonly indexType?: IndexDataType;
    protected _vaoFallbackDescriptor: undefined | VertexStateDescriptor;
    constructor(device: GPUDevice, id: number, native: null | WebGLVertexArrayObjectOES, attributeLayout: AttributeLayout, indexType?: IndexDataType);
    delete(): void;
}
export declare type GPUTextureInternal = {
    boundUnit: number;
    type: TextureDataType;
};
export declare class GPUTexture implements GPUObjectHandle {
    protected readonly device: GPUDevice;
    readonly native: WebGLTexture;
    readonly w: number;
    readonly h: number;
    protected readonly type: TextureDataType;
    protected boundUnit: number;
    constructor(device: GPUDevice, native: WebGLTexture, w: number, h: number, type: TextureDataType);
    updateTextureData(level: number, format: TextureFormat, data: TexImageSource | ArrayBufferView, x?: number, y?: number, w?: number, h?: number): void;
    delete(): void;
}
export declare type GPUProgramInternal = {
    stateCache: {
        [key: string]: any;
    };
};
export declare class GPUProgram implements GPUObjectHandle {
    protected readonly device: GPUDevice;
    readonly id: number;
    readonly native: WebGLProgram;
    readonly vertexCode: string;
    readonly fragmentCode: string;
    readonly attributeLayout: AttributeLayout;
    readonly uniformInfo: {
        [name: string]: WebGLActiveInfo;
    };
    readonly uniformLocation: {
        [name: string]: WebGLUniformLocation;
    };
    protected stateCache: {
        [key: string]: any;
    };
    constructor(device: GPUDevice, id: number, native: WebGLProgram, vertexCode: string, fragmentCode: string, attributeLayout: AttributeLayout, uniformInfo: {
        [name: string]: WebGLActiveInfo;
    }, uniformLocation: {
        [name: string]: WebGLUniformLocation;
    });
    delete(): void;
}
export default GPUDevice;
declare class IdManager {
    protected minimize: boolean;
    top: number;
    availableIdQueue: number[];
    constructor(minimize: boolean);
    assign(): number;
    release(id: number): boolean;
    count(): number;
}
declare class ReferenceCountCache<T> {
    protected onZeroReferences: (value: T) => void;
    map: {
        [key: string]: {
            value: T;
            refs: number;
        };
    };
    constructor(onZeroReferences: (value: T) => void);
    add(key: string, value: T): void;
    reference(key: string): T | null;
    release(key: string): boolean;
}
