/**

Dev Notes:
- Should be dependency free, doesn't know about Renderer
- Should not have any public state; purely object management
- TextureManager
	"Performance problems have been observed on some implementations when using uniform1i to update sampler uniforms. To change the texture referenced by a sampler uniform, binding a new texture to the texture unit referenced by the uniform should be preferred over using uniform1i to update the uniform itself."

**/

export type GPUDeviceInternal = {
	gl: WebGLRenderingContext,
	extVao: OES_vertex_array_object,
	extInstanced: ANGLE_instanced_arrays,
	compileShader: (code: string, type: number) => WebGLShader,
	applyVertexStateDescriptor: (vertexStateDescriptor: VertexStateDescriptor) => void,

	assignTextureUnit(): number,
	bindTexture(handle: GPUTexture): void,
	clearTextureUnit(unit: number): void,
	markTextureUsage(handle: GPUTexture): void,
	textureUnitState: Array<{
		texture: GPUTexture,
		usageMetric: number
	}>,
}

export class GPUDevice {

	get programCount() { return this._programCount; }
	get vertexStateCount() { return this._vertexStateCount; }
	get bufferCount() { return this._bufferCount; }

	capabilities: {
		vertexArrayObjects: boolean,
		instancing: boolean,
		availableTextureUnits: number,
	} = {
		vertexArrayObjects: false,
		instancing: false,
		availableTextureUnits: 0,
	}

	readonly name: string;

	protected gl: WebGLRenderingContext;
	protected vertexStateIds = new IdManager(true);
	protected programIds = new IdManager(true);

	protected vertexShaderCache = new ReferenceCountCache<WebGLShader>((shader) => this.gl.deleteShader(shader));
	protected fragmentShaderCache = new ReferenceCountCache<WebGLShader>((shader) => this.gl.deleteShader(shader));

	protected extVao: null | OES_vertex_array_object;
	protected extInstanced: null | ANGLE_instanced_arrays;

	protected textureUnitState: Array<{
		texture: GPUTexture,
		usageMetric: number
	}>;
	protected textureUnitUsageCounter = 0;

	private _programCount = 0;
	private _vertexStateCount = 0;
	private _bufferCount = 0;
	private _textureCount = 0;

	constructor(gl: WebGLRenderingContext) {
		this.gl = gl;

		// the vertex array object extension makes controlling vertex state simpler and faster
		// however we fallback to normal vertex state handling when not available
		this.extVao = gl.getExtension('OES_vertex_array_object');
		this.extInstanced = gl.getExtension('ANGLE_instanced_arrays');

		let extDebugInfo = gl.getExtension('WEBGL_debug_renderer_info');
		this.name = gl.getParameter(extDebugInfo == null ? gl.RENDERER : extDebugInfo.UNMASKED_RENDERER_WEBGL);

		let availableTextureUnits = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
		this.textureUnitState = new Array(availableTextureUnits);

		this.capabilities.vertexArrayObjects = this.extVao != null;
		this.capabilities.instancing = this.extInstanced != null;
		this.capabilities.availableTextureUnits = availableTextureUnits;
	}

