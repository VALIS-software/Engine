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
var GPUDevice_1 = require("../rendering/GPUDevice");
var Object2D_1 = require("./Object2D");
var SharedResources_1 = require("../SharedResources");
/**
 * Base class for instance rendering
 *
 * To use, override:
 * - draw()
 * - allocateVertexState()
 * - getVertexCode()
 * - getFragmentCode()
 */
var Object2DInstances = /** @class */ (function (_super) {
    __extends(Object2DInstances, _super);
    function Object2DInstances(instances, vertexAttributeLayout, instanceAttributeLayout, instanceFieldExtractors) {
        var e_1, _a;
        var _this = _super.call(this) || this;
        _this.vertexAttributeLayout = vertexAttributeLayout;
        _this.instanceAttributeLayout = instanceAttributeLayout;
        _this.instanceFieldExtractors = instanceFieldExtractors;
        _this.render = true;
        _this.attributeLayout = _this.vertexAttributeLayout.concat(_this.instanceAttributeLayout);
        _this.instanceCount = instances.length;
        // translate attribute layout into a details for packing attributes into a buffer
        _this.instancePacking = {};
        var runningLength = 0;
        try {
            for (var _b = __values(_this.instanceAttributeLayout), _c = _b.next(); !_c.done; _c = _b.next()) {
                var instanceAttribute = _c.value;
                var typeLength = GPUDevice_1.shaderTypeLength[instanceAttribute.type];
                _this.instancePacking[instanceAttribute.name] = {
                    length: typeLength,
                    offset: runningLength
                };
                runningLength += typeLength;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // length in floats of a single set of instance attributes
        _this.instancePackLength = runningLength;
        // allocate a array large enough to fit all instance attribute for all instances
        _this.instanceDataArray = new Float32Array(_this.instancePackLength * instances.length);
        // populate the array with attribute data (interleaved into a single array)
        for (var i = 0; i < instances.length; i++) {
            _this.writeInstanceAttributes(_this.instanceDataArray, instances[i], i);
        }
        return _this;
    }
    Object2DInstances.prototype.updateInstance = function (index, instance) {
        this.writeInstanceAttributes(this.instanceDataArray, instance, index);
        if (this.gpuInstanceBuffer != null) {
            // upload to subsection of gpu buffer
            var offsetFloats = index * this.instancePackLength;
            var offsetBytes = offsetFloats * 4;
            this.gpuInstanceBuffer.updateBufferData(this.instanceDataArray.subarray(offsetFloats, offsetFloats + this.instancePackLength), offsetBytes);
        }
    };
    Object2DInstances.prototype.allocateGPUResources = function (device) {
        var e_2, _a;
        this.gpuInstanceBuffer = device.createBuffer({ data: this.instanceDataArray });
        var instanceVertexAttributes = {};
        try {
            for (var _b = __values(this.instanceAttributeLayout), _c = _b.next(); !_c.done; _c = _b.next()) {
                var instanceAttribute = _c.value;
                instanceVertexAttributes[instanceAttribute.name] = {
                    buffer: this.gpuInstanceBuffer,
                    offsetBytes: this.instancePacking[instanceAttribute.name].offset * 4,
                    strideBytes: this.instancePackLength * 4,
                    instanceDivisor: 1
                };
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        // create vertex state
        this.gpuVertexState = this.allocateGPUVertexState(device, this.attributeLayout, instanceVertexAttributes);
        this.gpuProgram = SharedResources_1.default.getProgram(device, this.getVertexCode(), this.getFragmentCode(), this.attributeLayout);
    };
    Object2DInstances.prototype.releaseGPUResources = function () {
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
    };
    Object2DInstances.prototype.writeInstanceAttributes = function (instanceArray, instance, instanceIndex) {
        var e_3, _a;
        var instanceOffset = this.instancePackLength * instanceIndex;
        try {
            for (var _b = __values(this.instanceAttributeLayout), _c = _b.next(); !_c.done; _c = _b.next()) {
                var instanceAttribute = _c.value;
                var name_1 = instanceAttribute.name;
                var packing = this.instancePacking[name_1];
                var attributeOffset = instanceOffset + packing.offset;
                var attributeData = this.instanceFieldExtractors[name_1](instance);
                if (attributeData.length !== packing.length) {
                    console.warn("Instance attribute data length was " + attributeData.length + ", but expected length " + packing.length);
                }
                instanceArray.set(attributeData, attributeOffset);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
    };
    // override the following
    Object2DInstances.prototype.allocateGPUVertexState = function (device, attributeLayout, instanceVertexAttributes) {
        return null;
    };
    Object2DInstances.prototype.getVertexCode = function () { return null; };
    Object2DInstances.prototype.getFragmentCode = function () { return null; };
    return Object2DInstances;
}(Object2D_1.default));
exports.Object2DInstances = Object2DInstances;
exports.default = Object2DInstances;
