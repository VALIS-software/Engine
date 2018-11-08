/**
 * Scene tree node
 * - Type parameter is used to constrain the type of the node's children
 * - Scene information flows from the roots to the leaves – by design, nodes only have knowledge about their children, not their parents
 */
export declare class Node<T extends Node<any>> {
    children: Iterable<T>;
    add(child: T): void;
    has(child: T): boolean;
    remove(child: T): boolean;
    /**
     * Add or remove a child element based on the value flag
     * Useful for toggling the visibility of a node by removing or adding it to the scene-graph
     */
    toggleChild(node: T, value: boolean): void;
    applyTransformToSubNodes(root?: boolean): void;
    forEachSubNode(callback: (n: T) => void): void;
}
export default Node;
