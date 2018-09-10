import { GPUDevice, AttributeLayout, AttributeType } from "../rendering/GPUDevice";
import { SharedResources } from "../SharedResources";
import { DrawContext, DrawMode } from "../rendering/Renderer";
import { Object2D } from "./Object2D";

/**
 * Rectangle UI element
 * 
 * Todo:
 * - Support rounded corners, stroke, glow & shadows, background shaders
 */
export class Rect extends Object2D {

    color = new Float32Array(4);
    blendFactor: number = 1;

    protected attributeLayout: AttributeLayout = [
        { name: 'position', type: AttributeType.VEC2 },
    ];

    constructor(w: number = 10, h: number = 10, color: ArrayLike<number> = [1, 0, 0, 1]) {
        super();
        this.render = true;
        this.w = w;
        this.h = h;
        this.color.set(color);
    }

    allocateGPUResources(device: GPUDevice) {
        this.gpuVertexState = SharedResources.quad1x1VertexState;
        this.gpuProgram = SharedResources.getProgram(
            device,
            this.getVertexCode(),
            this.getFragmentCode(),
            this.attributeLayout
        );
    }

    releaseGPUResources() {
        // since our resources are shared we don't actually want to release anything here
        this.gpuVertexState = null;
        this.gpuProgram = null;
    }

    draw(context: DrawContext) {
        context.uniform1f('blendFactor', this.blendFactor);
        context.uniform2f('size', this.computedWidth, this.computedHeight);
        context.uniformMatrix4fv('model', false, this.worldTransformMat4);
        context.uniform4f('color', this.color[0], this.color[1], this.color[2], this.color[3] * this.opacity);
        context.draw(DrawMode.TRIANGLES, 6, 0);
    }

    protected getVertexCode() {
        return `
            #version 100

            attribute vec2 position;
            uniform mat4 model;
            uniform vec2 size;

            varying vec2 vUv;

            void main() {
                vUv = position;
                gl_Position = model * vec4(position * size, 0., 1.0);
            }
        `;
    }

    protected getFragmentCode() {
        return `
            #version 100

            precision mediump float;
            varying vec2 vUv;

            uniform float blendFactor;
            uniform vec4 color;
            
            void main() {
                gl_FragColor = vec4(color.rgb, blendFactor) * color.a;
            }
        `;
    }

}

export default Rect;