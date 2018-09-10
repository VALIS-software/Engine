import Node from './Node';
export declare class RenderPass {
    target: any;
    root: Node<any>;
    clearOptions: {
        clearColor?: Array<number>;
        clearDepth?: number;
        clearStencil?: number;
    };
    constructor(target: any, root: Node<any>, clearOptions: {
        clearColor?: Array<number>;
        clearDepth?: number;
        clearStencil?: number;
    });
}
export default RenderPass;