	createBuffer(bufferDescriptor: BufferDescriptor) {
		const gl = this.gl;

		let b = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, b);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			bufferDescriptor.data || bufferDescriptor.size,
			bufferDescriptor.usageHint || BufferUsageHint.STATIC
		);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		let bufferHandle = new GPUBuffer(this, b);
		this._bufferCount++;

		return bufferHandle;
	}

	/**
	 * @throws string if index data requires UInt extension on a device that doesn't support it
	 * @throws string if both dataType _and_ data are not set
	 */
	createIndexBuffer(indexBufferDescriptor: IndexBufferDescriptor) {
		const gl = this.gl;

		// determine index data type from data array type
		let dataType = indexBufferDescriptor.dataType;
		if (dataType == null) {
			if (indexBufferDescriptor.data != null) {
				switch (indexBufferDescriptor.data.BYTES_PER_ELEMENT) {
					case 1: dataType = IndexDataType.UNSIGNED_BYTE; break;
					case 2: dataType = IndexDataType.UNSIGNED_SHORT; break;
					case 4: dataType = IndexDataType.UNSIGNED_INT; break;
					// @! UNSIGNED_INT requires extension, should enable when required and fallback to re-interpreting as UNSIGNED_SHORT
				}
			} else {
				throw 'dataType field is required if data is not set';
			}
		}

		if (dataType == IndexDataType.UNSIGNED_INT) {
			let uintExt = gl.getExtension('OES_element_index_uint');
			if (uintExt == null) {
				throw 'OES_element_index_uint is required but unavailable';
			}
		}

		let b = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b);
		gl.bufferData(
			gl.ELEMENT_ARRAY_BUFFER,
			indexBufferDescriptor.data || indexBufferDescriptor.size,
			indexBufferDescriptor.usageHint || BufferUsageHint.STATIC
		);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

		let bufferHandle = new GPUIndexBuffer(this, b, dataType);
		this._bufferCount++;

		return bufferHandle;
	}

	updateBufferData(handle: GPUBuffer | GPUIndexBuffer, data: BufferDataSource, offsetBytes: number = 0) {
		const gl = this.gl;
		let target = handle instanceof GPUIndexBuffer ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;

		this.gl.bindBuffer(target, handle.native);
		this.gl.bufferSubData(target, offsetBytes, data);
		this.gl.bindBuffer(target, null);
	}

	deleteBuffer(handle: GPUBuffer | GPUIndexBuffer) {
		this.gl.deleteBuffer(handle.native);
		this._bufferCount--;
	}

	createVertexState(vertexStateDescriptor: VertexStateDescriptor) {
		const gl = this.gl;
		const extVao = this.extVao;

		let indexDataType = vertexStateDescriptor.indexBuffer != null ? vertexStateDescriptor.indexBuffer.dataType : null;

		let vaoSupported = extVao != null;

		let vertexStateHandle: GPUVertexState;
		if (vaoSupported) {
			let vao = extVao.createVertexArrayOES();
			extVao.bindVertexArrayOES(vao);
			this.applyVertexStateDescriptor(vertexStateDescriptor);
			extVao.bindVertexArrayOES(null);

			vertexStateHandle = new GPUVertexState(this, this.vertexStateIds.assign(), vao, vertexStateDescriptor.attributeLayout, indexDataType);
		} else {
			// when VAO is not supported, pass in the descriptor so vertex state can be applied when rendering
			vertexStateHandle = new GPUVertexState(this, this.vertexStateIds.assign(), null, vertexStateDescriptor.attributeLayout, indexDataType);
			(vertexStateHandle as any as GPUVertexStateInternal)._vaoFallbackDescriptor = vertexStateDescriptor;
		}

		this._vertexStateCount++;

		return vertexStateHandle;
	}

	deleteVertexState(handle: GPUVertexState) {
		if (this.extVao != null) {
			this.extVao.deleteVertexArrayOES(handle.native);
		}
		this.vertexStateIds.release(handle.id);
		this._vertexStateCount--;
	}

	createTexture(textureDescriptor: TextureDescriptor) {
		const gl = this.gl;

		let t = gl.createTexture();

		let freeUnit = this.assignTextureUnit();
		
		gl.activeTexture(gl.TEXTURE0 + freeUnit);
		gl.bindTexture(gl.TEXTURE_2D, t);

		// sampling parameters
		let samplingParameters = {
			magFilter: TextureMagFilter.LINEAR,
			minFilter: TextureMagFilter.LINEAR,
			wrapT: TextureWrapMode.CLAMP_TO_EDGE,
			wrapS: TextureWrapMode.CLAMP_TO_EDGE,
			...textureDescriptor.samplingParameters,
		}

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, samplingParameters.magFilter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, samplingParameters.minFilter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, samplingParameters.wrapS);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, samplingParameters.wrapT);

		// set _global_ data upload parameters
		let pixelStorageParameters = {
			packAlignment: 4,
			unpackAlignment: 4,
			flipY: false,
			premultiplyAlpha: false,
			colorSpaceConversion: ColorSpaceConversion.DEFAULT,
			...textureDescriptor.pixelStorage,
		}

		gl.pixelStorei(gl.PACK_ALIGNMENT, pixelStorageParameters.packAlignment);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, pixelStorageParameters.unpackAlignment);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, pixelStorageParameters.flipY);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, pixelStorageParameters.premultiplyAlpha);
		gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, pixelStorageParameters.colorSpaceConversion);

		// upload data if supplied
		if (textureDescriptor.mipmapData != null) {
			for (let i = 0; i < textureDescriptor.mipmapData.length; i++) {
				let data = textureDescriptor.mipmapData[i];
				let mipScale = 1 / (1 << i);
				if (ArrayBuffer.isView(data)) {
					gl.texImage2D(
						gl.TEXTURE_2D,
						i,
						textureDescriptor.format,
						Math.round(textureDescriptor.width / mipScale),
						Math.round(textureDescriptor.height / mipScale),
						0,
						textureDescriptor.format,
						textureDescriptor.dataType,
						data
					);
				} else {
					gl.texImage2D(
						gl.TEXTURE_2D,
						i,
						textureDescriptor.format,
						textureDescriptor.format,
						textureDescriptor.dataType,
						data
					);
				}
			}
		} else {
			// allocate empty texture
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				textureDescriptor.format,
				textureDescriptor.width,
				textureDescriptor.height,
				0,
				textureDescriptor.format,
				textureDescriptor.dataType,
				null
			);
		}

		if (textureDescriptor.generateMipmaps) {
			gl.generateMipmap(gl.TEXTURE_2D);
		}

		// determine allocated size
		let allocatedWidth: number;
		let allocatedHeight: number;

		if (textureDescriptor.mipmapData !== null) {
			let data = textureDescriptor.mipmapData[0];
			if (ArrayBuffer.isView(data)) {
				allocatedWidth = textureDescriptor.width;
				allocatedHeight = textureDescriptor.height;
			} else {
				allocatedWidth = data.width;
				allocatedHeight = data.height;
			}
		} else {
			allocatedWidth = textureDescriptor.width;
			allocatedHeight = textureDescriptor.height;
		}

		// let usageHint = textureDescriptor.usageHint == null ? TextureUsageHint.UNKNOWN : textureDescriptor.usageHint;
		let handle = new GPUTexture(this, t, allocatedWidth, allocatedHeight, textureDescriptor.dataType);

		// update texture unit state
		let handleInternal = (handle as any as GPUTextureInternal);
		handleInternal.boundUnit = freeUnit;
		this.textureUnitState[freeUnit] = {
			usageMetric: ++this.textureUnitUsageCounter,
			texture: handle,
		};

		this._textureCount++;
		return handle;
	}

	updateTextureData(
		handle: GPUTexture,
		level: number,
		format: TextureFormat,
		data: TexImageSource | ArrayBufferView,
		x: number = 0, y: number = 0,
		w: number = handle.w, h: number = handle.h,
	) {
		const gl = this.gl;
		const handleInternal: GPUTextureInternal = handle as any as GPUTextureInternal;

		this.bindTexture(handle);
		
		if (ArrayBuffer.isView(data)) {
			gl.texSubImage2D(
				gl.TEXTURE_2D,
				level,
				x, y, w, h,
				format,
				handleInternal.type,
				data,
			);
		} else {
			gl.texSubImage2D(
				gl.TEXTURE_2D,
				level,
				x, y,
				format,
				handleInternal.type,
				data,
			);
		}
	}

	deleteTexture(handle: GPUTexture) {
		const gl = this.gl;
		// if texture is bound to a texture unit, unbind it and free the unit
		let handleInternal = handle as any as GPUTextureInternal;
		if (handleInternal.boundUnit !== -1) {
			this.clearTextureUnit(handleInternal.boundUnit);
		}

		gl.deleteTexture(handle.native);
		this._textureCount--;
	}

	/**
	 * @throws string if shaders cannot be compiled or program cannot be linked
	 */
	createProgram(vertexCode: string, fragmentCode: string, attributeLayout: AttributeLayout) {
		const gl = this.gl;
		let vs: WebGLShader = this.vertexShaderCache.reference(vertexCode);
		let fs: WebGLShader = this.fragmentShaderCache.reference(fragmentCode);

		if (vs == null) {
			vs = this.compileShader(vertexCode, gl.VERTEX_SHADER);
			this.vertexShaderCache.add(vertexCode, vs);
		}

		if (fs == null) {
			fs = this.compileShader(fragmentCode, gl.FRAGMENT_SHADER);
			this.fragmentShaderCache.add(fragmentCode, fs);
		}

		let p = gl.createProgram();
		gl.attachShader(p, vs);
		gl.attachShader(p, fs);

		// set attribute bindings (before linking)
		// see applyVertexStateDescriptor() for corresponding layout handling
		let attributeRow = 0;
		for (let i = 0; i < attributeLayout.length; i++) {
			let attribute = attributeLayout[i];

			// how many elements are stored in this type?
			let typeLength = shaderTypeLength[attribute.type];

			// determine how many rows this attribute will cover
			// e.g. float -> 1, vec4 -> 1, mat2 -> 2
			let attributeRowSpan = shaderTypeRows[attribute.type];

			// "It is permissible to bind a generic attribute index to an attribute variable name that is never used in a vertex shader."
			// this enables us to have consistent attribute layouts between shaders
			// if attributeRowSpan > 1, the other rows are automatically bound
			gl.bindAttribLocation(p, attributeRow, attribute.name);

			attributeRow += attributeRowSpan;
		}

		gl.linkProgram(p);

		if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
			throw `[program link]: ${gl.getProgramInfoLog(p)}`;
		}

		// read all active uniform locations and cache them for later
		let uniformCount = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
		let uniformInfo: { [name: string]: WebGLActiveInfo } = {};
		let uniformLocation: { [name: string]: WebGLUniformLocation } = {};
		for (let i = 0; i < uniformCount; i++) {
			let info = gl.getActiveUniform(p, i);
			uniformInfo[info.name] = info;
			uniformLocation[info.name] = gl.getUniformLocation(p, info.name);
		}

		let programHandle = new GPUProgram(
			this,
			this.programIds.assign(),
			p,
			vertexCode,
			fragmentCode,
			attributeLayout,
			uniformInfo,
			uniformLocation
		);
		this._programCount++;

		return programHandle;
	}

	deleteProgram(handle: GPUProgram) {
		this.gl.deleteProgram(handle.native);
		this.vertexShaderCache.release(handle.vertexCode);
		this.fragmentShaderCache.release(handle.fragmentCode);
		this.programIds.release(handle.id);
		this._programCount--;
	}

	protected compileShader(code: string, type: number): WebGLShader {
		let gl = this.gl;

		let s = gl.createShader(type);
		gl.shaderSource(s, code);
		gl.compileShader(s);

		if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
			let typename = null;
			switch (type) {
				case gl.VERTEX_SHADER: typename = 'vertex'; break;
				case gl.FRAGMENT_SHADER: typename = 'fragment'; break;
			}
			throw `[${typename} compile]: ${gl.getShaderInfoLog(s)}`;
		}

		return s;
	}

	protected applyVertexStateDescriptor(vertexStateDescriptor: VertexStateDescriptor) {
		const gl = this.gl;

		// set index
		if (vertexStateDescriptor.indexBuffer != null) {
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexStateDescriptor.indexBuffer.native);
		} else {
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		}

		// set attributes
		// some attributes may span more than 1 attribute row (a vec4) so we track the current attribute row so attributes are packed sequentially
		let attributeRow = 0;
		for (let i = 0; i < vertexStateDescriptor.attributeLayout.length; i++) {
			let {name, type} = vertexStateDescriptor.attributeLayout[i];

			// how many elements are stored in this type?
			let typeLength = shaderTypeLength[type];

			// determine how many rows this attribute will cover
			// e.g. float -> 1, vec4 -> 1, mat2 -> 2, mat4 -> 4
			let attributeRowSpan = shaderTypeRows[type];

			// determine number of generic attribute columns this type requires (from 1 - 4)
			// 1, 2, 3, 4, 9, 16 -> 1, 2, 3, 4, 3, 4
			let typeColumns = typeLength / attributeRowSpan;
			
			// get the attribute assignment for this name (may be null or undefined)
			let vertexAttribute = vertexStateDescriptor.attributes[name];

			if (vertexAttribute != null) {

				// if .buffer is set then assume it's a VertexAttributeBuffer
				if ((vertexAttribute as VertexAttributeBuffer).buffer !== undefined) {
					let attributeBuffer = vertexAttribute as VertexAttributeBuffer;
					let sourceDataType = attributeBuffer.sourceDataType;
					if (sourceDataType == null) {
						// assume source type is FLOAT (in WebGL1 all shader generic attributes are required to be floats)
						sourceDataType = VertexAttributeSourceType.FLOAT;
					}

					gl.bindBuffer(gl.ARRAY_BUFFER, attributeBuffer.buffer.native);

					// set all attribute arrays
					for (let r = 0; r < attributeRowSpan; r++) {
						let row = attributeRow + r;

						// assume the data is formatted with columns that match the attribute type, but allow override with .sourceColumns field
						let sourceColumns = attributeBuffer.sourceColumns != null ? attributeBuffer.sourceColumns : typeColumns;

						// column offset for this attribute row
						// this is only non-zero for matrix types
						let columnBytesOffset = (r * sourceColumns * dataTypeByteLength[sourceDataType]);

						// console.log('enableVertexAttribArray', row);
						gl.enableVertexAttribArray(row);
						gl.vertexAttribPointer(
							row,
							sourceColumns,
							sourceDataType,
							!!attributeBuffer.normalize,
							attributeBuffer.strideBytes,
							// offset of attribute row
							attributeBuffer.offsetBytes + columnBytesOffset
						);

						if (this.extInstanced) {
							// we should make sure to set vertexAttribDivisorANGLE even if 0, so that if we're altering global state we don't run into issues
							// this helps ensure we can applyVertexStateDescriptor even when VAOs are unavailable
							this.extInstanced.vertexAttribDivisorANGLE(row, attributeBuffer.instanceDivisor != null ? attributeBuffer.instanceDivisor : 0);
						}
					}

				} else {
					// constant value attribute
					let attributeConstant = vertexAttribute as VertexAttributeConstant;

					if (attributeRowSpan === 1) {
						// slightly faster path for most common case
						gl.disableVertexAttribArray(attributeRow);
						gl.vertexAttrib4fv(attributeRow, attributeConstant.data);
					} else {
						for (let r = 0; r < attributeRowSpan; r++) {
							gl.disableVertexAttribArray(attributeRow + r);
							gl.vertexAttrib4fv(attributeRow + r, attributeConstant.data.subarray(r * 4, (r * 4) + 4));
						}
					}
				}
			} else {
				// set attribute value to constant 0s
				for (let r = 0; r < attributeRowSpan; r++) {
					gl.disableVertexAttribArray(attributeRow + r);
					gl.vertexAttrib4f(attributeRow + r, 0, 0, 0, 0);
				}
			}

			attributeRow += attributeRowSpan;
		}
	}
	
	protected assignTextureUnit(): number {
		// console.debug(`%cassignTextureUnit`, 'color: blue');
		// return the first free texture unit
		let minUsageMetric = Infinity;
		let minUsageUnitIndex = undefined;

		for (let i = 0; i < this.textureUnitState.length; i++) {
			let unit = this.textureUnitState[i];
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
	}

	protected bindTexture(handle: GPUTexture) {
		const gl = this.gl;
		let handleInternal = handle as any as GPUTextureInternal;

		if (handleInternal.boundUnit === -1) {
			let freeUnit = this.assignTextureUnit();
			gl.activeTexture(gl.TEXTURE0 + freeUnit);
			gl.bindTexture(gl.TEXTURE_2D, handle.native);
			handleInternal.boundUnit = freeUnit;
			this.textureUnitState[freeUnit] = {
				usageMetric: ++this.textureUnitUsageCounter,
				texture: handle,
			}
		} else {
			gl.activeTexture(gl.TEXTURE0 + handleInternal.boundUnit);
			gl.bindTexture(gl.TEXTURE_2D, handle.native);
			this.textureUnitState[handleInternal.boundUnit].usageMetric = ++this.textureUnitUsageCounter;
		}
	}

	protected clearTextureUnit(unit: number) {
		// console.debug(`%cclearTextureUnit ${unit}`, 'color: blue');
		const gl = this.gl;
		let texture = this.textureUnitState[unit].texture;
		const textureInternal = texture as any as GPUTextureInternal;
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, null);
		this.textureUnitState[unit] = undefined;
		if (texture !== undefined) {
			textureInternal.boundUnit = -1;
		}
	}

	protected markTextureUsage(handle: GPUTexture) {
		let handleInternal = handle as any as GPUTextureInternal;
		this.textureUnitState[handleInternal.boundUnit].usageMetric = ++this.textureUnitUsageCounter;
	}

}

