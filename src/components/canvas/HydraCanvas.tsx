/**
 * HydraCanvas — Main node editor canvas
 * Wraps React Flow with custom node types and validation.
 */

'use client';

import React, { useCallback, useMemo, useRef, DragEvent, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  NodeTypes,
  Edge,
  OnConnectStartParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import SourceNode from './nodes/SourceNode';
import TransformNode from './nodes/TransformNode';
import OutputNode from './nodes/OutputNode';
import FloatingCable from './FloatingCable';
import { useGraphStore, addOutputNode } from '@/store/graphStore';
import { HydraNodeData, HydraOutput } from '@/hydra/types';

const nodeTypes: NodeTypes = {
  hydraSource: SourceNode,
  hydraTransform: TransformNode,
  hydraOutput: OutputNode,
};

function HydraCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const onNodesChange = useGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange);
  const onConnect = useGraphStore((s) => s.onConnect);
  const addNode = useGraphStore((s) => s.addNode);
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);
  const removeEdge = useGraphStore((s) => s.removeEdge);
  const setActiveDraftConnection = useGraphStore((s) => s.setActiveDraftConnection);
  const activeDraftConnection = useGraphStore((s) => s.activeDraftConnection);

  const [edgeMenu, setEdgeMenu] = React.useState<{ id: string; x: number; y: number } | null>(null);

  const onConnectStart = useCallback((_: any, params: OnConnectStartParams) => {
    if (params.nodeId) {
      setActiveDraftConnection({
        nodeId: params.nodeId,
        handleId: params.handleId,
        handleType: params.handleType
      });
    }
  }, [setActiveDraftConnection]);

  const onConnectEnd = useCallback(
    (event: any) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('react-flow__pane')) {
        const { x, y } = screenToFlowPosition({
          x: event.clientX || (event.touches ? event.touches[0].clientX : 0),
          y: event.clientY || (event.touches ? event.touches[0].clientY : 0),
        });

        window.dispatchEvent(
          new CustomEvent('open-tab-menu', {
            detail: {
              isDraftConnection: true,
              position: { x, y },
            },
          })
        );
      } else {
        if (!target.classList.contains('react-flow__handle')) {
           setTimeout(() => setActiveDraftConnection(null), 200);
        }
      }
    },
    [screenToFlowPosition, setActiveDraftConnection]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const data = event.dataTransfer.getData('application/hydra-node');
      if (!data) return;

      const parsed = JSON.parse(data);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (parsed.type === 'output') {
        addOutputNode(parsed.buffer as HydraOutput, position);
      } else {
        addNode(parsed.functionName, position);
      }
    },
    [screenToFlowPosition, addNode],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setEdgeMenu(null);
    setActiveDraftConnection(null);
  }, [setSelectedNode, setActiveDraftConnection]);

  // Handle Esc to cancel drafting
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeDraftConnection) {
        setActiveDraftConnection(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [activeDraftConnection, setActiveDraftConnection]);

  const onEdgeDoubleClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      event.stopPropagation();
      setEdgeMenu({ id: edge.id, x: event.clientX, y: event.clientY });
    },
    [],
  );

  const handleDeleteEdge = useCallback(() => {
    if (edgeMenu) {
      removeEdge(edgeMenu.id);
      setEdgeMenu(null);
    }
  }, [edgeMenu, removeEdge]);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 2 },
    }),
    [],
  );

  return (
    <div ref={reactFlowWrapper} className="hydra-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode="Shift"
        panOnScroll
        zoomOnScroll
        minZoom={0.1}
        maxZoom={4}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.05)"
        />
        <Controls
          showInteractive={false}
          className="hydra-controls"
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as unknown as HydraNodeData;
            if (data?.nodeType === 'output') return '#ef4444';
            if (data?.nodeType === 'source') return '#f472b6';
            return '#60a5fa';
          }}
          maskColor="rgba(0,0,0,0.7)"
          className="hydra-minimap"
        />
        
        <FloatingCable />

        {edgeMenu && (
          <div
            style={{
              position: 'fixed',
              left: edgeMenu.x,
              top: edgeMenu.y,
              zIndex: 1000,
            }}
            className="toolbar__dropdown"
          >
            <button
              className="toolbar__dropdown-item"
              style={{ color: 'var(--accent-red)' }}
              onClick={handleDeleteEdge}
            >
              Delete Connection
            </button>
            <button
              className="toolbar__dropdown-item"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('open-tab-menu', { detail: { insertEdgeId: edgeMenu.id } })
                );
                setEdgeMenu(null);
              }}
            >
              Insert Node...
            </button>
          </div>
        )}
      </ReactFlow>
    </div>
  );
}

export default function HydraCanvas() {
  return (
    <ReactFlowProvider>
      <HydraCanvasInner />
    </ReactFlowProvider>
  );
}
