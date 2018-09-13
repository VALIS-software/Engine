"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var RenderPass = /** @class */ (function () {
    function RenderPass(target, root, clearOptions) {
        this.target = target;
        this.root = root;
        this.clearOptions = clearOptions;
        if (target != null) {
            throw 'Framebuffer target not yet supported';
        }
    }
    return RenderPass;
}());
exports.RenderPass = RenderPass;
exports.default = RenderPass;
