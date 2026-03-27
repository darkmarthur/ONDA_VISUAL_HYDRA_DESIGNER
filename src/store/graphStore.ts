/**
 * Graph Store — Zustand state management
 * 
 * Central state for the node editor: nodes, edges, selected node,
 * generated code, and persistence.
 */

import { create } from 'zustand';
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

  // ─── Actions ─────────────────────────────────────────────────────────────
  onNodesChange: (changes: NodeChange<Node<HydraNodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (hydraFunctionName: string, position: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  updateNodeParam: (nodeId: string, paramName: string, value: number) => void;
  updateOutputBuffer: (nodeId: string, buffer: number) => void;
  setHydraError: (error: string | null) => void;
  regenerateCode: () => void;
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

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  generatedCode: '// Add nodes and connect them to generate Hydra code',
  hydraError: null,

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

    set({ edges: addEdge(connection, newEdges) });
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

  removeNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    }));
    get().regenerateCode();
  },

  setSelectedNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
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
}));

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
