"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var InteractionEvent_1 = require("./ui/InteractionEvent");
var Object2DInstances_1 = require("./ui/Object2DInstances");
var Text_1 = require("./ui/Text");
var Object2D_1 = require("./ui/Object2D");
var Rect_1 = require("./ui/Rect");
var UsageCache_1 = require("./ds/UsageCache");
var Animator_1 = require("./animation/Animator");
var Scalar_1 = require("./math/Scalar");
var SharedResources_1 = require("./SharedResources");
var Node_1 = require("./rendering/Node");
var RenderPass_1 = require("./rendering/RenderPass");
var Renderer_1 = require("./rendering/Renderer");
var Renderable_1 = require("./rendering/Renderable");
var GPUDevice_1 = require("./rendering/GPUDevice");
var Engine = {
    SharedResources: SharedResources_1.default,
    ui: {
        InteractionEvent: InteractionEvent_1.default,
        Object2DInstances: Object2DInstances_1.default,
        Text: Text_1.default,
        Object2D: Object2D_1.default,
        Rect: Rect_1.default,
    },
    ds: {
        UsageCache: UsageCache_1.default,
    },
    animation: {
        Animator: Animator_1.default,
    },
    math: {
        Scalar: Scalar_1.default,
    },
    rendering: {
        Node: Node_1.default,
        RenderPass: RenderPass_1.default,
        Renderer: Renderer_1.default,
        Renderable: Renderable_1.default,
        GPUDevice: GPUDevice_1.default,
    },
};
exports.default = Engine;
