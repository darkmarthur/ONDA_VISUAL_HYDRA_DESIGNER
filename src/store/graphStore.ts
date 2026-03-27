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
import { 
  HydraNodeData, 
  HydraNodeType, 
  HydraOutput, 
  HydraParamBinding
} from '@/hydra/types';
import { getHydraFunction, categoryMeta } from '@/hydra/registry';
import { isValidConnection } from '@/hydra/validation';
import { generateHydraCode } from '@/hydra/codegen';
import { buildGraphFromCode } from '@/hydra/parser';

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
  hydraLogs: { type: 'error' | 'info'; message: string; timestamp: number }[];
  activeDraftConnection: { nodeId: string; handleId: string | null; handleType: 'source' | 'target' | null } | null;
  autosaveEnabled: boolean;

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
  updateNodeParam: (nodeId: string, paramName: string, value: number | string) => void;
  removeNodeParam: (nodeId: string, paramName: string) => void;
  renameNodeParam: (nodeId: string, oldName: string, newName: string) => void;
  updateNodeBinding: (nodeId: string, paramName: string, binding: Partial<HydraParamBinding>) => void;
  updateOutputBuffer: (nodeId: string, buffer: number) => void;
  setHydraError: (error: string | null) => void;
  regenerateCode: () => void;
  updateGraphFromCode: (newCode: string) => void;
  setEditorMode: (mode: 'visual' | 'code') => void;
  setShowPreview: (show: boolean) => void;
  setShowMiniMap: (show: boolean) => void;
  addHydraLog: (type: 'error' | 'info', message: string) => void;
  clearHydraLogs: () => void;
  setAutosaveEnabled: (enabled: boolean) => void;
  loadAutosave: () => void;
  setActiveDraftConnection: (conn: { nodeId: string; handleId: string | null; handleType: 'source' | 'target' | null } | null) => void;
  clearGraph: () => void;
  addOutputNode: (buffer: HydraOutput, position: { x: number; y: number }) => void;
  addAndConnectOutputNode: (buffer: HydraOutput, position: { x: number; y: number }, connectFrom: { nodeId: string; handleId: string | null; handleType: 'source' | 'target' | null }) => void;
  serializeGraph: () => string;
  deserializeGraph: (json: string) => void;
  savePatch: (name: string) => void;
  loadPatch: (name: string) => boolean;
  getSavedPatches: () => string[];
}

let nodeIdCounter = 0;

function generateNodeId(): string {
  return `node_${Date.now()}_${nodeIdCounter++}_${Math.floor(Math.random() * 1000)}`;
}

function determineNodeType(fnDef: { name: string; type: string; category: string }): HydraNodeType {
  if (fnDef.category === 'output' || fnDef.name === 'out') return 'output';
  if (fnDef.category === 'value' || fnDef.category === 'math') return 'value';
  if (fnDef.type === 'src') return 'source';
  return 'transform';
}

/**
 * Deduplicates an array of nodes or edges by ID.
 */
