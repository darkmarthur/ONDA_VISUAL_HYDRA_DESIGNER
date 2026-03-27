/**
 * Graph Store — Zustand state management mit Multi-Tab Support
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
  HydraParamBinding,
  ProjectTab
} from '@/hydra/types';
import { getHydraFunction, categoryMeta } from '@/hydra/registry';
import { isValidConnection } from '@/hydra/validation';
import { generateHydraCode } from '@/hydra/codegen';
import { buildGraphFromCode } from '@/hydra/parser';

interface GraphState {
  // ─── Core graph data (Active Tab) ────────────────────────────────────────
  nodes: Node<HydraNodeData>[];
  edges: Edge[];
  
  // ─── Project Tabs ───────────────────────────────────────────────────────
  tabs: ProjectTab[];
  activeTabId: string;
  liveTabId: string | null;

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

  // ─── Tab Actions ─────────────────────────────────────────────────────────
  addTab: (name?: string) => void;
  removeTab: (id: string) => void;
  switchTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
  setPerformancePatch: (id?: string) => void;
  saveAutosave: () => void;
  loadAutosave: () => void;
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

function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${nodeIdCounter++}_${Math.floor(Math.random() * 1000)}`;
}

function determineNodeType(fnDef: { name: string; type: string; category: string }): HydraNodeType {
  if (fnDef.category === 'output' || fnDef.name === 'out') return 'output';
  if (fnDef.category === 'value' || fnDef.category === 'math') return 'value';
  if (fnDef.type === 'src') return 'source';
  return 'transform';
}

function deduplicate<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  items.forEach(item => {
    if (!map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values());
}

const DEFAULT_CODE = 'noise(() => 1)\n  .pixelate()\n  .colorama()\n  .out(o0)';

export const useGraphStore = create<GraphState>()(
  temporal(
    (set, get) => ({
  nodes: [],
  edges: [],
  tabs: [{ id: 'default', name: 'Patch 1', nodes: [], edges: [], code: DEFAULT_CODE }],
  activeTabId: 'default',
  liveTabId: 'default',

  selectedNodeId: null,
  generatedCode: DEFAULT_CODE,
  hydraError: null,
  editorMode: 'visual',
  showPreview: true,
  showMiniMap: true,
  hydraLogs: [],
  activeDraftConnection: null,
  autosaveEnabled: true,

  // ─── Tab Actions ─────────────────────────────────────────────────────────

  addTab: (name) => {
    const id = generateId('tab');
    const newTab: ProjectTab = {
      id,
      name: name || `Patch ${get().tabs.length + 1}`,
      nodes: [],
      edges: [],
      code: DEFAULT_CODE
    };
    set((s) => ({
      tabs: [...s.tabs, newTab],
      activeTabId: id,
      nodes: [],
      edges: [],
      generatedCode: DEFAULT_CODE
    }));
    get().updateGraphFromCode(DEFAULT_CODE);
    get().saveAutosave();
  },

  removeTab: (id) => {
    const { tabs, activeTabId, liveTabId } = get();
    if (tabs.length <= 1) return; // Must have at least one tab
    
    const newTabs = tabs.filter(t => t.id !== id);
    let nextActiveId = activeTabId;
    if (activeTabId === id) {
      nextActiveId = newTabs[0].id;
    }
    
    set({ tabs: newTabs });
    if (nextActiveId !== activeTabId) {
      get().switchTab(nextActiveId);
    }
    
    if (liveTabId === id) {
      set({ liveTabId: null });
    }
    get().saveAutosave();
  },

  switchTab: (id) => {
    const { tabs, activeTabId, nodes, edges, generatedCode } = get();
    if (id === activeTabId) return;

    // 1. Save current state to the being-replaced tab
    const updatedTabs = tabs.map(t => 
      t.id === activeTabId ? { ...t, nodes, edges, code: generatedCode } : t
    );

    // 2. Load next tab's state
    const targetTab = updatedTabs.find(t => t.id === id);
    if (!targetTab) return;

    set({
      tabs: updatedTabs,
      activeTabId: id,
      nodes: targetTab.nodes,
      edges: targetTab.edges,
      generatedCode: targetTab.code
    });
    get().saveAutosave();
  },

  renameTab: (id, name) => {
    set((s) => ({
      tabs: s.tabs.map(t => t.id === id ? { ...t, name } : t)
    }));
    get().saveAutosave();
  },

  setPerformancePatch: (id) => {
    const { tabs, activeTabId, nodes, edges, generatedCode } = get();
    const targetId = id || activeTabId;
    const targetTab = targetId === activeTabId 
      ? { nodes, edges, code: generatedCode } 
      : tabs.find(t => t.id === targetId);
    
    if (!targetTab) return;

    set({ liveTabId: targetId });
    
    // Push code to performance window explicitly
    localStorage.setItem('hydra-live-code', targetTab.code);
    window.dispatchEvent(new Event('storage'));
    get().saveAutosave();
  },

  // ─── Core Graph Handlers ─────────────────────────────────────────────────

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
    set((state) => {
      let nextNodes = [...state.nodes];
      changes.forEach((change) => {
        if (change.type === 'remove') {
          const edge = state.edges.find((e) => e.id === change.id);
          if (edge?.targetHandle?.startsWith('param-in:')) {
            const paramName = edge.targetHandle.split(':')[1];
            nextNodes = nextNodes.map((node) => {
              if (node.id === edge.target) {
                const newBindings = { ...node.data.bindings };
                delete newBindings[paramName];
                return { ...node, data: { ...node.data, bindings: newBindings } };
              }
              return node;
            });
          }
        }
      });

      const nextEdges = applyEdgeChanges(changes, state.edges);
      return { 
        nodes: deduplicate(nextNodes), 
        edges: deduplicate(nextEdges) as Edge[]
      };
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
      (e) => !(e.target === connection.target && e.targetHandle === connection.targetHandle)
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
      style: { stroke: edgeColor, strokeWidth, strokeDasharray: dashed ? '5,5' : undefined },
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
      id: generateId('node'),
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
    set((state) => ({ nodes: deduplicate([...state.nodes, newNode]) }));
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
    
    const newNodeId = generateId('node');
    const nodeType = determineNodeType(fnDef);
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

    set((state) => ({
      nodes: [...state.nodes, newNode],
      edges: edges.filter((e) => e.id !== edgeId).concat([edge1, edge2]),
    }));
    get().regenerateCode();
  },

  addAndConnectNode: (hydraFunctionName, position, connectFrom) => {
    const fnDef = getHydraFunction(hydraFunctionName);
    if (!fnDef) return;
    const params: Record<string, any> = {};
    fnDef.params.forEach((p) => { params[p.name] = p.default; });
    const nodeType = determineNodeType(fnDef);
    const reactFlowType = nodeType === 'source' ? 'hydraSource' : (nodeType === 'output' ? 'hydraOutput' : (nodeType === 'value' ? 'hydraValue' : 'hydraTransform'));

    const newNodeId = generateId('node');
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
    if (connectFrom.nodeId) {
      let edgeColor = '#6366f1';
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
        targetHandle: nodeType === 'output' ? 'output-in' : 'texture-in',
        animated: true,
        style: { stroke: edgeColor, strokeWidth: 2 },
        type: 'hydra'
      };
    }

    set((state) => ({
      nodes: deduplicate([...state.nodes, newNode]),
      edges: deduplicate(newEdge ? [...state.edges, newEdge] : state.edges)
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

  setNodeAlias: (nodeId, alias) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, alias, label: alias || n.data.hydraFunction } } : n
      ),
    }));
    get().regenerateCode();
  },

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

  removeEdge: (edgeId) => {
    set((state) => ({ edges: state.edges.filter((e) => e.id !== edgeId) }));
    get().regenerateCode();
  },

  updateNodeParam: (nodeId, paramName, value) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, params: { ...n.data.params, [paramName]: value } } } : n
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
          newParams[newName] = newParams[oldName];
          delete newParams[oldName];
          return { ...n, data: { ...n.data, params: newParams } };
        }
        return n;
      }),
    }));
    get().regenerateCode();
  },

  updateNodeBinding: (nodeId, paramName, binding) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id === nodeId) {
          const newBindings = { ...n.data.bindings, [paramName]: { ...n.data.bindings?.[paramName], ...binding } };
          return { ...n, data: { ...n.data, bindings: newBindings as any } };
        }
        return n;
      }),
    }));
    get().regenerateCode();
  },

  updateOutputBuffer: (nodeId, bufferIndex) => {
     set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, params: { ...n.data.params, buffer: bufferIndex } } } : n
      ),
    }));
    get().regenerateCode();
  },

  setHydraError: (error) => set({ hydraError: error }),

  regenerateCode: () => {
    let { nodes, edges, generatedCode, liveTabId, activeTabId, tabs } = get();

    // Healing pass
    let hasHealed = false;
    const healedNodes = nodes.map(node => {
      if (!node.data.bindings) return node;
      const newBindings = { ...node.data.bindings };
      let nodeChanged = false;
      Object.keys(newBindings).forEach(p => {
        if (newBindings[p].mode === 'value_node') {
          if (!edges.some(e => e.target === node.id && e.targetHandle === `param-in:${p}`)) {
            delete newBindings[p];
            nodeChanged = true;
          }
        }
      });
      if (nodeChanged) { hasHealed = true; return { ...node, data: { ...node.data, bindings: newBindings } }; }
      return node;
    });

    if (hasHealed) { nodes = healedNodes; set({ nodes }); }

    const code = generateHydraCode(nodes, edges);
    if (code === generatedCode && !hasHealed) return;

    set((s) => ({
      generatedCode: code,
      // Sync into the tab array as well
      tabs: s.tabs.map(t => t.id === activeTabId ? { ...t, nodes, edges, code } : t)
    }));
    
    // Only sync to autosave, stop automatic performance broadcast
    if (get().autosaveEnabled) {
      localStorage.setItem('hydra-autosave', get().serializeGraph());
    }

    if (get().autosaveEnabled) {
      localStorage.setItem('hydra-autosave', get().serializeGraph());
    }
  },

  updateGraphFromCode: (newCode) => {
    if (newCode === get().generatedCode) return;
    try {
      const { nodes: newNodes, edges: newEdges } = buildGraphFromCode(newCode, get().nodes);
      
      // If we have non-empty code but the parser found almost nothing, 
      // it might be a complex JS block that can't be represented as a graph.
      const isPureCode = newCode.trim().length > 20 && newNodes.length === 0;

      set((s) => ({ 
        nodes: deduplicate(newNodes), 
        edges: deduplicate(newEdges.length > 0 ? newEdges : get().edges),
        generatedCode: newCode,
        tabs: s.tabs.map(t => t.id === s.activeTabId ? { ...t, code: newCode, isPureCode } : t)
      }));
    } catch (err) {
      set((s) => ({ 
        generatedCode: newCode,
        tabs: s.tabs.map(t => t.id === s.activeTabId ? { ...t, code: newCode } : t)
      }));
    }
    get().saveAutosave();
  },

  setEditorMode: (mode) => set({ editorMode: mode }),
  setShowPreview: (show) => set({ showPreview: show }),
  setShowMiniMap: (show) => set({ showMiniMap: show }),
  addHydraLog: (type, message) => set((s) => ({
      hydraLogs: [{ type, message, timestamp: Date.now() }, ...s.hydraLogs.slice(0, 49)],
      hydraError: type === 'error' ? message : s.hydraError
  })),
  clearHydraLogs: () => set({ hydraLogs: [], hydraError: null }),
  setActiveDraftConnection: (conn) => set({ activeDraftConnection: conn }),
  setAutosaveEnabled: (enabled) => set({ autosaveEnabled: enabled }),

  loadAutosave: () => {
    try {
      const saved = localStorage.getItem('hydra-autosave');
      if (saved) {
        get().deserializeGraph(saved);
      } else {
        get().updateGraphFromCode(DEFAULT_CODE);
      }
    } catch (err) { console.error('Failed to load autosave:', err); }
  },

  clearGraph: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      generatedCode: '// Project Cleared',
    });
  },

  addOutputNode: (buffer, position) => {
    const fnDef = getHydraFunction('out')!;
    const newNodeId = generateId('node');
    const newNode: Node<HydraNodeData> = {
      id: newNodeId,
      type: 'hydraOutput',
      position,
      data: {
        hydraFunction: 'out',
        functionDef: fnDef,
        params: { buffer: buffer === 'o0' ? 0 : (buffer === 'o1' ? 1 : (buffer === 'o2' ? 2 : 3)) },
        label: buffer,
        nodeType: 'output',
      },
    };
    set((state) => ({ nodes: deduplicate([...state.nodes, newNode]) }));
    get().regenerateCode();
  },

  addAndConnectOutputNode: (buffer, position, connectFrom) => {
    const fnDef = getHydraFunction('out')!;
    const newNodeId = generateId('node');
    const newNode: Node<HydraNodeData> = {
      id: newNodeId,
      type: 'hydraOutput',
      position,
      data: {
        hydraFunction: 'out',
        functionDef: fnDef,
        params: { buffer: buffer === 'o0' ? 0 : (buffer === 'o1' ? 1 : (buffer === 'o2' ? 2 : 3)) },
        label: buffer,
        nodeType: 'output',
      },
    };

    let newEdge: Edge | null = null;
    if (connectFrom.nodeId) {
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

  saveAutosave: () => {
    if (get().autosaveEnabled) {
      localStorage.setItem('hydra-autosave', get().serializeGraph());
    }
  },

  serializeGraph: () => {
    const { tabs, activeTabId, liveTabId, nodes, edges, generatedCode } = get();
    // Update current tab status before saving
    const currentTabs = tabs.map(t => t.id === activeTabId ? { ...t, nodes, edges, code: generatedCode } : t);
    return JSON.stringify({
      version: '2.0.0',
      tabs: currentTabs,
      activeTabId,
      liveTabId
    });
  },

  deserializeGraph: (input: string | any) => {
    try {
      if (!input) return;
      
      // Handle cases where input might already be an object or a malformed string
      let data: any;
      if (typeof input === 'string') {
        if (input === "[object Object]") {
          console.warn("Attempted to deserialize '[object Object]'. Patch data might be corrupted.");
          return;
        }
        data = JSON.parse(input);
      } else {
        data = input;
      }
      
      const hydrateNodes = (nodes: any[]) => nodes.map(n => {
        if (!n.data.functionDef) {
          const fnDef = getHydraFunction(n.data.hydraFunction);
          if (fnDef) n.data.functionDef = fnDef;
        }
        return n;
      });

      if (!data) return;

      if (data.tabs && data.tabs.length > 0) {
        const active = data.tabs.find((t: any) => t.id === data.activeTabId) || data.tabs[0];
        const live = data.tabs.find((t: any) => t.id === data.liveTabId) || active;

        set({
          tabs: data.tabs.map((t: any) => ({ ...t, nodes: hydrateNodes(t.nodes) })),
          activeTabId: active.id,
          liveTabId: live.id,
          nodes: hydrateNodes(active.nodes),
          edges: active.edges,
          generatedCode: active.code
        });

        // Re-Sync Live window code if exists
        if (live.code) {
          localStorage.setItem('hydra-live-code', live.code);
          window.dispatchEvent(new Event('storage'));
        }
      } else if (data.nodes) {
        // ... rest
        const legacyNodes = hydrateNodes(data.nodes);
        const legacyTab: ProjectTab = {
          id: 'default',
          name: 'Imported Patch',
          nodes: legacyNodes,
          edges: data.edges,
          code: data.generatedCode || generateHydraCode(legacyNodes, data.edges)
        };
        set({
          tabs: [legacyTab],
          activeTabId: 'default',
          liveTabId: 'default',
          nodes: legacyNodes,
          edges: data.edges,
          generatedCode: legacyTab.code
        });
      }
    } catch (err) { console.error('Deserialization failed', err); }
  },

  savePatch: (name) => {
    const patches = JSON.parse(localStorage.getItem('hydra-patches') || '{}');
    patches[name] = get().serializeGraph();
    localStorage.setItem('hydra-patches', JSON.stringify(patches));
  },

  loadPatch: (name) => {
    const patches = JSON.parse(localStorage.getItem('hydra-patches') || '{}');
    if (patches[name]) {
      get().deserializeGraph(patches[name]);
      return true;
    }
    return false;
  },

  getSavedPatches: () => {
     const patches = JSON.parse(localStorage.getItem('hydra-patches') || '{}');
     return Object.keys(patches);
  }
}),
  {
    partialize: (state) => ({
      tabs: state.tabs,
      activeTabId: state.activeTabId,
      liveTabId: state.liveTabId,
      autosaveEnabled: state.autosaveEnabled
    }),
  }
));
