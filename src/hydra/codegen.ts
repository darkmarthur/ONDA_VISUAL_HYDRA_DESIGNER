/**
 * Hydra Code Generation
 * 
 * Converts the visual node graph into valid Hydra code.
 * Walks backwards from output nodes to source nodes,
 * building proper method chains.
 */

import { Node, Edge } from '@xyflow/react';
import { HydraNodeData, HydraOutput } from './types';

interface CodeLine {
  code: string;
  outputBuffer: HydraOutput;
}

/**
 * Generate complete Hydra code from the node graph.
 * Finds all output nodes and traces each chain back to its source.
 */
export function generateHydraCode(
  nodes: Node<HydraNodeData>[],
  edges: Edge[],
): string {
  const outputNodes = nodes.filter((n) => n.data.nodeType === 'output');

  if (outputNodes.length === 0) return '// No output nodes connected';

  const codeLines: CodeLine[] = [];

  for (const outputNode of outputNodes) {
    const chain = buildChainFromOutput(outputNode, nodes, edges);
    if (chain) {
      codeLines.push(chain);
    }
  }

  if (codeLines.length === 0) {
    return '// Connect a source to an output to generate code';
  }

  // Sort by output buffer for consistent ordering
  codeLines.sort((a, b) => a.outputBuffer.localeCompare(b.outputBuffer));

  return codeLines.map((l) => l.code).join('\n\n');
}

/**
 * Build a Hydra code string by tracing from an output node back to its source.
 */
function buildChainFromOutput(
  outputNode: Node<HydraNodeData>,
  nodes: Node<HydraNodeData>[],
  edges: Edge[],
): CodeLine | null {
  // Find the edge connected to this output's input
  const inputEdge = edges.find(
    (e) => e.target === outputNode.id && e.targetHandle === 'output-in'
  );

  if (!inputEdge) return null;

  const outputBuffer = (outputNode.data.params.buffer ?? 0) as number;
  const bufferName = `o${outputBuffer}` as HydraOutput;

  // Build the chain expression
  const chainCode = buildNodeExpression(inputEdge.source, nodes, edges, new Set());
  if (!chainCode) return null;

  return {
    code: `${chainCode}\n  .out(${bufferName})`,
    outputBuffer: bufferName,
  };
}

/**
 * Recursively build the expression for a node and its chain.
 */
function buildNodeExpression(
  nodeId: string,
  nodes: Node<HydraNodeData>[],
  edges: Edge[],
  visited: Set<string>,
): string | null {
  if (visited.has(nodeId)) return null; // cycle guard
  visited.add(nodeId);

  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const fnDef = node.data.functionDef;
  const fnName = node.data.hydraFunction;
  const params = node.data.params;

  // Build the parameter list for this function call
  const paramStr = buildParamString(fnDef.params, params);

  if (fnDef.type === 'src') {
    // Source node — this is the start of a chain
    // Check if it's a 'src' function referencing a buffer
    if (fnName === 'src') {
      const bufferIdx = params.buffer ?? 0;
      return `src(o${bufferIdx})`;
    }
    return `${fnName}(${paramStr})`;
  }

  // For transform nodes (coord, color, combine, combineCoord),
  // find the incoming main chain
  const mainInputEdge = edges.find(
    (e) => e.target === nodeId && e.targetHandle === 'texture-in'
  );

  if (!mainInputEdge) return null;

  const parentExpr = buildNodeExpression(
    mainInputEdge.source,
    nodes,
    edges,
    visited,
  );
  if (!parentExpr) return null;

  // For combine/combineCoord nodes, also need secondary texture
  if (fnDef.type === 'combine' || fnDef.type === 'combineCoord') {
    const secondaryEdge = edges.find(
      (e) => e.target === nodeId && e.targetHandle === 'texture-secondary'
    );

    if (secondaryEdge) {
      const secondaryExpr = buildNodeExpression(
        secondaryEdge.source,
        nodes,
        edges,
        new Set(visited), // separate visited set for secondary chain
      );

      if (secondaryExpr) {
        const allParams = paramStr ? `, ${paramStr}` : '';
        return `${parentExpr}\n  .${fnName}(${secondaryExpr}${allParams})`;
      }
    }

    // If no secondary connected, still generate with empty secondary
    // (will be invalid Hydra but shows intent)
    if (paramStr) {
      return `${parentExpr}\n  .${fnName}(/* texture */, ${paramStr})`;
    }
    return `${parentExpr}\n  .${fnName}(/* texture */)`;
  }

  // Regular coord/color transform — just chain it
  if (paramStr) {
    return `${parentExpr}\n  .${fnName}(${paramStr})`;
  }
  return `${parentExpr}\n  .${fnName}()`;
}

/**
 * Build the parameter string for a function call.
 * Only includes parameters that differ from defaults, for cleaner output.
 * If all params are default, returns empty string (uses Hydra defaults).
 */
function buildParamString(
  paramDefs: { name: string; default: number }[],
  paramValues: Record<string, number>,
): string {
  if (paramDefs.length === 0) return '';

  // Check if all values are at their defaults
  const allDefaults = paramDefs.every(
    (p) => (paramValues[p.name] ?? p.default) === p.default
  );

  if (allDefaults) return '';

  // Build parameter values array, trimming trailing defaults
  const values = paramDefs.map((p) => paramValues[p.name] ?? p.default);

  // Trim trailing defaults
  let lastNonDefault = values.length - 1;
  while (lastNonDefault >= 0 && values[lastNonDefault] === paramDefs[lastNonDefault].default) {
    lastNonDefault--;
  }

  if (lastNonDefault < 0) return '';

  return values
    .slice(0, lastNonDefault + 1)
    .map((v) => formatNumber(v))
    .join(', ');
}

/**
 * Format a number for Hydra code output.
 */
function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  // Use fixed precision for cleaner output, stripping trailing zeros
  return parseFloat(n.toFixed(4)).toString();
}
