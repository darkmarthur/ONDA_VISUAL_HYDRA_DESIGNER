/**
 * Graph Store — Zustand state management
 * 
 * Central state for the node editor: nodes, edges, selected node,
 * generated code, and persistence.
 */

import { create } from 'zustand';
import { temporal } from 'zundo';
import {
  Node,
  Edge,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import { HydraNodeData, HydraOutput, HydraNodeType } from '@/hydra/types';
import { getHydraFunction } from '@/hydra/registry';
import { isValidConnection } from '@/hydra/validation';
import { generateHydraCode } from '@/hydra/codegen';

interface GraphState {
  // ─── Core graph data ─────────────────────────────────────────────────────
  nodes: Node<HydraNodeData>[];
  edges: Edge[];
  
  // ─── UI state ────────────────────────────────────────────────────────────
  selectedNodeId: string | null;
  generatedCode: string;
  hydraError: string | null;
  editorMode: 'visual' | 'code';
  showPreview: boolean;
  showMiniMap: boolean;
  activeDraftConnection: { nodeId: string; handleId: string | null; handleType: 'source' | 'target' | null } | null;

  // ─── Actions ─────────────────────────────────────────────────────────────
  onNodesChange: (changes: NodeChange<Node<HydraNodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (hydraFunctionName: string, position: { x: number; y: number }) => void;
  insertNodeOnEdge: (edgeId: string, hydraFunctionName: string) => void;
  addAndConnectNode: (hydraFunctionName: string, position: { x: number; y: number }, connectFrom: { nodeId: string; handleId: string | null; handleType: string | null }) => void;
  removeNode: (nodeId: string) => void;
  setNodeAlias: (nodeId: string, alias: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  removeEdge: (edgeId: string) => void;
  updateNodeParam: (nodeId: string, paramName: string, value: number) => void;
  updateOutputBuffer: (nodeId: string, buffer: number) => void;
  setHydraError: (error: string | null) => void;
  regenerateCode: () => void;
  updateGraphFromCode: (newCode: string) => void;
  setEditorMode: (mode: 'visual' | 'code') => void;
  setShowPreview: (show: boolean) => void;
  setShowMiniMap: (show: boolean) => void;
  setActiveDraftConnection: (conn: { nodeId: string; handleId: string | null; handleType: 'source' | 'target' | null } | null) => void;
  clearGraph: () => void;
  serializeGraph: () => string;
  deserializeGraph: (json: string) => void;
  savePatch: (name: string) => void;
  loadPatch: (name: string) => boolean;
  getSavedPatches: () => string[];
}

let nodeIdCounter = 0;

function generateNodeId(): string {
  return `node_${Date.now()}_${nodeIdCounter++}`;
}

function determineNodeType(hydraType: string): HydraNodeType {
  if (hydraType === 'src') return 'source';
  return 'transform';
}

export const useGraphStore = create<GraphState>()(
  temporal(
    (set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  generatedCode: '// Add nodes and connect them to generate Hydra code',
  hydraError: null,
  editorMode: 'visual',
  showPreview: true,
  showMiniMap: true,
  activeDraftConnection: null,

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as Node<HydraNodeData>[],
    }));
    // Regenerate code after positional changes settle
    // (we skip this for position-only changes for performance)
    const hasStructuralChange = changes.some(
      (c) => c.type === 'remove' || c.type === 'add'
    );
    if (hasStructuralChange) {
      get().regenerateCode();
    }
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
    const hasStructuralChange = changes.some(
      (c) => c.type === 'remove' || c.type === 'add'
    );
    if (hasStructuralChange) {
      get().regenerateCode();
    }
  },

  onConnect: (connection) => {
    const { nodes, edges } = get();
    if (!isValidConnection(connection, nodes, edges)) return;

    // Remove existing edge to same target handle (replace connection)
    const newEdges = edges.filter(
      (e) =>
        !(e.target === connection.target && e.targetHandle === connection.targetHandle)
    );

    // Get source node color for the edge
    const sourceNode = nodes.find(n => n.id === connection.source);
    let edgeColor = '#6366f1'; // default accent-primary
    if (sourceNode) {
      const category = sourceNode.data.functionDef.category;
      const meta = require('@/hydra/registry').categoryMeta[category];
      if (meta) {
        edgeColor = meta.color;
      }
    }

    const newConnection = {
      ...connection,
      animated: true,
      style: { stroke: edgeColor, strokeWidth: 2 },
    };

    set({ edges: addEdge(newConnection, newEdges) });
    get().regenerateCode();
  },

  addNode: (hydraFunctionName, position) => {
    const fnDef = getHydraFunction(hydraFunctionName);
    if (!fnDef) return;

    // Build default parameter values
    const params: Record<string, number> = {};
    fnDef.params.forEach((p) => {
      params[p.name] = p.default;
    });

    const nodeType = determineNodeType(fnDef.type);

    const newNode: Node<HydraNodeData> = {
      id: generateNodeId(),
      type: nodeType === 'source' ? 'hydraSource' : 'hydraTransform',
      position,
      data: {
        hydraFunction: hydraFunctionName,
        functionDef: fnDef,
        params,
        label: hydraFunctionName,
        nodeType,
      },
    };

    set((state) => ({ nodes: [...state.nodes, newNode] }));
  },

  addAndConnectNode: (hydraFunctionName, position, connectFrom) => {
    // Add the node
    const fnDef = getHydraFunction(hydraFunctionName);
    if (!fnDef) return;

    const params: Record<string, number> = {};
    fnDef.params.forEach((p) => { params[p.name] = p.default; });

    const nodeType = determineNodeType(fnDef.type);
    const newNodeId = generateNodeId();

    const newNode: Node<HydraNodeData> = {
      id: newNodeId,
      type: nodeType === 'source' ? 'hydraSource' : 'hydraTransform',
      position,
      data: {
        hydraFunction: hydraFunctionName,
        functionDef: fnDef,
        params,
        label: hydraFunctionName,
        nodeType,
      },
    };

    // Build the connection edge
    // Are we pulling from a source output or from a target input backwards?
    let newEdge: Edge | null = null;
    let edgeColor = '#6366f1';
    
    if (connectFrom.handleType === 'source') {
      // Pulling from an output, connecting to the new node's input.
      const sourceNode = get().nodes.find(n => n.id === connectFrom.nodeId);
      if (sourceNode) {
        const cat = sourceNode.data.functionDef.category;
        const meta = require('@/hydra/registry').categoryMeta[cat];
        if (meta) edgeColor = meta.color;
      }

      newEdge = {
        id: `e-${connectFrom.nodeId}-${newNodeId}`,
        source: connectFrom.nodeId,
        sourceHandle: connectFrom.handleId,
        target: newNodeId,
        targetHandle: 'texture-in',
        animated: true,
        style: { stroke: edgeColor, strokeWidth: 2 },
      };
    } else {
      // Pulling backward from a target input, connecting the new node's output to it.
      const cat = fnDef.category;
      const meta = require('@/hydra/registry').categoryMeta[cat];
      if (meta) edgeColor = meta.color;

      newEdge = {
        id: `e-${newNodeId}-${connectFrom.nodeId}`,
        source: newNodeId,
        sourceHandle: 'texture-out',
        target: connectFrom.nodeId,
        targetHandle: connectFrom.handleId,
        animated: true,
        style: { stroke: edgeColor, strokeWidth: 2 },
      };
    }

    // Now validate it semantically to make sure we don't insert absurd connections
    // Actually validation is optional here since we already filter the menu choices,
    // but React Flow edges just snap based on type.
    
    set((state) => ({ 
      nodes: [...state.nodes, newNode],
      edges: newEdge ? [...state.edges, newEdge] : state.edges 
    }));
    get().regenerateCode();
  },

  insertNodeOnEdge: (edgeId, hydraFunctionName) => {
    const { nodes, edges } = get();
    const edge = edges.find((e) => e.id === edgeId);
    if (!edge) return;

    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) return;

    // Obtain function definition and build new node
    const fnDef = require('@/hydra/registry').getHydraFunction(hydraFunctionName);
    if (!fnDef) return;

    const params: Record<string, number> = {};
    fnDef.params.forEach((p: any) => {
      params[p.name] = p.default;
    });

    const nodeType = determineNodeType(fnDef.type);
    const newNodeId = generateNodeId();

    const newNode: Node<HydraNodeData> = {
      id: newNodeId,
      type: nodeType === 'source' ? 'hydraSource' : 'hydraTransform',
      position: {
        x: (sourceNode.position.x + targetNode.position.x) / 2,
        y: (sourceNode.position.y + targetNode.position.y) / 2,
      },
      data: {
        hydraFunction: hydraFunctionName,
        functionDef: fnDef,
        params,
        label: hydraFunctionName,
        nodeType,
      },
    };

    // Calculate edge colors
    let sourceColor = '#6366f1';
    const sourceCatMeta = require('@/hydra/registry').categoryMeta[sourceNode.data.functionDef.category];
    if (sourceCatMeta) sourceColor = sourceCatMeta.color;

    let newColor = '#6366f1';
    const newCatMeta = require('@/hydra/registry').categoryMeta[fnDef.category];
    if (newCatMeta) newColor = newCatMeta.color;

    // Create intermediate edges
    const edge1: Edge = {
      id: `e-${edge.source}-${newNodeId}`,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: newNodeId,
      targetHandle: 'texture-in',
      animated: true,
      style: { stroke: sourceColor, strokeWidth: 2 },
    };

    const edge2: Edge = {
      id: `e-${newNodeId}-${edge.target}`,
      source: newNodeId,
      sourceHandle: 'texture-out',
      target: edge.target,
      targetHandle: edge.targetHandle,
      animated: true,
      style: { stroke: newColor, strokeWidth: 2 },
    };

    const newEdges = edges.filter((e) => e.id !== edgeId).concat([edge1, edge2]);

    set((state) => ({
      nodes: [...state.nodes, newNode],
      edges: newEdges,
    }));

    get().regenerateCode();
  },

  removeNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    }));
    get().regenerateCode();
  },

  removeEdge: (edgeId) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
    }));
    get().regenerateCode();
  },

  setSelectedNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  setNodeAlias: (nodeId, alias) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: { ...n.data, alias },
            }
          : n
      ),
    }));
    get().regenerateCode();
  },

  updateNodeParam: (nodeId, paramName, value) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                params: { ...n.data.params, [paramName]: value },
              },
            }
          : n
      ),
    }));
    get().regenerateCode();
  },

  updateOutputBuffer: (nodeId, buffer) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                params: { ...n.data.params, buffer },
              },
            }
          : n
      ),
    }));
    get().regenerateCode();
  },

  setHydraError: (error) => {
    set({ hydraError: error });
  },

  regenerateCode: () => {
    const { nodes, edges } = get();
    const code = generateHydraCode(nodes, edges);
    set({ generatedCode: code });
    // Write to localStorage for the external live view window
    try {
      localStorage.setItem('hydra-live-code', code);
      // Dispatch storage event manually for same-window popups
      window.dispatchEvent(new Event('storage'));
    } catch {}
  },

  updateGraphFromCode: (newCode) => {
    // Sync parameter changes back to the graph from raw code editing
    const nodes = get().nodes;
    let updatedNodes = [...nodes];
    
    // To handle multiple identical functions, keep track of which occurrence we're matching
    const funcOccurrences: Record<string, number> = {};
    
    // First let's extract all functions with their parameters in order
    const fnRegex = /(\w+)\s*\(([^)]*)\)/g;
    let match;
    while ((match = fnRegex.exec(newCode)) !== null) {
      const funcName = match[1];
      const argsStr = match[2];
      const args = argsStr.split(',').map(s => parseFloat(s.trim()));
      
      const occurrencesSoFar = funcOccurrences[funcName] || 0;
      const matchingNodes = updatedNodes.filter(n => n.data.hydraFunction === funcName);
      const nodeIndex = updatedNodes.findIndex(n => n.id === matchingNodes[Math.min(occurrencesSoFar, matchingNodes.length - 1)]?.id);
      
      if (nodeIndex >= 0) {
        const node = updatedNodes[nodeIndex];
        const newParams = { ...node.data.params };
        
        node.data.functionDef.params.forEach((paramDef, i) => {
          if (args[i] !== undefined && !isNaN(args[i])) {
            newParams[paramDef.name] = args[i];
          }
        });
        
        updatedNodes[nodeIndex] = {
          ...node,
          data: { ...node.data, params: newParams }
        };
      }
      funcOccurrences[funcName] = occurrencesSoFar + 1;
    }

    // Now extract node aliases
    // Looks for: // node_label: "my alias"\n.function(
    const aliasOccurrences: Record<string, number> = {};
    const aliasRegex = /\/\/\s*node_label:\s*"([^"]+)"\s*(?:\r\n|\n|\s)*\.?(\w+)\s*\(/g;
    let aliasMatch;
    while ((aliasMatch = aliasRegex.exec(newCode)) !== null) {
      const alias = aliasMatch[1];
      const fnName = aliasMatch[2];
      
      const occurrencesSoFar = aliasOccurrences[fnName] || 0;
      const matchingNodes = updatedNodes.filter(n => n.data.hydraFunction === fnName);
      const nodeIndex = updatedNodes.findIndex(n => n.id === matchingNodes[Math.min(occurrencesSoFar, matchingNodes.length - 1)]?.id);
      
      if (nodeIndex >= 0) {
        updatedNodes[nodeIndex] = {
           ...updatedNodes[nodeIndex],
           data: { ...updatedNodes[nodeIndex].data, alias }
        };
      }
      aliasOccurrences[fnName] = occurrencesSoFar + 1;
    }
    
    set({ nodes: updatedNodes, generatedCode: newCode });
    // Write to localStorage for the external live view window
    try {
      localStorage.setItem('hydra-live-code', newCode);
      window.dispatchEvent(new Event('storage'));
    } catch {}
  },

  setEditorMode: (mode) => {
    set({ editorMode: mode });
  },

  setShowPreview: (show) => {
    set({ showPreview: show });
  },

  setShowMiniMap: (show) => {
    set({ showMiniMap: show });
  },
  setActiveDraftConnection: (conn) => {
    set({ activeDraftConnection: conn });
  },

  clearGraph: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      generatedCode: '// Add nodes and connect them to generate Hydra code',
    });
  },

  serializeGraph: () => {
    const { nodes, edges } = get();
    return JSON.stringify({
      version: '1.0.0',
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: {
          hydraFunction: n.data.hydraFunction,
          params: n.data.params,
        },
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
    });
  },

  deserializeGraph: (json) => {
    try {
      const parsed = JSON.parse(json);
      const restoredNodes: Node<HydraNodeData>[] = parsed.nodes
        .map((n: any) => {
          const fnDef = getHydraFunction(n.data.hydraFunction);
          if (!fnDef) return null;

          const nodeType = determineNodeType(fnDef.type);
          return {
            id: n.id,
            type: n.type || (nodeType === 'source' ? 'hydraSource' : 'hydraTransform'),
            position: n.position,
            data: {
              hydraFunction: n.data.hydraFunction,
              functionDef: fnDef,
              params: n.data.params,
              label: n.data.hydraFunction,
              nodeType,
            },
          };
        })
        .filter(Boolean) as Node<HydraNodeData>[];

      set({
        nodes: restoredNodes,
        edges: parsed.edges,
        selectedNodeId: null,
      });
      get().regenerateCode();
    } catch (err) {
      console.error('Failed to deserialize graph:', err);
    }
  },

  savePatch: (name) => {
    const json = get().serializeGraph();
    try {
      const saved = JSON.parse(localStorage.getItem('hydra-patches') || '{}');
      saved[name] = {
        data: json,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('hydra-patches', JSON.stringify(saved));
    } catch (err) {
      console.error('Failed to save patch:', err);
    }
  },

  loadPatch: (name) => {
    try {
      const saved = JSON.parse(localStorage.getItem('hydra-patches') || '{}');
      if (saved[name]) {
        get().deserializeGraph(saved[name].data);
        return true;
      }
    } catch (err) {
      console.error('Failed to load patch:', err);
    }
    return false;
  },

  getSavedPatches: () => {
    try {
      const saved = JSON.parse(localStorage.getItem('hydra-patches') || '{}');
      return Object.keys(saved);
    } catch {
      return [];
    }
  },
}),
  {
    partialize: (state) => ({
      nodes: state.nodes,
      edges: state.edges,
      generatedCode: state.generatedCode,
      selectedNodeId: state.selectedNodeId
    }),
  }
));

// ─── Output node factory ─────────────────────────────────────────────────────
export function addOutputNode(
  buffer: HydraOutput,
  position: { x: number; y: number },
): void {
  const store = useGraphStore.getState();
  const bufferIndex = parseInt(buffer.slice(1), 10);

  const newNode: Node<HydraNodeData> = {
    id: generateNodeId(),
    type: 'hydraOutput',
    position,
    data: {
      hydraFunction: 'out',
      functionDef: {
        name: 'out',
        type: 'src', // special — not really src but uses its own handle
        category: 'output',
        params: [],
      },
      params: { buffer: bufferIndex },
      label: `out(${buffer})`,
      nodeType: 'output',
    },
  };

  useGraphStore.setState((state) => ({ nodes: [...state.nodes, newNode] }));
}
