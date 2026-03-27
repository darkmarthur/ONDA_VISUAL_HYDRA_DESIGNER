/**
 * Hydra Code Generation (Modular & Robust)
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
 */
export function generateHydraCode(
  nodes: Node<HydraNodeData>[],
  edges: Edge[],
): string {
  try {
    // Strategy: Find all nodes that have no OUTGOING edges.
    const terminalNodes = nodes.filter((n) => {
      const outgoing = edges.some((e) => e.source === n.id);
      return !outgoing;
    });

    if (nodes.length === 0) return '// Add nodes to generate Hydra code';

    const codeLines: string[] = [];

    for (const node of terminalNodes) {
      if (node.data.nodeType === 'output') {
        const chain = buildChainFromOutput(node, nodes, edges);
        if (chain) codeLines.push(chain.code);
      } else {
        // Orphan chain that doesn't go into an output (maybe just loose nodes)
        const expr = buildNodeExpression(node.id, nodes, edges, new Set(), false);
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
 * Trace from an output node back to its source.
 */
function buildChainFromOutput(
  outputNode: Node<HydraNodeData>,
  nodes: Node<HydraNodeData>[],
  edges: Edge[],
): CodeLine | null {
  const inputEdge = edges.find(
    (e) => e.target === outputNode.id && e.targetHandle === 'output-in'
  );

  if (!inputEdge) return null;

  const outputBuffer = (outputNode.data.params.buffer ?? 0) as number;
  const bufferName = `o${outputBuffer}` as HydraOutput;

  const chainCode = buildNodeExpression(inputEdge.source, nodes, edges, new Set(), false);
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
  isNested: boolean = false
): string | null {
  if (visited.has(nodeId)) return null; 
  visited.add(nodeId);

  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const fnDef = node.data.functionDef;
  const fnName = node.data.hydraFunction;
  const alias = node.data.alias;

  const paramsData = { values: node.data.params, bindings: node.data.bindings || {} };
  const paramStr = buildParamString(fnDef.params, paramsData, nodes);

  const formatAlias = (prefix: string) => {
    if (isNested) return prefix; // No comments or newlines for nested code
    if (!alias) return `\n${prefix}`;
    const safeAlias = alias.replace(/"/g, '\\"');
    return `\n// node_label: "${safeAlias}"\n${prefix}`;
  };

  if (fnDef.type === 'src') {
    let base = `${fnName}(${paramStr})`;
    if (fnName === 'src') {
      const buf = node.data.params.buffer ?? 0;
      // Determine if buf is a literal like 'o0' or just a number
      const fullBuf = /^[os][0-3]$/.test(String(buf)) ? String(buf) : `o${buf}`;
      base = `src(${fullBuf})`;
    }
    
    if (isNested) return base;
    
    const safeAlias = alias?.replace(/"/g, '\\"');
    return safeAlias ? `// node_label: "${safeAlias}"\n${base}` : base;
  }

  const mainInputEdge = edges.find(
    (e) => e.target === nodeId && e.targetHandle === 'texture-in'
  );

  if (!mainInputEdge) return null;

  const parentExpr = buildNodeExpression(
    mainInputEdge.source,
    nodes,
    edges,
    visited,
    isNested
  );
  if (!parentExpr) return null;

  // Combine textures (modulate, diff, mask...)
  if (fnDef.type === 'combine' || fnDef.type === 'combineCoord') {
    const secondaryEdge = edges.find(
      (e) => e.target === nodeId && (e.targetHandle === 'texture-secondary' || e.targetHandle === 'texture')
    );

    if (secondaryEdge) {
      const secondaryExpr = buildNodeExpression(
        secondaryEdge.source,
        nodes,
        edges,
        new Set(visited),
        true // secondary chain is nested
      );

      if (secondaryExpr) {
        const allParams = paramStr ? `, ${paramStr}` : '';
        return `${parentExpr}${formatAlias(`  .${fnName}(${secondaryExpr}${allParams})`)}`;
      }
    }
    
    // Fallback if no secondary edge found (maybe literal text)
    if (paramStr) return `${parentExpr}${formatAlias(`  .${fnName}(/* texture */, ${paramStr})`)}`;
    return `${parentExpr}${formatAlias(`  .${fnName}(/* texture */)`)}`;
  }

  if (paramStr) {
    return `${parentExpr}${formatAlias(`  .${fnName}(${paramStr})`)}`;
  }
  return `${parentExpr}${formatAlias(`  .${fnName}()`)}`;
}

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

  const allDefaults = paramDefs.every((p, i) => {
     const binding = nodeData.bindings[p.name];
     if (binding && binding.mode !== 'literal') return false;
     return (nodeData.values[p.name] ?? p.default) === p.default;
  });

  if (allDefaults) return '';

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

function getBoundParamValue(binding: any, nodes: Node<HydraNodeData>[]): string {
  if (binding.expression) {
    const expr = binding.expression as string;
    
    // Arrays and complex array method chains SHOULD NOT be wrapped in () =>
    // Hydra handles them as literal values or sequences.
    if (expr.startsWith('[') || expr.includes('=>') || expr.includes('function')) {
      return expr;
    }
    
    // Small numbers or time/mouse references can be wrapped
    if (/^[0-9.-]+$/.test(expr) || /^time|mouse|width|height|a\.fft/.test(expr)) {
      return `() => ${expr}`;
    }

    return expr;
  }

  if (binding.mode === 'value_node' && binding.boundNodeId) {
    const sourceNode = nodes.find(n => n.id === binding.boundNodeId);
    if (!sourceNode) return '0';

    const fn = sourceNode.data.hydraFunction;
    const params = sourceNode.data.params;
    
    // If it's a buffer reference in a 'src' node, return literal name
    if (fn === 'src' && /^(o[0-3]|s[0-3])$/.test(params.buffer)) {
      return params.buffer;
    }
    
    // If it's a value chain (like constant or sin), we already handle it
    if (fn === 'constant') {
      const key = binding.outputKey || Object.keys(params)[0];
      return `() => ${params[key] ?? 0}`;
    }
    
    if (fn === 'time' || fn === 'mouse.x' || fn === 'mouse.y') return `() => ${fn}`;
    
    return `() => 0`;
  }

  return '0';
}

function formatValue(v: any): string {
  if (typeof v === 'string') {
    if (v.startsWith('[') && v.endsWith(']')) return v;
    if (v.includes('=>')) return v;
    return `"${v.replace(/"/g, '\\"')}"`;
  }
  if (typeof v === 'number') {
    if (v % 1 === 0) return v.toString();
    return v.toFixed(3).replace(/\.?0+$/, '');
  }
  return String(v);
}
