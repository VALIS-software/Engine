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

const Engine = {
    SharedResources,
    ui: {
        InteractionEvent,
        Object2DInstances,
        Text,
        Object2D,
        Rect,
    },
    ds: {
        UsageCache,
    },
    animation: {
        Animator,
    },
    math: {
        Scalar,
    },
    rendering: {
        Node,
        RenderPass,
        Renderer,
        Renderable,
        GPUDevice,
    },
}

export default Engine;