// Object Descriptors

export enum IndexDataType {
	UNSIGNED_BYTE = WebGLRenderingContext.UNSIGNED_BYTE,
	UNSIGNED_SHORT = WebGLRenderingContext.UNSIGNED_SHORT,
	UNSIGNED_INT = WebGLRenderingContext.UNSIGNED_INT, // requires 'OES_element_index_uint' extension in WebGL1
}

export enum VertexAttributeSourceType {
	BYTE = WebGLRenderingContext.BYTE,
	SHORT = WebGLRenderingContext.SHORT,
	UNSIGNED_BYTE = WebGLRenderingContext.UNSIGNED_BYTE,
	UNSIGNED_SHORT = WebGLRenderingContext.UNSIGNED_SHORT,
	FLOAT = WebGLRenderingContext.FLOAT,
	// WebGL2 HALF_FLOAT
}

export enum BufferUsageHint {
	STREAM = WebGLRenderingContext.STREAM_DRAW,
	STATIC = WebGLRenderingContext.STATIC_DRAW,
	DYNAMIC = WebGLRenderingContext.DYNAMIC_DRAW,
}

export enum UniformType {
	FLOAT = WebGLRenderingContext.FLOAT,
	VEC2 = WebGLRenderingContext.FLOAT_VEC2,
	VEC3 = WebGLRenderingContext.FLOAT_VEC3,
	VEC4 = WebGLRenderingContext.FLOAT_VEC4,
	IVEC2 = WebGLRenderingContext.INT_VEC2,
	IVEC3 = WebGLRenderingContext.INT_VEC3,
	IVEC4 = WebGLRenderingContext.INT_VEC4,
	BOOL = WebGLRenderingContext.BOOL,
	BVEC2 = WebGLRenderingContext.BOOL_VEC2,
	BVEC3 = WebGLRenderingContext.BOOL_VEC3,
	BVEC4 = WebGLRenderingContext.BOOL_VEC4,
	MAT2 = WebGLRenderingContext.FLOAT_MAT2,
	MAT3 = WebGLRenderingContext.FLOAT_MAT3,
	MAT4 = WebGLRenderingContext.FLOAT_MAT4,
	SAMPLER_2D = WebGLRenderingContext.SAMPLER_2D,
	SAMPLER_CUBE = WebGLRenderingContext.SAMPLER_CUBE,
}

