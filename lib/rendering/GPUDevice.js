"use strict";
/**

Dev Notes:
- Should be dependency free, doesn't know about Renderer
- Should not have any public state; purely object management
- TextureManager
    "Performance problems have been observed on some implementations when using uniform1i to update sampler uniforms. To change the texture referenced by a sampler uniform, binding a new texture to the texture unit referenced by the uniform should be preferred over using uniform1i to update the uniform itself."

**/
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
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var _a, _b, _c, _d;
var GPUDevice = /** @class */ (function () {
    function GPUDevice(gl) {
        var _this = this;
        this.capabilities = {
            vertexArrayObjects: false,
            instancing: false,
            availableTextureUnits: 0,
        };
        this.vertexStateIds = new IdManager(true);
        this.programIds = new IdManager(true);
        this.vertexShaderCache = new ReferenceCountCache(function (shader) { return _this.gl.deleteShader(shader); });
        this.fragmentShaderCache = new ReferenceCountCache(function (shader) { return _this.gl.deleteShader(shader); });
        this.textureUnitUsageCounter = 0;
        this._programCount = 0;
        this._vertexStateCount = 0;
        this._bufferCount = 0;
        this._textureCount = 0;
        this.gl = gl;
        // the vertex array object extension makes controlling vertex state simpler and faster
        // however we fallback to normal vertex state handling when not available
        this.extVao = gl.getExtension('OES_vertex_array_object');
        this.extInstanced = gl.getExtension('ANGLE_instanced_arrays');
        var extDebugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        this.name = gl.getParameter(extDebugInfo == null ? gl.RENDERER : extDebugInfo.UNMASKED_RENDERER_WEBGL);
        var availableTextureUnits = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
        this.textureUnitState = new Array(availableTextureUnits);
        this.capabilities.vertexArrayObjects = this.extVao != null;
        this.capabilities.instancing = this.extInstanced != null;
        this.capabilities.availableTextureUnits = availableTextureUnits;
    }
    Object.defineProperty(GPUDevice.prototype, "programCount", {
        get: function () { return this._programCount; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GPUDevice.prototype, "vertexStateCount", {
        get: function () { return this._vertexStateCount; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GPUDevice.prototype, "bufferCount", {
        get: function () { return this._bufferCount; },
        enumerable: true,
        configurable: true
    });
    GPUDevice.prototype.createBuffer = function (bufferDescriptor) {
        var gl = this.gl;
        var b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, bufferDescriptor.data || bufferDescriptor.size, bufferDescriptor.usageHint || BufferUsageHint.STATIC);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        var bufferHandle = new GPUBuffer(this, b);
        this._bufferCount++;
        return bufferHandle;
    };
    /**
     * @throws string if index data requires UInt extension on a device that doesn't support it
     * @throws string if both dataType _and_ data are not set
     */
    GPUDevice.prototype.createIndexBuffer = function (indexBufferDescriptor) {
        var gl = this.gl;
        // determine index data type from data array type
        var dataType = indexBufferDescriptor.dataType;
        if (dataType == null) {
            if (indexBufferDescriptor.data != null) {
                switch (indexBufferDescriptor.data.BYTES_PER_ELEMENT) {
                    case 1:
                        dataType = IndexDataType.UNSIGNED_BYTE;
                        break;
                    case 2:
                        dataType = IndexDataType.UNSIGNED_SHORT;
                        break;
                    case 4:
                        dataType = IndexDataType.UNSIGNED_INT;
                        break;
                    // @! UNSIGNED_INT requires extension, should enable when required and fallback to re-interpreting as UNSIGNED_SHORT
                }
            }
            else {
                throw 'dataType field is required if data is not set';
            }
        }
        if (dataType == IndexDataType.UNSIGNED_INT) {
            var uintExt = gl.getExtension('OES_element_index_uint');
            if (uintExt == null) {
                throw 'OES_element_index_uint is required but unavailable';
            }
        }
        var b = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexBufferDescriptor.data || indexBufferDescriptor.size, indexBufferDescriptor.usageHint || BufferUsageHint.STATIC);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        var bufferHandle = new GPUIndexBuffer(this, b, dataType);
        this._bufferCount++;
        return bufferHandle;
    };
    GPUDevice.prototype.updateBufferData = function (handle, data, offsetBytes) {
        if (offsetBytes === void 0) { offsetBytes = 0; }
        var gl = this.gl;
        var target = handle instanceof GPUIndexBuffer ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;
        this.gl.bindBuffer(target, handle.native);
        this.gl.bufferSubData(target, offsetBytes, data);
        this.gl.bindBuffer(target, null);
    };
    GPUDevice.prototype.deleteBuffer = function (handle) {
        this.gl.deleteBuffer(handle.native);
        this._bufferCount--;
    };
    GPUDevice.prototype.createVertexState = function (vertexStateDescriptor) {
        var gl = this.gl;
        var extVao = this.extVao;
        var indexDataType = vertexStateDescriptor.indexBuffer != null ? vertexStateDescriptor.indexBuffer.dataType : null;
        var vaoSupported = extVao != null;
        var vertexStateHandle;
        if (vaoSupported) {
            var vao = extVao.createVertexArrayOES();
            extVao.bindVertexArrayOES(vao);
            this.applyVertexStateDescriptor(vertexStateDescriptor);
            extVao.bindVertexArrayOES(null);
            vertexStateHandle = new GPUVertexState(this, this.vertexStateIds.assign(), vao, vertexStateDescriptor.attributeLayout, indexDataType);
        }
        else {
            // when VAO is not supported, pass in the descriptor so vertex state can be applied when rendering
            vertexStateHandle = new GPUVertexState(this, this.vertexStateIds.assign(), null, vertexStateDescriptor.attributeLayout, indexDataType);
            vertexStateHandle._vaoFallbackDescriptor = vertexStateDescriptor;
        }
        this._vertexStateCount++;
        return vertexStateHandle;
    };
    GPUDevice.prototype.deleteVertexState = function (handle) {
        if (this.extVao != null) {
            this.extVao.deleteVertexArrayOES(handle.native);
        }
        this.vertexStateIds.release(handle.id);
        this._vertexStateCount--;
    };
    GPUDevice.prototype.createTexture = function (textureDescriptor) {
        var gl = this.gl;
        var t = gl.createTexture();
        var freeUnit = this.assignTextureUnit();
        gl.activeTexture(gl.TEXTURE0 + freeUnit);
        gl.bindTexture(gl.TEXTURE_2D, t);
        // sampling parameters
        var samplingParameters = __assign({ magFilter: TextureMagFilter.LINEAR, minFilter: TextureMagFilter.LINEAR, wrapT: TextureWrapMode.CLAMP_TO_EDGE, wrapS: TextureWrapMode.CLAMP_TO_EDGE }, textureDescriptor.samplingParameters);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, samplingParameters.magFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, samplingParameters.minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, samplingParameters.wrapS);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, samplingParameters.wrapT);
        // set _global_ data upload parameters
        var pixelStorageParameters = __assign({ packAlignment: 4, unpackAlignment: 4, flipY: false, premultiplyAlpha: false, colorSpaceConversion: ColorSpaceConversion.DEFAULT }, textureDescriptor.pixelStorage);
        gl.pixelStorei(gl.PACK_ALIGNMENT, pixelStorageParameters.packAlignment);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, pixelStorageParameters.unpackAlignment);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, pixelStorageParameters.flipY);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, pixelStorageParameters.premultiplyAlpha);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, pixelStorageParameters.colorSpaceConversion);
        // upload data if supplied
        if (textureDescriptor.mipmapData != null) {
            for (var i = 0; i < textureDescriptor.mipmapData.length; i++) {
                var data = textureDescriptor.mipmapData[i];
                var mipScale = 1 / (1 << i);
                if (ArrayBuffer.isView(data)) {
                    gl.texImage2D(gl.TEXTURE_2D, i, textureDescriptor.format, Math.round(textureDescriptor.width / mipScale), Math.round(textureDescriptor.height / mipScale), 0, textureDescriptor.format, textureDescriptor.dataType, data);
                }
                else {
                    gl.texImage2D(gl.TEXTURE_2D, i, textureDescriptor.format, textureDescriptor.format, textureDescriptor.dataType, data);
                }
            }
        }
        else {
            // allocate empty texture
            gl.texImage2D(gl.TEXTURE_2D, 0, textureDescriptor.format, textureDescriptor.width, textureDescriptor.height, 0, textureDescriptor.format, textureDescriptor.dataType, null);
        }
        if (textureDescriptor.generateMipmaps) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        // determine allocated size
        var allocatedWidth;
        var allocatedHeight;
        if (textureDescriptor.mipmapData !== null) {
            var data = textureDescriptor.mipmapData[0];
            if (ArrayBuffer.isView(data)) {
                allocatedWidth = textureDescriptor.width;
                allocatedHeight = textureDescriptor.height;
            }
            else {
                allocatedWidth = data.width;
                allocatedHeight = data.height;
            }
        }
        else {
            allocatedWidth = textureDescriptor.width;
            allocatedHeight = textureDescriptor.height;
        }
        // let usageHint = textureDescriptor.usageHint == null ? TextureUsageHint.UNKNOWN : textureDescriptor.usageHint;
        var handle = new GPUTexture(this, t, allocatedWidth, allocatedHeight, textureDescriptor.dataType);
        // update texture unit state
        var handleInternal = handle;
        handleInternal.boundUnit = freeUnit;
        this.textureUnitState[freeUnit] = {
            usageMetric: ++this.textureUnitUsageCounter,
            texture: handle,
        };
        this._textureCount++;
        return handle;
    };
    GPUDevice.prototype.updateTextureData = function (handle, level, format, data, x, y, w, h) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        if (w === void 0) { w = handle.w; }
        if (h === void 0) { h = handle.h; }
        var gl = this.gl;
        var handleInternal = handle;
        this.bindTexture(handle);
        if (ArrayBuffer.isView(data)) {
            gl.texSubImage2D(gl.TEXTURE_2D, level, x, y, w, h, format, handleInternal.type, data);
        }
        else {
            gl.texSubImage2D(gl.TEXTURE_2D, level, x, y, format, handleInternal.type, data);
        }
    };
    GPUDevice.prototype.deleteTexture = function (handle) {
        var gl = this.gl;
        // if texture is bound to a texture unit, unbind it and free the unit
        var handleInternal = handle;
        if (handleInternal.boundUnit !== -1) {
            this.clearTextureUnit(handleInternal.boundUnit);
        }
        gl.deleteTexture(handle.native);
        this._textureCount--;
    };
    /**
     * @throws string if shaders cannot be compiled or program cannot be linked
     */
    GPUDevice.prototype.createProgram = function (vertexCode, fragmentCode, attributeLayout) {
        var gl = this.gl;
        var vs = this.vertexShaderCache.reference(vertexCode);
        var fs = this.fragmentShaderCache.reference(fragmentCode);
        if (vs == null) {
            vs = this.compileShader(vertexCode, gl.VERTEX_SHADER);
            this.vertexShaderCache.add(vertexCode, vs);
        }
        if (fs == null) {
            fs = this.compileShader(fragmentCode, gl.FRAGMENT_SHADER);
            this.fragmentShaderCache.add(fragmentCode, fs);
        }
        var p = gl.createProgram();
        gl.attachShader(p, vs);
        gl.attachShader(p, fs);
        // set attribute bindings (before linking)
        // see applyVertexStateDescriptor() for corresponding layout handling
        var attributeRow = 0;
        for (var i = 0; i < attributeLayout.length; i++) {
            var attribute = attributeLayout[i];
            // how many elements are stored in this type?
            var typeLength = exports.shaderTypeLength[attribute.type];
            // determine how many rows this attribute will cover
            // e.g. float -> 1, vec4 -> 1, mat2 -> 2
            var attributeRowSpan = exports.shaderTypeRows[attribute.type];
            // "It is permissible to bind a generic attribute index to an attribute variable name that is never used in a vertex shader."
            // this enables us to have consistent attribute layouts between shaders
            // if attributeRowSpan > 1, the other rows are automatically bound
            gl.bindAttribLocation(p, attributeRow, attribute.name);
            attributeRow += attributeRowSpan;
        }
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            throw "[program link]: " + gl.getProgramInfoLog(p);
        }
        // read all active uniform locations and cache them for later
        var uniformCount = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
        var uniformInfo = {};
        var uniformLocation = {};
        for (var i = 0; i < uniformCount; i++) {
            var info = gl.getActiveUniform(p, i);
            uniformInfo[info.name] = info;
            uniformLocation[info.name] = gl.getUniformLocation(p, info.name);
        }
        var programHandle = new GPUProgram(this, this.programIds.assign(), p, vertexCode, fragmentCode, attributeLayout, uniformInfo, uniformLocation);
        this._programCount++;
        return programHandle;
    };
    GPUDevice.prototype.deleteProgram = function (handle) {
        this.gl.deleteProgram(handle.native);
        this.vertexShaderCache.release(handle.vertexCode);
        this.fragmentShaderCache.release(handle.fragmentCode);
        this.programIds.release(handle.id);
        this._programCount--;
    };
    GPUDevice.prototype.compileShader = function (code, type) {
        var gl = this.gl;
        var s = gl.createShader(type);
        gl.shaderSource(s, code);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            var typename = null;
            switch (type) {
                case gl.VERTEX_SHADER:
                    typename = 'vertex';
                    break;
                case gl.FRAGMENT_SHADER:
                    typename = 'fragment';
                    break;
            }
            throw "[" + typename + " compile]: " + gl.getShaderInfoLog(s);
        }
        return s;
    };
    GPUDevice.prototype.applyVertexStateDescriptor = function (vertexStateDescriptor) {
        var gl = this.gl;
        // set index
        if (vertexStateDescriptor.indexBuffer != null) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexStateDescriptor.indexBuffer.native);
        }
        else {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        }
        // set attributes
        // some attributes may span more than 1 attribute row (a vec4) so we track the current attribute row so attributes are packed sequentially
        var attributeRow = 0;
        for (var i = 0; i < vertexStateDescriptor.attributeLayout.length; i++) {
            var _a = vertexStateDescriptor.attributeLayout[i], name_1 = _a.name, type = _a.type;
            // how many elements are stored in this type?
            var typeLength = exports.shaderTypeLength[type];
            // determine how many rows this attribute will cover
            // e.g. float -> 1, vec4 -> 1, mat2 -> 2, mat4 -> 4
            var attributeRowSpan = exports.shaderTypeRows[type];
            // determine number of generic attribute columns this type requires (from 1 - 4)
            // 1, 2, 3, 4, 9, 16 -> 1, 2, 3, 4, 3, 4
            var typeColumns = typeLength / attributeRowSpan;
            // get the attribute assignment for this name (may be null or undefined)
            var vertexAttribute = vertexStateDescriptor.attributes[name_1];
            if (vertexAttribute != null) {
                // if .buffer is set then assume it's a VertexAttributeBuffer
                if (vertexAttribute.buffer !== undefined) {
                    var attributeBuffer = vertexAttribute;
                    var sourceDataType = attributeBuffer.sourceDataType;
                    if (sourceDataType == null) {
                        // assume source type is FLOAT (in WebGL1 all shader generic attributes are required to be floats)
                        sourceDataType = VertexAttributeSourceType.FLOAT;
                    }
                    gl.bindBuffer(gl.ARRAY_BUFFER, attributeBuffer.buffer.native);
                    // set all attribute arrays
                    for (var r = 0; r < attributeRowSpan; r++) {
                        var row = attributeRow + r;
                        // assume the data is formatted with columns that match the attribute type, but allow override with .sourceColumns field
                        var sourceColumns = attributeBuffer.sourceColumns != null ? attributeBuffer.sourceColumns : typeColumns;
                        // column offset for this attribute row
                        // this is only non-zero for matrix types
                        var columnBytesOffset = (r * sourceColumns * exports.dataTypeByteLength[sourceDataType]);
                        // console.log('enableVertexAttribArray', row);
                        gl.enableVertexAttribArray(row);
                        gl.vertexAttribPointer(row, sourceColumns, sourceDataType, !!attributeBuffer.normalize, attributeBuffer.strideBytes, 
                        // offset of attribute row
                        attributeBuffer.offsetBytes + columnBytesOffset);
                        if (this.extInstanced) {
                            // we should make sure to set vertexAttribDivisorANGLE even if 0, so that if we're altering global state we don't run into issues
                            // this helps ensure we can applyVertexStateDescriptor even when VAOs are unavailable
                            this.extInstanced.vertexAttribDivisorANGLE(row, attributeBuffer.instanceDivisor != null ? attributeBuffer.instanceDivisor : 0);
                        }
                    }
                }
                else {
                    // constant value attribute
                    var attributeConstant = vertexAttribute;
                    if (attributeRowSpan === 1) {
                        // slightly faster path for most common case
                        gl.disableVertexAttribArray(attributeRow);
                        gl.vertexAttrib4fv(attributeRow, attributeConstant.data);
                    }
                    else {
                        for (var r = 0; r < attributeRowSpan; r++) {
                            gl.disableVertexAttribArray(attributeRow + r);
                            gl.vertexAttrib4fv(attributeRow + r, attributeConstant.data.subarray(r * 4, (r * 4) + 4));
                        }
                    }
                }
            }
            else {
                // set attribute value to constant 0s
                for (var r = 0; r < attributeRowSpan; r++) {
                    gl.disableVertexAttribArray(attributeRow + r);
                    gl.vertexAttrib4f(attributeRow + r, 0, 0, 0, 0);
                }
            }
            attributeRow += attributeRowSpan;
        }
    };
    GPUDevice.prototype.assignTextureUnit = function () {
        // console.debug(`%cassignTextureUnit`, 'color: blue');
        // return the first free texture unit
        var minUsageMetric = Infinity;
        var minUsageUnitIndex = undefined;
        for (var i = 0; i < this.textureUnitState.length; i++) {
            var unit = this.textureUnitState[i];
            if (unit === undefined) {
                // console.debug(`%c\tfound free ${i}`, 'color: blue');
                return i;
            }
            if (unit.usageMetric < minUsageMetric) {
                minUsageUnitIndex = i;
                minUsageMetric = unit.usageMetric;
            }
        }
        // at this point we know no texture units are empty, so instead we pick a unit to empty
        // the best units to empty are ones in which their textures haven't been used recently
        // hinting can override this behavior
        // console.debug(`%c\tclearing ${minUsageUnitIndex}`, 'color: blue');
        this.clearTextureUnit(minUsageUnitIndex);
        return minUsageUnitIndex;
    };
    GPUDevice.prototype.bindTexture = function (handle) {
        var gl = this.gl;
        var handleInternal = handle;
        if (handleInternal.boundUnit === -1) {
            var freeUnit = this.assignTextureUnit();
            gl.activeTexture(gl.TEXTURE0 + freeUnit);
            gl.bindTexture(gl.TEXTURE_2D, handle.native);
            handleInternal.boundUnit = freeUnit;
            this.textureUnitState[freeUnit] = {
                usageMetric: ++this.textureUnitUsageCounter,
                texture: handle,
            };
        }
        else {
            gl.activeTexture(gl.TEXTURE0 + handleInternal.boundUnit);
            gl.bindTexture(gl.TEXTURE_2D, handle.native);
            this.textureUnitState[handleInternal.boundUnit].usageMetric = ++this.textureUnitUsageCounter;
        }
    };
    GPUDevice.prototype.clearTextureUnit = function (unit) {
        // console.debug(`%cclearTextureUnit ${unit}`, 'color: blue');
        var gl = this.gl;
        var texture = this.textureUnitState[unit].texture;
        var textureInternal = texture;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, null);
        this.textureUnitState[unit] = undefined;
        if (texture !== undefined) {
            textureInternal.boundUnit = -1;
        }
    };
    GPUDevice.prototype.markTextureUsage = function (handle) {
        var handleInternal = handle;
        this.textureUnitState[handleInternal.boundUnit].usageMetric = ++this.textureUnitUsageCounter;
    };
    return GPUDevice;
}());
exports.GPUDevice = GPUDevice;
// Object Descriptors
var IndexDataType;
(function (IndexDataType) {
    IndexDataType[IndexDataType["UNSIGNED_BYTE"] = WebGLRenderingContext.UNSIGNED_BYTE] = "UNSIGNED_BYTE";
    IndexDataType[IndexDataType["UNSIGNED_SHORT"] = WebGLRenderingContext.UNSIGNED_SHORT] = "UNSIGNED_SHORT";
    IndexDataType[IndexDataType["UNSIGNED_INT"] = WebGLRenderingContext.UNSIGNED_INT] = "UNSIGNED_INT";
})(IndexDataType = exports.IndexDataType || (exports.IndexDataType = {}));
var VertexAttributeSourceType;
(function (VertexAttributeSourceType) {
    VertexAttributeSourceType[VertexAttributeSourceType["BYTE"] = WebGLRenderingContext.BYTE] = "BYTE";
    VertexAttributeSourceType[VertexAttributeSourceType["SHORT"] = WebGLRenderingContext.SHORT] = "SHORT";
    VertexAttributeSourceType[VertexAttributeSourceType["UNSIGNED_BYTE"] = WebGLRenderingContext.UNSIGNED_BYTE] = "UNSIGNED_BYTE";
    VertexAttributeSourceType[VertexAttributeSourceType["UNSIGNED_SHORT"] = WebGLRenderingContext.UNSIGNED_SHORT] = "UNSIGNED_SHORT";
    VertexAttributeSourceType[VertexAttributeSourceType["FLOAT"] = WebGLRenderingContext.FLOAT] = "FLOAT";
    // WebGL2 HALF_FLOAT
})(VertexAttributeSourceType = exports.VertexAttributeSourceType || (exports.VertexAttributeSourceType = {}));
var BufferUsageHint;
(function (BufferUsageHint) {
    BufferUsageHint[BufferUsageHint["STREAM"] = WebGLRenderingContext.STREAM_DRAW] = "STREAM";
    BufferUsageHint[BufferUsageHint["STATIC"] = WebGLRenderingContext.STATIC_DRAW] = "STATIC";
    BufferUsageHint[BufferUsageHint["DYNAMIC"] = WebGLRenderingContext.DYNAMIC_DRAW] = "DYNAMIC";
})(BufferUsageHint = exports.BufferUsageHint || (exports.BufferUsageHint = {}));
var UniformType;
(function (UniformType) {
    UniformType[UniformType["FLOAT"] = WebGLRenderingContext.FLOAT] = "FLOAT";
    UniformType[UniformType["VEC2"] = WebGLRenderingContext.FLOAT_VEC2] = "VEC2";
    UniformType[UniformType["VEC3"] = WebGLRenderingContext.FLOAT_VEC3] = "VEC3";
    UniformType[UniformType["VEC4"] = WebGLRenderingContext.FLOAT_VEC4] = "VEC4";
    UniformType[UniformType["IVEC2"] = WebGLRenderingContext.INT_VEC2] = "IVEC2";
    UniformType[UniformType["IVEC3"] = WebGLRenderingContext.INT_VEC3] = "IVEC3";
    UniformType[UniformType["IVEC4"] = WebGLRenderingContext.INT_VEC4] = "IVEC4";
    UniformType[UniformType["BOOL"] = WebGLRenderingContext.BOOL] = "BOOL";
    UniformType[UniformType["BVEC2"] = WebGLRenderingContext.BOOL_VEC2] = "BVEC2";
    UniformType[UniformType["BVEC3"] = WebGLRenderingContext.BOOL_VEC3] = "BVEC3";
    UniformType[UniformType["BVEC4"] = WebGLRenderingContext.BOOL_VEC4] = "BVEC4";
    UniformType[UniformType["MAT2"] = WebGLRenderingContext.FLOAT_MAT2] = "MAT2";
    UniformType[UniformType["MAT3"] = WebGLRenderingContext.FLOAT_MAT3] = "MAT3";
    UniformType[UniformType["MAT4"] = WebGLRenderingContext.FLOAT_MAT4] = "MAT4";
    UniformType[UniformType["SAMPLER_2D"] = WebGLRenderingContext.SAMPLER_2D] = "SAMPLER_2D";
    UniformType[UniformType["SAMPLER_CUBE"] = WebGLRenderingContext.SAMPLER_CUBE] = "SAMPLER_CUBE";
})(UniformType = exports.UniformType || (exports.UniformType = {}));
// subset of UniformType
var AttributeType;
(function (AttributeType) {
    AttributeType[AttributeType["FLOAT"] = WebGLRenderingContext.FLOAT] = "FLOAT";
    AttributeType[AttributeType["VEC2"] = WebGLRenderingContext.FLOAT_VEC2] = "VEC2";
    AttributeType[AttributeType["VEC3"] = WebGLRenderingContext.FLOAT_VEC3] = "VEC3";
    AttributeType[AttributeType["VEC4"] = WebGLRenderingContext.FLOAT_VEC4] = "VEC4";
    AttributeType[AttributeType["MAT2"] = WebGLRenderingContext.FLOAT_MAT2] = "MAT2";
    AttributeType[AttributeType["MAT3"] = WebGLRenderingContext.FLOAT_MAT3] = "MAT3";
    AttributeType[AttributeType["MAT4"] = WebGLRenderingContext.FLOAT_MAT4] = "MAT4";
})(AttributeType = exports.AttributeType || (exports.AttributeType = {}));
var TextureDataType;
(function (TextureDataType) {
    TextureDataType[TextureDataType["UNSIGNED_BYTE"] = WebGLRenderingContext.UNSIGNED_BYTE] = "UNSIGNED_BYTE";
    TextureDataType[TextureDataType["UNSIGNED_SHORT_5_6_5"] = WebGLRenderingContext.UNSIGNED_SHORT_5_6_5] = "UNSIGNED_SHORT_5_6_5";
    TextureDataType[TextureDataType["UNSIGNED_SHORT_4_4_4_4"] = WebGLRenderingContext.UNSIGNED_SHORT_4_4_4_4] = "UNSIGNED_SHORT_4_4_4_4";
    TextureDataType[TextureDataType["UNSIGNED_SHORT_5_5_5_1"] = WebGLRenderingContext.UNSIGNED_SHORT_5_5_5_1] = "UNSIGNED_SHORT_5_5_5_1";
    TextureDataType[TextureDataType["FLOAT"] = WebGLRenderingContext.FLOAT] = "FLOAT";
    // Extension HALF_FLOAT = 
})(TextureDataType = exports.TextureDataType || (exports.TextureDataType = {}));
var TextureFormat;
(function (TextureFormat) {
    TextureFormat[TextureFormat["ALPHA"] = WebGLRenderingContext.ALPHA] = "ALPHA";
    TextureFormat[TextureFormat["RGB"] = WebGLRenderingContext.RGB] = "RGB";
    TextureFormat[TextureFormat["RGBA"] = WebGLRenderingContext.RGBA] = "RGBA";
    TextureFormat[TextureFormat["LUMINANCE"] = WebGLRenderingContext.LUMINANCE] = "LUMINANCE";
    TextureFormat[TextureFormat["LUMINANCE_ALPHA"] = WebGLRenderingContext.LUMINANCE_ALPHA] = "LUMINANCE_ALPHA";
    // @! should include compressed texture formats from extensions
})(TextureFormat = exports.TextureFormat || (exports.TextureFormat = {}));
var ColorSpaceConversion;
(function (ColorSpaceConversion) {
    ColorSpaceConversion[ColorSpaceConversion["NONE"] = WebGLRenderingContext.NONE] = "NONE";
    ColorSpaceConversion[ColorSpaceConversion["DEFAULT"] = WebGLRenderingContext.BROWSER_DEFAULT_WEBGL] = "DEFAULT";
})(ColorSpaceConversion = exports.ColorSpaceConversion || (exports.ColorSpaceConversion = {}));
var TextureMagFilter;
(function (TextureMagFilter) {
    TextureMagFilter[TextureMagFilter["NEAREST"] = WebGLRenderingContext.NEAREST] = "NEAREST";
    TextureMagFilter[TextureMagFilter["LINEAR"] = WebGLRenderingContext.LINEAR] = "LINEAR";
})(TextureMagFilter = exports.TextureMagFilter || (exports.TextureMagFilter = {}));
var TextureMinFilter;
(function (TextureMinFilter) {
    TextureMinFilter[TextureMinFilter["NEAREST"] = WebGLRenderingContext.NEAREST] = "NEAREST";
    TextureMinFilter[TextureMinFilter["LINEAR"] = WebGLRenderingContext.LINEAR] = "LINEAR";
    TextureMinFilter[TextureMinFilter["NEAREST_MIPMAP_NEAREST"] = WebGLRenderingContext.NEAREST_MIPMAP_NEAREST] = "NEAREST_MIPMAP_NEAREST";
    TextureMinFilter[TextureMinFilter["LINEAR_MIPMAP_NEAREST"] = WebGLRenderingContext.LINEAR_MIPMAP_NEAREST] = "LINEAR_MIPMAP_NEAREST";
    TextureMinFilter[TextureMinFilter["NEAREST_MIPMAP_LINEAR"] = WebGLRenderingContext.NEAREST_MIPMAP_LINEAR] = "NEAREST_MIPMAP_LINEAR";
    TextureMinFilter[TextureMinFilter["LINEAR_MIPMAP_LINEAR"] = WebGLRenderingContext.LINEAR_MIPMAP_LINEAR] = "LINEAR_MIPMAP_LINEAR";
})(TextureMinFilter = exports.TextureMinFilter || (exports.TextureMinFilter = {}));
var TextureWrapMode;
(function (TextureWrapMode) {
    TextureWrapMode[TextureWrapMode["REPEAT"] = WebGLRenderingContext.REPEAT] = "REPEAT";
    TextureWrapMode[TextureWrapMode["CLAMP_TO_EDGE"] = WebGLRenderingContext.CLAMP_TO_EDGE] = "CLAMP_TO_EDGE";
    TextureWrapMode[TextureWrapMode["MIRRORED_REPEAT"] = WebGLRenderingContext.MIRRORED_REPEAT] = "MIRRORED_REPEAT";
})(TextureWrapMode = exports.TextureWrapMode || (exports.TextureWrapMode = {}));
var TextureUsageHint;
(function (TextureUsageHint) {
    TextureUsageHint[TextureUsageHint["LONG_LIFE"] = 1] = "LONG_LIFE";
    TextureUsageHint[TextureUsageHint["TRANSIENT"] = 0] = "TRANSIENT";
})(TextureUsageHint = exports.TextureUsageHint || (exports.TextureUsageHint = {}));
// Data Tables
exports.shaderTypeLength = (_a = {},
    _a[UniformType.FLOAT] = 1,
    _a[UniformType.VEC2] = 2,
    _a[UniformType.VEC3] = 3,
    _a[UniformType.VEC4] = 4,
    _a[UniformType.IVEC2] = 1,
    _a[UniformType.IVEC3] = 2,
    _a[UniformType.IVEC4] = 3,
    _a[UniformType.BOOL] = 1,
    _a[UniformType.BVEC2] = 2,
    _a[UniformType.BVEC3] = 3,
    _a[UniformType.BVEC4] = 4,
    _a[UniformType.MAT2] = 2 * 2,
    _a[UniformType.MAT3] = 3 * 3,
    _a[UniformType.MAT4] = 4 * 4,
    _a);
