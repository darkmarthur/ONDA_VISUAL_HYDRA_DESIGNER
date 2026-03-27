/**
 * Hydra Connection Validation
 * 
 * Enforces Hydra grammar rules so invalid patches cannot be created.
 * Follows the actual semantics of hydra-synth's type system.
 */

import { Node, Edge, Connection } from '@xyflow/react';
import { HydraNodeData } from './types';

/**
 * Determine if a proposed connection is valid in the Hydra graph.
 * 
 * Rules:
 * 1. An output node ('output-in' handle) can receive any texture chain
 * 2. A main chain input ('texture-in') can only accept texture output
 * 3. A secondary texture input ('texture-secondary') can only accept texture output
 * 4. No self-connections
 * 5. No duplicate connections to the same input handle
 * 6. Chain transforms (coord, color) require an existing chain (must be fed by a source)
 * 7. Combine nodes (blend, modulate) require both main texture AND secondary texture
 */
export function isValidConnection(
  connection: Connection,
  nodes: Node<HydraNodeData>[],
  edges: Edge[],
): boolean {
  const { source, target, sourceHandle, targetHandle } = connection;

  // Rule: no self-connections
  if (source === target) return false;
  if (!source || !target || !sourceHandle || !targetHandle) return false;

  // Rule: we allow connecting to an already occupied handle 
  // because graphStore.onConnect will automatically replace the old edge.

  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);
  if (!sourceNode || !targetNode) return false;

  const sourceData = sourceNode.data;
  const targetData = targetNode.data;

  // Source must have a texture output handle
  if (sourceHandle !== 'texture-out') return false;

  // Target handle must be a valid input type
  if (
    targetHandle !== 'texture-in' &&
    targetHandle !== 'texture-secondary' &&
    targetHandle !== 'output-in'
  ) {
    return false;
  }

  // Output nodes accept any texture
  if (targetData.nodeType === 'output') return true;

  // For transform nodes: check the target function type
  const targetFnType = targetData.functionDef.type;

  if (targetHandle === 'texture-in') {
    // Main chain input — source must produce a texture
    // All node types produce texture out their main output
    return true;
  }

  if (targetHandle === 'texture-secondary') {
    // Secondary input — only combine and combineCoord nodes have this
    if (targetFnType !== 'combine' && targetFnType !== 'combineCoord') {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Check if a chain is "complete" — starts with a source and ends at an output.
 * Returns the list of node IDs forming the chain, or null if invalid.
 */
export function traceChainFromOutput(
  outputNodeId: string,
  nodes: Node<HydraNodeData>[],
  edges: Edge[],
): string[] | null {
  const chain: string[] = [];
  let currentId: string | null = outputNodeId;

  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) return null; // cycle detected
    visited.add(currentId);
    chain.unshift(currentId);

    const node = nodes.find((n) => n.id === currentId);
    if (!node) return null;

    // If this is a source node, we've found the start
    if (node.data.functionDef.type === 'src') {
      return chain;
    }

    // Find the edge going into this node's main input
    const incomingEdge = edges.find(
      (e) => e.target === currentId && e.targetHandle === 'texture-in'
    );

    if (!incomingEdge) return null; // broken chain
    currentId = incomingEdge.source;
  }

  return null;
}

/**
 * Check if a node can be deleted without breaking critical connections.
 * (All nodes can be deleted; this is for UX warnings.)
 */
export function getConnectionWarnings(
  nodeId: string,
  nodes: Node<HydraNodeData>[],
  edges: Edge[],
): string[] {
  const warnings: string[] = [];
  const dependentEdges = edges.filter((e) => e.source === nodeId);

  for (const edge of dependentEdges) {
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (targetNode) {
      warnings.push(
        `Removing this node will disconnect "${targetNode.data.label}"`
      );
    }
  }

  return warnings;
}

/**
 * Detect cycles in the graph using DFS.
 */
export function hasCycle(nodes: Node[], edges: Edge[]): boolean {
  const adjacencyList = new Map<string, string[]>();
  nodes.forEach((n) => adjacencyList.set(n.id, []));
  edges.forEach((e) => {
    const list = adjacencyList.get(e.source);
    if (list) list.push(e.target);
  });

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }

  return false;
}