// subset of UniformType
export enum AttributeType {
	FLOAT = WebGLRenderingContext.FLOAT,
	VEC2 = WebGLRenderingContext.FLOAT_VEC2,
	VEC3 = WebGLRenderingContext.FLOAT_VEC3,
	VEC4 = WebGLRenderingContext.FLOAT_VEC4,
	MAT2 = WebGLRenderingContext.FLOAT_MAT2,
	MAT3 = WebGLRenderingContext.FLOAT_MAT3,
	MAT4 = WebGLRenderingContext.FLOAT_MAT4,
}

export type AttributeLayout = Array <{
	name: string | null,
	type: AttributeType
}>;

export type BufferDataSource = Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array | DataView | ArrayBuffer;

export type BufferDescriptor = {
	data?: BufferDataSource,
	size?: number,
	usageHint?: BufferUsageHint,
}

export type IndexBufferDescriptor = {
	data?: Uint8Array | Uint8ClampedArray | Uint16Array | Uint32Array,
	size?: number,
	dataType?: IndexDataType,
	usageHint?: BufferUsageHint,
}

export type VertexAttributeConstant = {
	type: AttributeType,
	data: Float32Array,
}

export type VertexAttributeBuffer = {
	buffer: GPUBuffer,
	offsetBytes: number,
	strideBytes: number,
	sourceColumns?: number,
	sourceDataType?: VertexAttributeSourceType,
	normalize?: boolean,
	instanceDivisor?: number,
}

