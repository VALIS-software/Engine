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