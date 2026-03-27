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
  try {
    // Strategy: Find all nodes that have no OUTGOING edges.
    // These are the "terminals" of their respective subgraphs.
    const terminalNodes = nodes.filter((n) => {
      const outgoing = edges.some((e) => e.source === n.id);
      return !outgoing;
    });

    if (terminalNodes.length === 0 && nodes.length > 0) {
      // If we have nodes but all are in a loop (unlikely but possible), 
      // or if we have only nodes with outgoing edges (mismatch).
      // Let's just pick all sources then.
      return `// No terminal nodes found. Graph state:\n// Nodes: ${nodes.length}, Edges: ${edges.length}`;
    }

    if (nodes.length === 0) return '// Add nodes to generate Hydra code';

    const codeLines: string[] = [];
    const processedNodes = new Set<string>();

    for (const node of terminalNodes) {
      if (node.data.nodeType === 'output') {
        const chain = buildChainFromOutput(node, nodes, edges);
        if (chain) codeLines.push(chain.code);
      } else {
        const expr = buildNodeExpression(node.id, nodes, edges, new Set());
        if (expr) codeLines.push(expr);
      }
    }

    if (codeLines.length === 0) {
      return '// Connect nodes to build a visual chain';
    }

    return codeLines.join('\n\n');
  } catch (err) {
    console.error('Code generation failed:', err);
    return `// Code generation failed: ${err instanceof Error ? err.message : String(err)}`;
  }
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
  const alias = node.data.alias;

  // Build the parameter list for this function call
  const paramsData = { values: node.data.params, bindings: node.data.bindings || {} };
  const paramStr = buildParamString(fnDef.params, paramsData, nodes);

  const formatAlias = (prefix: string) => {
    if (!alias) return `\n${prefix}`;
    const safeAlias = alias.replace(/"/g, '\\"');
    return `\n// node_label: "${safeAlias}"\n${prefix}`;
  };

  if (fnDef.type === 'src') {
    // Source node — this is the start of a chain
    // Check if it's a 'src' function referencing a buffer
    if (fnName === 'src') {
      const bufferIdx = params.buffer ?? 0;
      return alias ? `// node_label: "${alias.replace(/"/g, '\\"')}"\nsrc(o${bufferIdx})` : `src(o${bufferIdx})`;
    }
    return alias ? `// node_label: "${alias.replace(/"/g, '\\"')}"\n${fnName}(${paramStr})` : `${fnName}(${paramStr})`;
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
        return `${parentExpr}${formatAlias(`  .${fnName}(${secondaryExpr}${allParams})`)}`;
      }
    }

    // If no secondary connected, still generate with empty secondary
    // (will be invalid Hydra but shows intent)
    if (paramStr) {
      return `${parentExpr}${formatAlias(`  .${fnName}(/* texture */, ${paramStr})`)}`;
    }
    return `${parentExpr}${formatAlias(`  .${fnName}(/* texture */)`)}`;
  }

  // Regular coord/color transform — just chain it
  if (paramStr) {
    return `${parentExpr}${formatAlias(`  .${fnName}(${paramStr})`)}`;
  }
  return `${parentExpr}${formatAlias(`  .${fnName}()`)}`;
}

/**
 * Build the parameter string for a function call.
 */
function buildParamString(
  paramDefs: any[],
  nodeData: { values: Record<string, any>; bindings: Record<string, any> },
  nodes: Node<HydraNodeData>[]
): string {
  if (paramDefs.length === 0) return '';

  const values = paramDefs.map((p) => {
    const binding = nodeData.bindings[p.name];
    if (binding && binding.mode !== 'literal') {
       return getBoundParamValue(binding, nodes);
    }
    return formatValue(nodeData.values[p.name] ?? p.default);
  });

  // Check if all are defaults to keep code clean
  const allDefaults = paramDefs.every((p, i) => {
     const binding = nodeData.bindings[p.name];
     if (binding && binding.mode !== 'literal') return false;
     return (nodeData.values[p.name] ?? p.default) === p.default;
  });

  if (allDefaults) return '';

  // Trim trailing defaults
  let lastRelevant = values.length - 1;
  while (lastRelevant >= 0) {
    const p = paramDefs[lastRelevant];
    const binding = nodeData.bindings[p.name];
    if (binding && binding.mode !== 'literal') break;
    if ((nodeData.values[p.name] ?? p.default) !== p.default) break;
    lastRelevant--;
  }

  if (lastRelevant < 0) return '';
  return values.slice(0, lastRelevant + 1).join(', ');
}

/**
 * Resolves a binding to its Hydra code representation.
 */
function getBoundParamValue(binding: any, nodes: Node<HydraNodeData>[]): string {
  // If we have a custom expression defined by the user, prioritize it
  if (binding.expression) {
    const expr = binding.expression;
    // Don't double-wrap if it's already a lambda
    if (expr.includes('=>') || expr.includes('function')) return expr;
    return `() => ${expr}`;
  }

  if (binding.mode === 'array_sequence') return binding.expression || '[]';
  
  if (binding.mode === 'value_node' && binding.boundNodeId) {
    const sourceNode = nodes.find(n => n.id === binding.boundNodeId);
    if (!sourceNode) return '0';

    const fn = sourceNode.data.hydraFunction;
    const params = sourceNode.data.params;
    const innerBindings = sourceNode.data.bindings || {};

    // Use custom body from value producing nodes if it exists
    if (params.body !== undefined) {
       const body = params.body as string;
       return body.includes('=>') ? body : `() => ${body}`;
    }

    if (fn === 'time') return '() => time';
    if (fn === 'mouse.x') return '() => mouse.x';
    if (fn === 'mouse.y') return '() => mouse.y';
    if (fn === 'width') return '() => width';
    if (fn === 'height') return '() => height';
    
    if (fn === 'fft') {
      const bin = params.bin ?? 0;
      return `() => a.fft[${bin}]`;
    }

    if (fn === 'sin' || fn === 'cos') {
      const val = getInnerParamValue('value', params.value, innerBindings.value, nodes);
      const mult = getInnerParamValue('mult', params.mult ?? 1, innerBindings.mult, nodes);
      const offset = getInnerParamValue('offset', params.offset ?? 0, innerBindings.offset, nodes);
      return `() => Math.${fn}(${val}) * ${mult} + ${offset}`;
    }

    if (fn === 'mod') {
      const val = getInnerParamValue('value', params.value, innerBindings.value, nodes);
      const div = getInnerParamValue('divisor', params.divisor ?? 1, innerBindings.divisor, nodes);
      return `() => ${val} % ${div}`;
    }

    return '() => 0';
  }

  return '0';
}

function getInnerParamValue(name: string, literal: any, binding: any, nodes: Node<HydraNodeData>[]): string {
  if (binding && binding.mode !== 'literal') {
    const res = getBoundParamValue(binding, nodes);
    return res.startsWith('() => ') ? res.substring(6) : res; // Extract inner expr
  }
  return formatValue(literal);
}

/**
 * Format any value for Hydra code output.
 */
function formatValue(v: any): string {
  if (typeof v === 'number') return formatNumber(v);
  if (typeof v === 'string') return `"${v.replace(/"/g, '\\"')}"`;
  if (Array.isArray(v)) return `[${v.map(formatValue).join(', ')}]`;
  return String(v);
}

/**
 * Format a number for Hydra code output.
 */
function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  // Use fixed precision for cleaner output, stripping trailing zeros
  return parseFloat(n.toFixed(4)).toString();
}