export type VertexAttribute = VertexAttributeConstant | VertexAttributeBuffer; 

export type VertexStateDescriptor = {
	indexBuffer?: GPUIndexBuffer,
	attributeLayout: AttributeLayout,
	attributes: { [name: string]: VertexAttribute }
}

export enum TextureDataType {
	UNSIGNED_BYTE = WebGLRenderingContext.UNSIGNED_BYTE,
	UNSIGNED_SHORT_5_6_5 = WebGLRenderingContext.UNSIGNED_SHORT_5_6_5,
	UNSIGNED_SHORT_4_4_4_4 = WebGLRenderingContext.UNSIGNED_SHORT_4_4_4_4,
	UNSIGNED_SHORT_5_5_5_1 = WebGLRenderingContext.UNSIGNED_SHORT_5_5_5_1,
	FLOAT = WebGLRenderingContext.FLOAT,
	// Extension HALF_FLOAT = 
}

export enum TextureFormat {
	ALPHA = WebGLRenderingContext.ALPHA,
	RGB = WebGLRenderingContext.RGB,
	RGBA = WebGLRenderingContext.RGBA,
	LUMINANCE = WebGLRenderingContext.LUMINANCE,
	LUMINANCE_ALPHA = WebGLRenderingContext.LUMINANCE_ALPHA,

