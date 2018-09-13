import InteractionEvent from './ui/InteractionEvent';
import Object2DInstances from './ui/Object2DInstances';
import Text from './ui/Text';
import Object2D from './ui/Object2D';
import Rect from './ui/Rect';
import UsageCache from './ds/UsageCache';
import Animator from './animation/Animator';
import Scalar from './math/Scalar';
import SharedResources from './SharedResources';
import Node from './rendering/Node';
import RenderPass from './rendering/RenderPass';
import Renderer from './rendering/Renderer';
import Renderable from './rendering/Renderable';
import GPUDevice from './rendering/GPUDevice';
declare const Engine: {
    SharedResources: typeof SharedResources;
    ui: {
        InteractionEvent: typeof InteractionEvent;
        Object2DInstances: typeof Object2DInstances;
        Text: typeof Text;
        Object2D: typeof Object2D;
        Rect: typeof Rect;
    };
    ds: {
        UsageCache: typeof UsageCache;
    };
    animation: {
        Animator: typeof Animator;
    };
    math: {
        Scalar: typeof Scalar;
    };
    rendering: {
        Node: typeof Node;
        RenderPass: typeof RenderPass;
        Renderer: typeof Renderer;
        Renderable: typeof Renderable;
        GPUDevice: typeof GPUDevice;
    };
};
export default Engine;