exports.shaderTypeRows = (_b = {},
    _b[UniformType.FLOAT] = 1,
    _b[UniformType.VEC2] = 1,
    _b[UniformType.VEC3] = 1,
    _b[UniformType.VEC4] = 1,
    _b[UniformType.IVEC2] = 1,
    _b[UniformType.IVEC3] = 1,
    _b[UniformType.IVEC4] = 1,
    _b[UniformType.BOOL] = 1,
    _b[UniformType.BVEC2] = 1,
    _b[UniformType.BVEC3] = 1,
    _b[UniformType.BVEC4] = 1,
    _b[UniformType.MAT2] = 2,
    _b[UniformType.MAT3] = 3,
    _b[UniformType.MAT4] = 4,
    _b);
exports.shaderTypeColumns = (_c = {},
    _c[UniformType.FLOAT] = 1,
    _c[UniformType.VEC2] = 2,
    _c[UniformType.VEC3] = 3,
    _c[UniformType.VEC4] = 4,
    _c[UniformType.IVEC2] = 2,
    _c[UniformType.IVEC3] = 3,
    _c[UniformType.IVEC4] = 4,
    _c[UniformType.BOOL] = 1,
    _c[UniformType.BVEC2] = 2,
    _c[UniformType.BVEC3] = 3,
    _c[UniformType.BVEC4] = 4,
    _c[UniformType.MAT2] = 2,
    _c[UniformType.MAT3] = 3,
    _c[UniformType.MAT4] = 4,
    _c);