	// @! should include compressed texture formats from extensions
}

export enum ColorSpaceConversion {
	NONE = WebGLRenderingContext.NONE,
	DEFAULT = WebGLRenderingContext.BROWSER_DEFAULT_WEBGL,
}

export enum TextureMagFilter {
	NEAREST = WebGLRenderingContext.NEAREST,
	LINEAR = WebGLRenderingContext.LINEAR,
}

export enum TextureMinFilter {
	NEAREST = WebGLRenderingContext.NEAREST,
	LINEAR = WebGLRenderingContext.LINEAR,
	NEAREST_MIPMAP_NEAREST = WebGLRenderingContext.NEAREST_MIPMAP_NEAREST,
	LINEAR_MIPMAP_NEAREST = WebGLRenderingContext.LINEAR_MIPMAP_NEAREST,
	NEAREST_MIPMAP_LINEAR = WebGLRenderingContext.NEAREST_MIPMAP_LINEAR,
	LINEAR_MIPMAP_LINEAR = WebGLRenderingContext.LINEAR_MIPMAP_LINEAR,
}

export enum TextureWrapMode {
	REPEAT = WebGLRenderingContext.REPEAT,
	CLAMP_TO_EDGE = WebGLRenderingContext.CLAMP_TO_EDGE,
	MIRRORED_REPEAT = WebGLRenderingContext.MIRRORED_REPEAT,
}

