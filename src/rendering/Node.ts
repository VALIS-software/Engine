/**
 * Scene tree node
 * - Type parameter is used to constrain the type of the node's children
 * - Scene information flows from the roots to the leaves – by design, nodes only have knowledge about their children, not their parents
 */
export class Node<T extends Node<any>> {

	children: Iterable<T> = new Set<T>();

	add(child: T) {
		(this.children as Set<T>).add(child);
	}

	has(child: T) {
		return (this.children as Set<T>).has(child);
	}

	remove(child: T) {
		return (this.children as Set<T>).delete(child);
	}
	
	/**
	 * Add or remove a child element based on the value flag
	 * Useful for toggling the visibility of a node by removing or adding it to the scene-graph
	 * @param child 
	 * @param value 
	 */
	toggleChild(node: T, value: boolean) {
		if (value && !this.has(node)) {
			this.add(node);
		} else if (this.has(node)) {
			this.remove(node);
		}
	}

	applyTransformToSubNodes(root: boolean = true) {
		for (let child of this.children) {
			child.applyTransformToSubNodes(true);
		}
	}

	forEachSubNode(callback: (n: T) => void) {
		for (let child of this.children) {
			callback(child);
			child.forEachSubNode(callback);
		}
	}

}

export default Node;