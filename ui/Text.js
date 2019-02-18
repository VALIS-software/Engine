"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var gputext_1 = require("gputext");
var GPUDevice_1 = require("../rendering/GPUDevice");
var Renderer_1 = require("../rendering/Renderer");
var Object2D_1 = require("./Object2D");
var SharedResources_1 = require("./../SharedResources");
/**
 * Text
 *
 * Todo:
 * - Glow and shadow
 * - Bake color into vertices
 * - Vertex index buffer
 */
var Text = /** @class */ (function (_super) {
    __extends(Text, _super);
    function Text(fontPath, string, fontSizePx, color) {
        if (fontSizePx === void 0) { fontSizePx = 16; }
        if (color === void 0) { color = [0, 0, 0, 1]; }
        var _this = _super.call(this) || this;
        _this.color = [0, 0, 0, 1];
        _this.strokeColor = new Float32Array([1, 1, 1, 1]);
        _this.strokeWidthPx = 1.0;
        _this.opacity = 1;
        /**
         * When additive blend factor is 1, the blend mode is additive, when 0, it's normal premultiplied alpha blended
         */
        _this.additiveBlending = 0;
        _this._kerningEnabled = true;
        _this._ligaturesEnabled = true;
        _this._strokeEnabled = false;
        _this._lineHeight = 1.0;
        _this.vertexCount = 0;
        _this.blendMode = Renderer_1.BlendMode.PREMULTIPLIED_ALPHA;
        _this.transparent = true;
        // cannot allocate GPU resource until font asset is available
        _this.gpuResourcesNeedAllocate = false;
        // disable rendering initially, rendering will be enabled when the font assets are available and a glyph layout has been created
        _this.render = false;
        _this._fontSizePx = fontSizePx;
        _this.fontPath = fontPath;
        _this.string = string;
        _this.color = color;
        return _this;
    }
    Object.defineProperty(Text.prototype, "string", {
        get: function () {
            return this._string;
        },
        set: function (v) {
            v = v + ''; // ensure input is typed as a string
            var changed = this._string !== v;
            this._string = v;
            if (changed) {
                this.updateGlyphLayout();
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Text.prototype, "fontPath", {
        get: function () {
            return this._fontPath;
        },
        set: function (v) {
            var changed = this._fontPath !== v;
            this._fontPath = v;
            if (changed) {
                this.updateFontPath();
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Text.prototype, "fontSizePx", {
        get: function () {
            return this._fontSizePx;
        },
        set: function (v) {
            var changed = v !== this._fontSizePx;
            this._fontSizePx = v;
            if (changed) {
                this.updateGlyphLayout();
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Text.prototype, "strokeEnabled", {
        get: function () {
            return this._strokeEnabled;
        },
        set: function (v) {
            var changed = v !== this._strokeEnabled;
            this._strokeEnabled = v;
            if (changed) {
                this.gpuResourcesNeedAllocate = true;
            }
        },
        enumerable: true,
        configurable: true
    });
    Text.prototype.allocateGPUResources = function (device) {
        var programNeedsUpdate = false;
        if (this.gpuProgram == null || programNeedsUpdate) {
            this.gpuProgram = SharedResources_1.SharedResources.getProgram(device, "\n                #version 100\n\n                precision mediump float;\n\n                attribute vec2 position;\n                attribute vec3 uv;\n\n                uniform mat4 transform;\n                uniform float fieldRange;\n                uniform vec2 viewportSize;\n                uniform float glyphScale;\n\n                varying vec2 vUv;\n                varying float vFieldRangeDisplay_px;\n\n                void main() {\n                    vUv = uv.xy;\n\n                    // determine the field range in pixels when drawn to the framebuffer\n                    vec2 scale = abs(vec2(transform[0][0], transform[1][1])) * glyphScale;\n                    float atlasScale = uv.z;\n                    vFieldRangeDisplay_px = fieldRange * scale.y * (viewportSize.y * 0.5) / atlasScale;\n                    vFieldRangeDisplay_px = max(vFieldRangeDisplay_px, 1.0);\n\n                    // flip-y axis\n                    gl_Position = transform * vec4(vec2(position.x, -position.y) * glyphScale, 0.0, 1.0);\n                }\n                ", "\n                #version 100\n\n                precision mediump float;\n\n                uniform vec4 color;\n                " + (this._strokeEnabled ? "\n                uniform vec4 strokeColor;\n                uniform float strokeWidthPx;\n                " : "") + "\n                uniform float blendFactor;\n\n                uniform sampler2D glyphAtlas;\n                uniform mat4 transform;\n\n                varying vec2 vUv;\n                varying float vFieldRangeDisplay_px;\n\n                float median(float r, float g, float b) {\n                    return max(min(r, g), min(max(r, g), b));\n                }\n\n                void main() {\n                    vec3 sample = texture2D(glyphAtlas, vUv).rgb;\n\n                    float sigDist = median(sample.r, sample.g, sample.b);\n\n                    // spread field range over 1px for antialiasing\n                    float fillAlpha = clamp((sigDist - 0.5) * vFieldRangeDisplay_px + 0.5, 0.0, 1.0);\n                    gl_FragColor = vec4(color.rgb, blendFactor) * color.a * fillAlpha;\n\n                    " + (this.strokeEnabled ? "\n                    float strokeDistThreshold = clamp(strokeWidthPx * 2. / vFieldRangeDisplay_px, 0.0, 1.0);\n                    float strokeDistScale = 1. / (1.0 - strokeDistThreshold);\n                    float _offset = 0.5 / strokeDistScale;\n                    float strokeAlpha = clamp((sigDist - _offset) * vFieldRangeDisplay_px + _offset, 0.0, 1.0);\n\n                    gl_FragColor += vec4(strokeColor.rgb, blendFactor) * strokeColor.a * strokeAlpha * (1.0 - fillAlpha);\n                    " : "") + "\n                }\n                ", Text.attributeLayout);
        }
        // initialize atlas texture if not already created
        var textureKey = this._fontAsset.descriptor.metadata.postScriptName;
        // only support for 1 glyph page at the moment
        var mipmapsProvided = this._fontAsset.images[0].length > 1;
        this.glyphAtlas = SharedResources_1.SharedResources.getTexture(device, textureKey, {
            format: GPUDevice_1.TextureFormat.RGBA,
            generateMipmaps: !mipmapsProvided,
            mipmapData: this._fontAsset.images[0],
            dataType: GPUDevice_1.TextureDataType.UNSIGNED_BYTE,
            usageHint: GPUDevice_1.TextureUsageHint.LONG_LIFE,
            samplingParameters: {
                magFilter: GPUDevice_1.TextureMagFilter.LINEAR,
                minFilter: mipmapsProvided ? GPUDevice_1.TextureMinFilter.LINEAR_MIPMAP_LINEAR : GPUDevice_1.TextureMinFilter.LINEAR,
                wrapS: GPUDevice_1.TextureWrapMode.CLAMP_TO_EDGE,
                wrapT: GPUDevice_1.TextureWrapMode.CLAMP_TO_EDGE,
            },
            pixelStorage: {
                flipY: false,
                premultiplyAlpha: false,
                colorSpaceConversion: GPUDevice_1.ColorSpaceConversion.NONE,
            }
        });
        // re-create text vertex buffer
        var vertexData = gputext_1.default.generateVertexData(this._glyphLayout);
        this.vertexCount = vertexData.vertexCount;
        this.gpuVertexBuffer = device.createBuffer({
            data: vertexData.vertexArray,
            usageHint: GPUDevice_1.BufferUsageHint.STATIC
        });
        // re-create text vertex state
        this.gpuVertexState = device.createVertexState({
            attributeLayout: Text.attributeLayout,
            attributes: {
                // position
                'position': {
                    buffer: this.gpuVertexBuffer,
                    sourceColumns: vertexData.vertexLayout.position.elements,
                    offsetBytes: vertexData.vertexLayout.position.offsetBytes,
                    strideBytes: vertexData.vertexLayout.position.strideBytes,
                    normalize: false,
                },
                // uv
                'uv': {
                    buffer: this.gpuVertexBuffer,
                    sourceColumns: vertexData.vertexLayout.uv.elements,
                    offsetBytes: vertexData.vertexLayout.uv.offsetBytes,
                    strideBytes: vertexData.vertexLayout.uv.strideBytes,
                    normalize: false,
                }
            }
        });
    };
    Text.prototype.releaseGPUResources = function () {
        if (this.gpuVertexState != null) {
            this.gpuVertexState.delete();
            this.gpuVertexState = null;
        }
        if (this.gpuVertexBuffer != null) {
            this.gpuVertexBuffer.delete();
            this.gpuVertexBuffer = null;
        }
        this.vertexCount = 0;
    };
    Text.prototype.draw = function (context) {
        if (this.vertexCount <= 0)
            return;
        // renderPass/shader
        context.uniform2f('viewportSize', context.viewport.w, context.viewport.h);
        // font
        context.uniform1f('fieldRange', this._fontAsset.descriptor.fieldRange_px);
        context.uniformTexture2D('glyphAtlas', this.glyphAtlas);
        // text instance
        context.uniform1f('glyphScale', this._glyphLayout.glyphScale);
        context.uniform4f('color', this.color[0], this.color[1], this.color[2], this.color[3] * this.opacity);
        if (this.strokeEnabled) {
            context.uniform4f('strokeColor', this.strokeColor[0], this.strokeColor[1], this.strokeColor[2], this.strokeColor[3] * this.opacity);
            context.uniform1f('strokeWidthPx', this.strokeWidthPx);
        }
        context.uniform1f('blendFactor', 1.0 - this.additiveBlending);
        context.uniformMatrix4fv('transform', false, this.worldTransformMat4);
        context.draw(Renderer_1.DrawMode.TRIANGLES, this.vertexCount, 0);
    };
    Text.prototype.updateFontPath = function () {
        var _this = this;
        Text.getFontAsset(this._fontPath, function (asset) {
            _this._fontAsset = asset;
            _this.updateGlyphLayout();
        });
    };
    Text.prototype.updateGlyphLayout = function () {
        var glyphLayoutChanged = false;
        if (this._string != null && this._fontAsset != null) {
            // generate glyphScale from css font-size px
            // in browsers, font-size corresponds to the difference between typoAscender and typoDescender
            var font = this._fontAsset.descriptor;
            var typoDelta = font.typoAscender - font.typoDescender;
            var glyphScale = this._fontSizePx / typoDelta;
            // @! potential performance improvement:
            // if only the glyphScale changed they we can avoid GPU realloc by just changing this._glyphLayout.glyphScale
            var glyphScaleChanged = this._glyphLayout !== null ? this._glyphLayout.glyphScale !== glyphScale : true;
            this._glyphLayout = gputext_1.default.layout(this._string, this._fontAsset.descriptor, {
                glyphScale: glyphScale,
                lineHeight: this._lineHeight,
                ligaturesEnabled: this._ligaturesEnabled,
                kerningEnabled: this._kerningEnabled,
            });
            this.w = (this._glyphLayout.bounds.r - this._glyphLayout.bounds.l) * this._glyphLayout.glyphScale;
            this.h = (this._glyphLayout.bounds.b - this._glyphLayout.bounds.t) * this._glyphLayout.glyphScale;
            glyphLayoutChanged = true;
        }
        else {
            glyphLayoutChanged = this._glyphLayout !== null;
            this._glyphLayout = null;
            this.w = 0;
            this.h = 0;
        }
        if (glyphLayoutChanged) {
            this.eventEmitter.emit('glyphLayoutChanged');
        }
        // we're only able to render if we have a glyphLayout (and implicitly font assets)
        this.render = this._glyphLayout != null;
        // if the glyph layout has changed then the vertex data must be updated on the GPU
        this.gpuResourcesNeedAllocate = glyphLayoutChanged;
        // if the vertex data has changed, we need to reallocate the GPU resources
        // delete any existing resources
        if (this.gpuResourcesNeedAllocate) {
            this.releaseGPUResources();
        }
    };
    // Font loading and caching
    Text.getFontAsset = function (path, onReady, onError) {
        var cachedAsset = Text.fontCache[path];
        if (cachedAsset != null) {
            onReady(cachedAsset);
            return;
        }
        var promise = Text.fontMap[path];
        if (promise == null) {
            promise = Text.fontMap[path] = new Promise(function (resolve, reject) {
                // parse path
                var directory = path.substr(0, path.lastIndexOf('/'));
                var ext = path.substr(path.lastIndexOf('.') + 1).toLowerCase();
                var jsonFormat = ext === 'json';
                var descriptor;
                var images = new Array();
                var complete = false;
                loadDescriptor(path);
                function tryComplete() {
                    var e_1, _a, e_2, _b;
                    try {
                        for (var images_1 = __values(images), images_1_1 = images_1.next(); !images_1_1.done; images_1_1 = images_1.next()) {
                            var page = images_1_1.value;
                            try {
                                for (var page_1 = __values(page), page_1_1 = page_1.next(); !page_1_1.done; page_1_1 = page_1.next()) {
                                    var mip = page_1_1.value;
                                    if (!mip.complete)
                                        return;
                                }
                            }
                            catch (e_2_1) { e_2 = { error: e_2_1 }; }
                            finally {
                                try {
                                    if (page_1_1 && !page_1_1.done && (_b = page_1.return)) _b.call(page_1);
                                }
                                finally { if (e_2) throw e_2.error; }
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (images_1_1 && !images_1_1.done && (_a = images_1.return)) _a.call(images_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    if (descriptor == null)
                        return;
                    if (complete)
                        return;
                    var fontAsset = {
                        descriptor: descriptor,
                        images: images
                    };
                    complete = true;
                    Text.fontCache[path] = fontAsset;
                    resolve(fontAsset);
                }
                function loadDescriptor(path) {
                    var req = new XMLHttpRequest();
                    req.open('GET', path);
                    req.responseType = jsonFormat ? 'json' : 'arraybuffer';
                    req.onerror = function (e) { return reject("Could not load font " + path); };
                    req.onload = function (e) {
                        descriptor = jsonFormat ? req.response : parseDescriptorBuffer(req.response);
                        if (descriptor == null) {
                            reject("Failed to parse font");
                            return;
                        }
                        if (descriptor.textures.length > 1) {
                            console.warn('Multiple-page glyph atlases are not yet supported');
                        }
                        loadImages(descriptor.textures);
                        tryComplete();
                    };
                    req.send();
                }
                function loadImages(pages) {
                    for (var i = 0; i < pages.length; i++) {
                        var page = pages[i];
                        images[i] = new Array();
                        for (var j = 0; j < page.length; j++) {
                            var mipResource = page[j];
                            var image = void 0;
                            if (mipResource instanceof HTMLImageElement) {
                                image = mipResource;
                            }
                            else {
                                image = new Image();
                                image.src = directory + '/' + mipResource.localPath;
                            }
                            image.onload = tryComplete;
                            images[i][j] = image;
                        }
                    }
                    tryComplete();
                }
                function parseDescriptorBuffer(buffer) {
                    try {
                        return gputext_1.default.parse(buffer);
                    }
                    catch (e) {
                        reject("Error parsing binary GPUText file: " + e);
                        return null;
                    }
                }
            });
        }
        promise.catch(onError).then(onReady);
    };
    Text.fontMap = {};
    Text.fontCache = {};
    Text.attributeLayout = [
        { name: 'position', type: GPUDevice_1.AttributeType.VEC2 },
        { name: 'uv', type: GPUDevice_1.AttributeType.VEC3 },
    ];
    return Text;
}(Object2D_1.Object2D));
exports.Text = Text;
exports.default = Text;