exports.dataTypeByteLength = (_d = {},
    _d[WebGLRenderingContext.BYTE] = 1,
    _d[WebGLRenderingContext.UNSIGNED_BYTE] = 1,
    _d[WebGLRenderingContext.SHORT] = 2,
    _d[WebGLRenderingContext.UNSIGNED_SHORT] = 2,
    _d[WebGLRenderingContext.INT] = 4,
    _d[WebGLRenderingContext.UNSIGNED_INT] = 4,
    _d[WebGLRenderingContext.FLOAT] = 4,
    _d);
var GPUBuffer = /** @class */ (function () {
    function GPUBuffer(device, native) {
        this.device = device;
        this.native = native;
    }
    GPUBuffer.prototype.updateBufferData = function (data, offsetBytes) {
        if (offsetBytes === void 0) { offsetBytes = 0; }
        this.device.updateBufferData(this, data, offsetBytes);
    };
    GPUBuffer.prototype.delete = function () {
        this.device.deleteBuffer(this);
    };
    return GPUBuffer;
}());
exports.GPUBuffer = GPUBuffer;
var GPUIndexBuffer = /** @class */ (function (_super) {
    __extends(GPUIndexBuffer, _super);
    function GPUIndexBuffer(device, native, dataType) {
        var _this = _super.call(this, device, native) || this;
        _this.dataType = dataType;
        return _this;
    }
    return GPUIndexBuffer;
}(GPUBuffer));
exports.GPUIndexBuffer = GPUIndexBuffer;
var GPUVertexState = /** @class */ (function () {
    function GPUVertexState(device, id, native, attributeLayout, indexType) {
        this.device = device;
        this.id = id;
        this.native = native;
        this.attributeLayout = attributeLayout;
        this.indexType = indexType;
    }
    GPUVertexState.prototype.delete = function () {
        this.device.deleteVertexState(this);
    };
    return GPUVertexState;
}());
exports.GPUVertexState = GPUVertexState;
var GPUTexture = /** @class */ (function () {
    function GPUTexture(device, native, w, h, type) {
        this.device = device;
        this.native = native;
        this.w = w;
        this.h = h;
        this.type = type;
        this.boundUnit = -1;
    }
    GPUTexture.prototype.updateTextureData = function (level, format, data, x, y, w, h) {
        this.device.updateTextureData(this, level, format, data, x, y, w, h);
    };
    GPUTexture.prototype.delete = function () {
        this.device.deleteTexture(this);
    };
    return GPUTexture;
}());
exports.GPUTexture = GPUTexture;
var GPUProgram = /** @class */ (function () {
    function GPUProgram(device, id, native, vertexCode, fragmentCode, attributeLayout, uniformInfo, uniformLocation) {
        this.device = device;
        this.id = id;
        this.native = native;
        this.vertexCode = vertexCode;
        this.fragmentCode = fragmentCode;
        this.attributeLayout = attributeLayout;
        this.uniformInfo = uniformInfo;
        this.uniformLocation = uniformLocation;
        this.stateCache = {};
    }
    GPUProgram.prototype.delete = function () {
        this.device.deleteProgram(this);
    };
    return GPUProgram;
}());
exports.GPUProgram = GPUProgram;
exports.default = GPUDevice;
// private data structures
var IdManager = /** @class */ (function () {
    function IdManager(minimize) {
        this.minimize = minimize;
        this.top = 0;
        this.availableIdQueue = new Array();
    }
    IdManager.prototype.assign = function () {
        if (this.availableIdQueue.length > 0) {
            return this.availableIdQueue.pop();
        }
        return this.top++;
    };
    IdManager.prototype.release = function (id) {
        if (this.availableIdQueue.indexOf(id) !== -1)
            return false;
        this.availableIdQueue.push(id);
        if (this.minimize) {
            this.availableIdQueue.sort(function (a, b) { return b - a; });
        }
        return true;
    };
    IdManager.prototype.count = function () {
        return this.top - this.availableIdQueue.length;
    };
    return IdManager;
}());
var ReferenceCountCache = /** @class */ (function () {
    function ReferenceCountCache(onZeroReferences) {
        this.onZeroReferences = onZeroReferences;
        this.map = {};
    }
    ReferenceCountCache.prototype.add = function (key, value) {
        this.map[key] = {
            value: value,
            refs: 1,
        };
    };
    ReferenceCountCache.prototype.reference = function (key) {
        var r = this.map[key];
        if (r == null)
            return null;
        r.refs++;
        return r.value;
    };
    ReferenceCountCache.prototype.release = function (key) {
        var r = this.map[key];
        if (r == null)
            return false;
        r.refs--;
        if (r.refs === 0) {
            this.onZeroReferences(r.value);
            delete this.map[key];
            return false;
        }
        return true;
    };
    return ReferenceCountCache;
}());
