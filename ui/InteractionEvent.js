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
Object.defineProperty(exports, "__esModule", { value: true });
var InteractionEvent = /** @class */ (function () {
    function InteractionEvent(init, sourceEvent) {
        this.sourceEvent = sourceEvent;
        this.defaultPrevented = false;
        this.propagationStopped = false;
        this.target = init.target;
        this.worldX = init.worldX;
        this.worldY = init.worldY;
        this.canvasX = init.canvasX;
        this.canvasY = init.canvasY;
        this.localX = init.localX;
        this.localY = init.localY;
        this.fractionX = init.fractionX;
        this.fractionY = init.fractionY;
        this.buttonChange = init.buttonChange;
        this.buttonState = init.buttonState;
        this.altKey = init.altKey;
        this.ctrlKey = init.ctrlKey;
        this.shiftKey = init.shiftKey;
        this.metaKey = init.metaKey;
        this.pointerId = init.pointerId;
        this.isPrimary = init.isPrimary;
        this.pointerType = init.pointerType;
        this.pressure = init.pressure;
        this.width = init.width;
        this.height = init.height;
        this.tiltX = init.tiltX;
        this.tiltY = init.tiltY;
        // copy internal fields should they exist on init
        // this is so we can clone InteractionEvents
        if (init.defaultPrevented !== undefined) {
            this.defaultPrevented = init.defaultPrevented;
        }
        if (init.propagationStopped !== undefined) {
            this.propagationStopped = init.propagationStopped;
        }
    }
    InteractionEvent.prototype.preventDefault = function () {
        this.defaultPrevented = true;
        this.sourceEvent.preventDefault();
    };
    InteractionEvent.prototype.stopPropagation = function () {
        this.propagationStopped = true;
    };
    return InteractionEvent;
}());
exports.InteractionEvent = InteractionEvent;
var WheelDeltaMode;
(function (WheelDeltaMode) {
    WheelDeltaMode[WheelDeltaMode["Pixel"] = 1] = "Pixel";
    WheelDeltaMode[WheelDeltaMode["Line"] = 2] = "Line";
    WheelDeltaMode[WheelDeltaMode["Page"] = 3] = "Page";
})(WheelDeltaMode = exports.WheelDeltaMode || (exports.WheelDeltaMode = {}));
var WheelInteractionEvent = /** @class */ (function (_super) {
    __extends(WheelInteractionEvent, _super);
    function WheelInteractionEvent(init, sourceEvent) {
        var _this = _super.call(this, init, sourceEvent) || this;
        _this.wheelDeltaMode = init.wheelDeltaMode;
        _this.wheelDeltaX = init.wheelDeltaX;
        _this.wheelDeltaY = init.wheelDeltaY;
        _this.wheelDeltaZ = init.wheelDeltaZ;
        return _this;
    }
    return WheelInteractionEvent;
}(InteractionEvent));
exports.WheelInteractionEvent = WheelInteractionEvent;
exports.default = InteractionEvent;