function deduplicate<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  items.forEach(item => {
    if (!map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values());
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
  hydraLogs: [],
  activeDraftConnection: null,
  autosaveEnabled: true,

  onNodesChange: (changes) => {
    set((state) => {
      const nextNodes = applyNodeChanges(changes, state.nodes) as Node<HydraNodeData>[];
      return { nodes: deduplicate(nextNodes) };
    });
    
    const hasStructuralChange = changes.some(
      (c) => c.type === 'remove' || c.type === 'add'
    );
    if (hasStructuralChange) {
      get().regenerateCode();
    }
  },

  onEdgesChange: (changes) => {
    // Detect and clean up parameter bindings when edges are removed
    changes.forEach((change) => {
      if (change.type === 'remove') {
        const edge = get().edges.find((e) => e.id === change.id);
        if (edge?.targetHandle?.startsWith('param-in:')) {
          const paramName = edge.targetHandle.split(':')[1];
          set((state) => ({
            nodes: state.nodes.map((node) => {
              if (node.id === edge.target) {
                const newBindings = { ...node.data.bindings };
                if (newBindings[paramName]) {
                   newBindings[paramName] = { mode: 'literal' };
                }
                return { 
                  ...node, 
                  data: { ...node.data, bindings: newBindings } 
                };
              }
              return node;
            })
          }));
        }
      }
    });

    set((state) => {
      const nextEdges = applyEdgeChanges(changes, state.edges);
      return { edges: deduplicate(nextEdges) };
    });
    
    get().regenerateCode();
  },

  onConnect: (connection) => {
    const { nodes, edges } = get();
    if (!isValidConnection(connection, nodes, edges)) return;

    const { source, sourceHandle, target, targetHandle } = connection;
    if (!source || !target || !sourceHandle || !targetHandle) return;

    const isParamBinding = targetHandle.startsWith('param-in:');
    
    const newEdges = edges.filter(
      (e) =>
        !(e.target === connection.target && e.targetHandle === connection.targetHandle)
    );

    let edgeColor = '#6366f1'; 
    let strokeWidth = 2;
    let dashed = false;

    if (isParamBinding) {
      const paramName = targetHandle.split(':')[1];
      edgeColor = '#eab308';
      strokeWidth = 1.5;
      dashed = true;

      set((state) => ({
        nodes: state.nodes.map(n => {
          if (n.id === target) {
            const bindings = { ...n.data.bindings };
            bindings[paramName] = { 
              mode: 'value_node', 
              boundNodeId: source,
              outputKey: sourceHandle.includes(':') ? sourceHandle.split(':')[1] : undefined
            };
            return { ...n, data: { ...n.data, bindings } };
          }
          return n;
        })
      }));
    } else {
      const sourceNode = get().nodes.find((n) => n.id === source);
      if (sourceNode) {
        const cat = sourceNode.data.functionDef.category;
        const meta = categoryMeta[cat];
        if (meta) edgeColor = meta.color;
      }
    }

    const newConnection = {
      ...connection,
      animated: !isParamBinding,
      style: { 
        stroke: edgeColor, 
        strokeWidth,
        strokeDasharray: dashed ? '5,5' : undefined
      },
      type: 'hydra'
    };

    set({ edges: deduplicate(addEdge(newConnection, newEdges)) });
    get().regenerateCode();
  },

  addNode: (hydraFunctionName, position) => {
    const fnDef = getHydraFunction(hydraFunctionName);
    if (!fnDef) return;

    const params: Record<string, any> = {};
    fnDef.params.forEach((p) => { params[p.name] = p.default; });

    const nodeType = determineNodeType(fnDef);
    const reactFlowType = nodeType === 'source' ? 'hydraSource' : (nodeType === 'output' ? 'hydraOutput' : (nodeType === 'value' ? 'hydraValue' : 'hydraTransform'));

    const newNode: Node<HydraNodeData> = {
      id: generateNodeId(),
      type: reactFlowType,
      position,
      data: {
        hydraFunction: hydraFunctionName,
        functionDef: fnDef,
        params,
        bindings: {},
        label: hydraFunctionName,
        nodeType,
      },
    };

    set((state) => ({ nodes: [...state.nodes, newNode] }));
    get().regenerateCode();
  },

  addAndConnectNode: (hydraFunctionName, position, connectFrom) => {
    const fnDef = getHydraFunction(hydraFunctionName);
    if (!fnDef) return;

    const params: Record<string, any> = {};
    fnDef.params.forEach((p) => { params[p.name] = p.default; });

    const nodeType = determineNodeType(fnDef);
    const newNodeId = generateNodeId();
    const reactFlowType = nodeType === 'source' ? 'hydraSource' : (nodeType === 'output' ? 'hydraOutput' : (nodeType === 'value' ? 'hydraValue' : 'hydraTransform'));

    const newNode: Node<HydraNodeData> = {
      id: newNodeId,
      type: reactFlowType,
      position,
      data: {
        hydraFunction: hydraFunctionName,
        functionDef: fnDef,
        params,
        bindings: {},
        label: hydraFunctionName,
        nodeType,
      },
    };

    let newEdge: Edge | null = null;
    let edgeColor = '#6366f1';
    
    if (connectFrom.handleType === 'source') {
      const sourceNode = get().nodes.find(n => n.id === connectFrom.nodeId);
      if (sourceNode) {
        const meta = categoryMeta[sourceNode.data.functionDef.category];
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
        type: 'hydra'
      };
    } else {
      const meta = categoryMeta[fnDef.category];
      if (meta) edgeColor = meta.color;

      newEdge = {
        id: `e-${newNodeId}-${connectFrom.nodeId}`,
        source: newNodeId,
        sourceHandle: 'texture-out',
        target: connectFrom.nodeId,
        targetHandle: connectFrom.handleId,
        animated: true,
        style: { stroke: edgeColor, strokeWidth: 2 },
        type: 'hydra'
      };
    }

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

    const fnDef = getHydraFunction(hydraFunctionName);
    if (!fnDef) return;

    const params: Record<string, any> = {};
    fnDef.params.forEach((p) => { params[p.name] = p.default; });

    const nodeType = determineNodeType(fnDef);
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
        bindings: {},
        label: hydraFunctionName,
        nodeType,
      },
    };

    let sourceColor = '#6366f1';
    const sourceMeta = categoryMeta[sourceNode.data.functionDef.category];
    if (sourceMeta) sourceColor = sourceMeta.color;

    let newColor = '#6366f1';
    const newMeta = categoryMeta[fnDef.category];
    if (newMeta) newColor = newMeta.color;

    const edge1: Edge = {
      id: `e-${edge.source}-${newNodeId}`,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: newNodeId,
      targetHandle: 'texture-in',
      animated: true,
      style: { stroke: sourceColor, strokeWidth: 2 },
      type: 'hydra'
    };

    const edge2: Edge = {
      id: `e-${newNodeId}-${edge.target}`,
      source: newNodeId,
      sourceHandle: 'texture-out',
      target: edge.target,
      targetHandle: edge.targetHandle,
      animated: true,
      style: { stroke: newColor, strokeWidth: 2 },
      type: 'hydra'
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
        n.id === nodeId ? { ...n, data: { ...n.data, alias, label: alias || n.data.hydraFunction } } : n
      ),
    }));
    get().regenerateCode();
  },

  updateNodeParam: (nodeId, paramName, value) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, params: { ...n.data.params, [paramName]: value } } }
          : n
      ),
    }));
    get().regenerateCode();
  },

  removeNodeParam: (nodeId, paramName) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id === nodeId) {
          const newParams = { ...n.data.params };
          delete newParams[paramName];
          return { ...n, data: { ...n.data, params: newParams } };
        }
        return n;
      }),
    }));
    get().regenerateCode();
  },

  renameNodeParam: (nodeId, oldName, newName) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id === nodeId) {
          const newParams = { ...n.data.params };
          if (newParams[oldName] !== undefined && oldName !== newName) {
            newParams[newName] = newParams[oldName];
            delete newParams[oldName];
          }
          return { ...n, data: { ...n.data, params: newParams } };
        }
        return n;
      }),
    }));
    get().regenerateCode();
  },

  updateNodeBinding: (nodeId, paramName, binding) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                bindings: {
                  ...n.data.bindings,
                  [paramName]: {
                    mode: 'literal',
                    ...(n.data.bindings?.[paramName] || {}),
                    ...binding,
                  } as HydraParamBinding,
                },
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
        n.id === nodeId ? { ...n, data: { ...n.data, params: { ...n.data.params, buffer } } } : n
      ),
    }));
    get().regenerateCode();
  },

  setHydraError: (error) => {
    set({ hydraError: error });
  },

  regenerateCode: () => {
    const { nodes, edges, generatedCode } = get();
    const code = generateHydraCode(nodes, edges);
    if (code === generatedCode) return;
    set({ generatedCode: code });
    
    // Sync
    localStorage.setItem('hydra-live-code', code);
    window.dispatchEvent(new Event('storage'));

    if (get().autosaveEnabled) {
      localStorage.setItem('hydra-autosave', get().serializeGraph());
    }
  },

  setAutosaveEnabled: (enabled) => {
    set({ autosaveEnabled: enabled });
    if (enabled) {
      localStorage.setItem('hydra-autosave', get().serializeGraph());
    } else {
      localStorage.removeItem('hydra-autosave');
    }
  },

  loadAutosave: () => {
    try {
      const saved = localStorage.getItem('hydra-autosave');
      if (saved) get().deserializeGraph(saved);
    } catch (err) {
      console.error('Failed to load autosave:', err);
    }
  },

  updateGraphFromCode: (newCode) => {
    if (newCode === get().generatedCode) return;
    try {
      const { nodes: newNodes, edges: newEdges } = buildGraphFromCode(newCode, get().nodes);
      
      set({ 
        nodes: deduplicate(newNodes), 
        edges: deduplicate(newEdges.length > 0 ? newEdges : get().edges),
        generatedCode: newCode 
      });

      localStorage.setItem('hydra-live-code', newCode);
      window.dispatchEvent(new Event('storage'));
      
      if (get().autosaveEnabled) {
        localStorage.setItem('hydra-autosave', get().serializeGraph());
      }
    } catch (err) {
      set({ generatedCode: newCode });
    }
  },

  setEditorMode: (mode) => set({ editorMode: mode }),
  setShowPreview: (show) => set({ showPreview: show }),
  setShowMiniMap: (show) => set({ showMiniMap: show }),
  
  addHydraLog: (type, message) => {
    set((s) => ({
      hydraLogs: [{ type, message, timestamp: Date.now() }, ...s.hydraLogs.slice(0, 49)],
      hydraError: type === 'error' ? message : s.hydraError
    }));
  },
  
  clearHydraLogs: () => set({ hydraLogs: [], hydraError: null }),
  setActiveDraftConnection: (conn) => set({ activeDraftConnection: conn }),

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
          bindings: n.data.bindings || {},
          alias: n.data.alias,
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
      const restoredNodes = (parsed.nodes || [])
        .map((n: any) => {
          const fnDef = getHydraFunction(n.data.hydraFunction);
          if (!fnDef) return null;
          const nodeType = determineNodeType(fnDef);
          return {
            id: n.id,
            type: n.type || (nodeType === 'source' ? 'hydraSource' : (nodeType === 'output' ? 'hydraOutput' : 'hydraTransform')),
            position: n.position,
            data: {
              hydraFunction: n.data.hydraFunction,
              functionDef: fnDef,
              params: n.data.params,
              bindings: n.data.bindings || {},
              alias: n.data.alias,
              label: n.data.alias || n.data.hydraFunction,
              nodeType,
            },
          };
        })
        .filter(Boolean);

      set({
        nodes: deduplicate(restoredNodes),
        edges: deduplicate(parsed.edges || []),
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
      saved[name] = { data: json, savedAt: new Date().toISOString() };
      localStorage.setItem('hydra-patches', JSON.stringify(saved));
    } catch { /* ignore */ }
  },

  loadPatch: (name) => {
    try {
      const saved = JSON.parse(localStorage.getItem('hydra-patches') || '{}');
      if (saved[name]) {
        get().deserializeGraph(saved[name].data);
        return true;
      }
    } catch { /* ignore */ }
    return false;
  },

  getSavedPatches: () => {
    try {
      const patches = JSON.parse(localStorage.getItem('hydra-patches') || '{}');
      return Object.keys(patches);
    } catch { return []; }
  },

  addOutputNode: (buffer, position) => {
    const bufferIndex = parseInt(buffer.slice(1), 10);
    const fnDef = getHydraFunction('out')!;
    const newNode: Node<HydraNodeData> = {
      id: generateNodeId(),
      type: 'hydraOutput',
      position,
      data: {
        hydraFunction: 'out',
        functionDef: fnDef,
        params: { buffer: bufferIndex },
        label: `out(${buffer})`,
        nodeType: 'output',
      },
    };
    set((state) => ({ nodes: [...state.nodes, newNode] }));
    get().regenerateCode();
  },

  addAndConnectOutputNode: (buffer, position, connectFrom) => {
    const bufferIndex = parseInt(buffer.slice(1), 10);
    const newNodeId = generateNodeId();
    const fnDef = getHydraFunction('out')!;
    const newNode: Node<HydraNodeData> = {
      id: newNodeId,
      type: 'hydraOutput',
      position,
      data: {
        hydraFunction: 'out',
        functionDef: fnDef,
        params: { buffer: bufferIndex },
        label: `out(${buffer})`,
        nodeType: 'output',
      },
    };

    let newEdge: Edge | null = null;
    if (connectFrom.handleType === 'source') {
      newEdge = {
        id: `e-${connectFrom.nodeId}-${newNodeId}`,
        source: connectFrom.nodeId,
        sourceHandle: connectFrom.handleId,
        target: newNodeId,
        targetHandle: 'output-in',
        animated: true,
        style: { stroke: '#ef4444', strokeWidth: 2 },
        type: 'hydra'
      };
    }

    set((state) => ({ 
      nodes: deduplicate([...state.nodes, newNode]),
      edges: deduplicate(newEdge ? [...state.edges, newEdge] : state.edges) 
    }));
    get().regenerateCode();
  },
}),
  {
    partialize: (state) => ({
      nodes: state.nodes,
      edges: state.edges,
      generatedCode: state.generatedCode,
      editorMode: state.editorMode,
      showPreview: state.showPreview,
      autosaveEnabled: state.autosaveEnabled
    }),
  }
));
