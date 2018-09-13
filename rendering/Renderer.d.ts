/**
 * Dev Notes
 * - State grouping: Often we want hierarchical state - i.e, set viewport for this node _and_ all of its children
 */
import GPUDevice, { GPUDeviceInternal, GPUProgram, GPUTexture, GPUVertexState, AttributeLayout } from './GPUDevice';
import RenderPass from './RenderPass';
import { Renderable, RenderableInternal } from './Renderable';
export declare enum BlendMode {
    NONE = 0,
    /**
     * Premultiplied alpha provides improved alpha blending with the condition that the alpha is multiplied into the rgb channels
     *	`gl_FragColor = vec4(color.rgb * color.a, color.a)`
     *
     * This blend mode also provides additive blending when the alpha channel is set to 0
     * 	`gl_FragColor = vec4(color.rgb, 0);`
     */
    PREMULTIPLIED_ALPHA = 1
}
export declare enum DrawMode {
    POINTS,
    LINE_STRIP,
    LINE_LOOP,
    LINES,
    TRIANGLE_STRIP,
    TRIANGLE_FAN,
    TRIANGLES
}
export declare class Renderer {
    protected device: GPUDevice;
    protected deviceInternal: GPUDeviceInternal;
    protected gl: WebGLRenderingContext;
    protected extVao: null | OES_vertex_array_object;
    protected drawContext: DrawContext;
    readonly MAX_SAFE_MASKS: number;
    constructor(device: GPUDevice);
    private _masks;
    private _opaque;
    private _transparent;
    render(pass: RenderPass): void;
    protected renderArray(renderables: Array<Renderable<any>>): void;
    protected currentFramebuffer: number;
    protected currentProgramId: number;
    protected currentVertexStateId: number;
    protected currentBlendMode: number;
    protected currentStencilTestEnabled: number;
    protected currentMaskTestValue: number;
    protected currentVaoFallbackAttributeLayout: AttributeLayout;
    protected resetGLStateAssumptions(): void;
    protected setProgram(internal: RenderableInternal): void;
    protected setVertexState(internal: RenderableInternal): void;
    protected setBlendMode(blendMode: BlendMode): void;
    protected setMaskTest(enabled: boolean, maskValue: number): void;
    protected readonly stateSOffset: number;
    protected readonly stateSMask: number;
    protected readonly stateBOffset: number;
    protected readonly stateBMask: number;
    protected readonly stateMOffset: number;
    protected readonly stateMMask: number;
    readonly MAX_SHADERS: number;
    readonly MAX_BUFFERS: number;
    readonly MAX_BLEND_MODES: number;
    protected encodeRenderState(programId: number, vertexStateId: number, blendMode: number): number;
    protected decodeRenderState(bits: number): {
        programId: number;
        vertexStateId: number;
        blendMode: number;
    };
    protected decodeRenderStateBlendMode(bits: number): number;
}
export declare type DrawContextInternal = {
    gl: WebGLRenderingContext;
    program: GPUProgram;
    vertexState: GPUVertexState;
    viewport: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
};
export declare class DrawContext {
    protected readonly device: GPUDevice;
    protected readonly extInstanced: ANGLE_instanced_arrays;
    readonly gl: WebGLRenderingContext;
    readonly viewport: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    readonly program: GPUProgram;
    readonly vertexState: GPUVertexState;
    protected constructor(device: GPUDevice, extInstanced: ANGLE_instanced_arrays);
    uniform1f(name: string, x: GLfloat): void;
    uniform1fv(name: string, v: Float32Array): void;
    uniform1i(name: string, x: GLint): void;
    uniform1iv(name: string, v: Int32Array): void;
    uniform2f(name: string, x: GLfloat, y: GLfloat): void;
    uniform2fv(name: string, v: Float32Array): void;
    uniform2i(name: string, x: GLint, y: GLint): void;
    uniform2iv(name: string, v: Int32Array): void;
    uniform3f(name: string, x: GLfloat, y: GLfloat, z: GLfloat): void;
    uniform3fv(name: string, v: Float32Array): void;
    uniform3i(name: string, x: GLint, y: GLint, z: GLint): void;
    uniform3iv(name: string, v: Int32Array): void;
    uniform4f(name: string, x: GLfloat, y: GLfloat, z: GLfloat, w: GLfloat): void;
    uniform4fv(name: string, v: Float32Array): void;
    uniform4i(name: string, x: GLint, y: GLint, z: GLint, w: GLint): void;
    uniform4iv(name: string, v: Int32Array): void;
    uniformMatrix2fv(name: string, transpose: boolean, value: Float32Array): void;
    uniformMatrix3fv(name: string, transpose: boolean, value: Float32Array): void;
    uniformMatrix4fv(name: string, transpose: boolean, value: Float32Array): void;
    uniformTexture2D(name: string, texture: GPUTexture): void;
    /**
     * Draw, automatically accounting for vertex indexing
     */
    draw(mode: DrawMode, indexCount: number, indexOffset: number): void;
    /**
     * Draw instances, automatically accounting for vertex indexing
     */
    extDrawInstanced(mode: DrawMode, indexCount: number, indexOffset: number, primCount: number): void;
    static create(device: GPUDevice, extInstanced: ANGLE_instanced_arrays): DrawContext;
}
export default Renderer;
