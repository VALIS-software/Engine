import Node from './Node';

export class RenderPass {

	constructor(
		public target: any,
		public root: Node<any>,
		public clearOptions: {
			clearColor?: Array<number>,
			clearDepth?: number,
			clearStencil?: number,
		}
	) {
		if (target != null) {
			throw 'Framebuffer target not yet supported';
		}
	}

}

export default RenderPass;