export type TexImageSource = ImageBitmap | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;

export enum TextureUsageHint {
	LONG_LIFE = 1,
	TRANSIENT = 0,
}

export type TextureDescriptor = {

	format: TextureFormat,
	generateMipmaps: boolean,

	mipmapData?: Array<ArrayBufferView | TexImageSource>,
	width?: number,
	height?: number,
	dataType?: TextureDataType,

	usageHint?: TextureUsageHint,

	samplingParameters?: {
		magFilter?: TextureMagFilter,
		minFilter?: TextureMinFilter,
		wrapS?: TextureWrapMode,
		wrapT?: TextureWrapMode,
	},

	pixelStorage?: {
		packAlignment?: number,
		unpackAlignment?: number,
		flipY?: boolean,
		premultiplyAlpha?: boolean,
		colorSpaceConversion?: ColorSpaceConversion,
	},

}

// Data Tables

export const shaderTypeLength = {
	[UniformType.FLOAT]: 1,
	[UniformType.VEC2]: 2,
	[UniformType.VEC3]: 3,
	[UniformType.VEC4]: 4,
	[UniformType.IVEC2]: 1,
	[UniformType.IVEC3]: 2,
	[UniformType.IVEC4]: 3,
	[UniformType.BOOL]: 1,
	[UniformType.BVEC2]: 2,
	[UniformType.BVEC3]: 3,
	[UniformType.BVEC4]: 4,
	[UniformType.MAT2]: 2 * 2,
	[UniformType.MAT3]: 3 * 3,
	[UniformType.MAT4]: 4 * 4,
};

export const shaderTypeRows = {
	[UniformType.FLOAT]: 1,
	[UniformType.VEC2]: 1,
	[UniformType.VEC3]: 1,
	[UniformType.VEC4]: 1,
	[UniformType.IVEC2]: 1,
	[UniformType.IVEC3]: 1,
	[UniformType.IVEC4]: 1,
	[UniformType.BOOL]: 1,
	[UniformType.BVEC2]: 1,
	[UniformType.BVEC3]: 1,
	[UniformType.BVEC4]: 1,
	[UniformType.MAT2]: 2,
	[UniformType.MAT3]: 3,
	[UniformType.MAT4]: 4,
};

export const shaderTypeColumns = {
	[UniformType.FLOAT]: 1,
	[UniformType.VEC2]: 2,
	[UniformType.VEC3]: 3,
	[UniformType.VEC4]: 4,
	[UniformType.IVEC2]: 2,
	[UniformType.IVEC3]: 3,
	[UniformType.IVEC4]: 4,
	[UniformType.BOOL]: 1,
	[UniformType.BVEC2]: 2,
	[UniformType.BVEC3]: 3,
	[UniformType.BVEC4]: 4,
	[UniformType.MAT2]: 2,
	[UniformType.MAT3]: 3,
	[UniformType.MAT4]: 4,
};

