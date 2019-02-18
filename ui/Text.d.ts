import { GlyphLayout, GPUTextFont } from "gputext";
import { AttributeLayout, GPUDevice, GPUBuffer, GPUTexture } from "../rendering/GPUDevice";
import { DrawContext } from "../rendering/Renderer";
import { Object2D } from "./Object2D";
/**
 * Text
 *
 * Todo:
 * - Glow and shadow
 * - Bake color into vertices
 * - Vertex index buffer
 */
export declare class Text extends Object2D {
    string: string;
    fontPath: string;
    fontSizePx: number;
    strokeEnabled: boolean;
    color: ArrayLike<number>;
    strokeColor: ArrayLike<number>;
    opacity: number;
    /**
     * When additive blend factor is 1, the blend mode is additive, when 0, it's normal premultiplied alpha blended
     */
    additiveBlending: number;
    protected _string: string;
    protected _fontPath: string;
    protected _fontSizePx: number;
    protected _fontAsset: FontAsset;
    protected _glyphLayout: GlyphLayout;
    protected _kerningEnabled: boolean;
    protected _ligaturesEnabled: boolean;
    protected _strokeEnabled: boolean;
    protected _lineHeight: number;
    protected gpuVertexBuffer: GPUBuffer;
    protected glyphAtlas: GPUTexture;
    protected vertexCount: number;
    constructor(fontPath: string, string?: string, fontSizePx?: number, color?: ArrayLike<number>);
    allocateGPUResources(device: GPUDevice): void;
    releaseGPUResources(): void;
    draw(context: DrawContext): void;
    protected updateFontPath(): void;
    protected updateGlyphLayout(): void;
    static getFontAsset(path: string, onReady: (asset: FontAsset) => void, onError?: (msg: string) => void): void;
    protected static fontMap: {
        [path: string]: Promise<FontAsset>;
    };
    protected static fontCache: {
        [path: string]: FontAsset;
    };
    protected static attributeLayout: AttributeLayout;
}
declare type FontAsset = {
    descriptor: GPUTextFont;
    images: Array<Array<HTMLImageElement>>;
};
export default Text;