export const dataTypeByteLength = {
	[WebGLRenderingContext.BYTE]: 1, 
	[WebGLRenderingContext.UNSIGNED_BYTE]: 1, 

	[WebGLRenderingContext.SHORT]: 2,
	[WebGLRenderingContext.UNSIGNED_SHORT]: 2,

	[WebGLRenderingContext.INT]: 4,
	[WebGLRenderingContext.UNSIGNED_INT]: 4,

	[WebGLRenderingContext.FLOAT]: 4,
}

// Object Handles

interface GPUObjectHandle {
	delete: () => void
}

export class GPUBuffer implements GPUObjectHandle {

	constructor(protected readonly device: GPUDevice, readonly native: WebGLBuffer) {}

	updateBufferData(data: BufferDataSource, offsetBytes: number = 0) {
		this.device.updateBufferData(this, data, offsetBytes);
	}

	delete() {
		this.device.deleteBuffer(this);
	}

}

export class GPUIndexBuffer extends GPUBuffer {

	constructor(device: GPUDevice, native: WebGLBuffer, readonly dataType: IndexDataType) {
		super(device, native);
	}

}

export type GPUVertexStateInternal = {
	_vaoFallbackDescriptor: VertexStateDescriptor;
}

export class GPUVertexState implements GPUObjectHandle {

	// only set if VAOs are not available
	protected _vaoFallbackDescriptor: undefined | VertexStateDescriptor;

	constructor(
		protected readonly device: GPUDevice,
		readonly id: number,
		readonly native: null | WebGLVertexArrayObjectOES,
		readonly attributeLayout: AttributeLayout,
		readonly indexType?: IndexDataType,
	) {}

	delete() {
		this.device.deleteVertexState(this);
	}

}

export type GPUTextureInternal = {
	boundUnit: number,
	type: TextureDataType,
	// usageHint: TextureUsageHint
}

export class GPUTexture implements GPUObjectHandle {

	protected boundUnit: number = -1;

	constructor(
		protected readonly device: GPUDevice,
		readonly native: WebGLTexture,
		readonly w: number,
		readonly h: number,
		protected readonly type: TextureDataType,
		// protected readonly usageHint: TextureUsageHint
	) {}

	updateTextureData(
		level: number,
		format: TextureFormat,
		data: TexImageSource | ArrayBufferView,
		x?: number, y?: number,
		w?: number, h?: number
	) {
		this.device.updateTextureData(this, level, format, data, x, y, w, h);
	}

	delete() {
		this.device.deleteTexture(this);
	}

}

export type GPUProgramInternal = {
	stateCache: { [key: string]: any };
}

export class GPUProgram implements GPUObjectHandle {

	protected stateCache: { [key: string]: any } = {};

	constructor(
		protected readonly device: GPUDevice,
		readonly id: number,
		readonly native: WebGLProgram,
		readonly vertexCode: string,
		readonly fragmentCode: string,
		readonly attributeLayout: AttributeLayout,
		readonly uniformInfo: { [ name: string ]: WebGLActiveInfo },
		readonly uniformLocation: { [ name: string ]: WebGLUniformLocation }
	) {}

	delete() {
		this.device.deleteProgram(this);
	}

}

export default GPUDevice;

// private data structures

class IdManager {

	top: number = 0;
	availableIdQueue = new Array<number>();

	constructor(protected minimize: boolean) { }

	assign(): number {
		if (this.availableIdQueue.length > 0) {
			return this.availableIdQueue.pop();
		}

		return this.top++;
	}

	release(id: number) {
		if (this.availableIdQueue.indexOf(id) !== -1) return false;

		this.availableIdQueue.push(id);

		if (this.minimize) {
			this.availableIdQueue.sort((a, b) => b - a);
		}

		return true;
	}

	count(): number {
		return this.top - this.availableIdQueue.length;
	}

}

class ReferenceCountCache<T> {

	map: {
		[key: string] : {
			value: T,
			refs: number,
		}
	} = {};

	constructor(protected onZeroReferences: (value: T) => void) {}

	add(key: string, value: T) {
		this.map[key] = {
			value: value,
			refs: 1,
		};
	}

	reference(key: string): T | null {
		let r = this.map[key];
		if (r == null) return null;
		r.refs++;
		return r.value;
	}

	release(key: string) {
		let r = this.map[key];
		if (r == null) return false;
		r.refs--;
		if (r.refs === 0) {
			this.onZeroReferences(r.value);
			delete this.map[key];
			return false;
		}
		return true;
	}

}