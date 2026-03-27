'use client';

import React, { useEffect, useState } from 'react';
import { useReactFlow, getBezierPath, useStore, Position } from '@xyflow/react';
import { useGraphStore } from '@/store/graphStore';

export default function FloatingCable() {
  const { screenToFlowPosition, getNode } = useReactFlow();
  const activeDraft = useGraphStore((s) => s.activeDraftConnection);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Get the current zoom and pan from React Flow store
  const transform = useStore((s) => s.transform);

  useEffect(() => {
    if (!activeDraft) return;

    const handleMouseMove = (event: MouseEvent) => {
      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setMousePos(pos);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [activeDraft, screenToFlowPosition]);

  if (!activeDraft) return null;

  const node = getNode(activeDraft.nodeId);
  if (!node) return null;

  const isSource = activeDraft.handleType === 'source';
  const isSecondary = activeDraft.handleId === 'texture-secondary';
  const isCombine = (node.data as any).functionDef?.type === 'combine' || (node.data as any).functionDef?.type === 'combineCoord';
  
  // Calculate source/target in graph coordinates
  const nodeX = node.position.x;
  const nodeY = node.position.y;
  
  // Use measured dimensions if available, otherwise fallback to approximate defaults
  const nodeW = node.measured?.width ?? 180;
  const nodeH = node.measured?.height ?? 120;

  // Exact handle locations in graph space
  const handleX = isSource ? nodeX + nodeW : nodeX;
  let handleY = nodeY + nodeH / 2;
  
  if (isSecondary) {
    handleY = nodeY + nodeH * 0.75;
  } else if (!isSource && isCombine) {
    handleY = nodeY + nodeH * 0.45;
  }

  // Points in graph space
  const sourceX = isSource ? handleX : mousePos.x;
  const sourceY = isSource ? handleY : mousePos.y;
  const targetX = isSource ? mousePos.x : handleX;
  const targetY = isSource ? mousePos.y : handleY;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition: isSource ? Position.Right : Position.Left,
    targetX,
    targetY,
    targetPosition: isSource ? Position.Left : Position.Right,
  });

  // We wrap the SVG in a div that follows the pane's transform
  // to ensure the Bezier path is drawn in the correct coordinate system
  const [tx, ty, zoom] = transform;

  return (
    <svg 
      style={{ 
        position: 'absolute', 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none', 
        zIndex: 9999, // Ensure it's above handles and nodes
        top: 0,
        left: 0,
        transform: `translate(${tx}px, ${ty}px) scale(${zoom})`,
        transformOrigin: '0 0',
        overflow: 'visible'
      }}
    >
      <path
        d={edgePath}
        fill="none"
        stroke="#6366f1"
        strokeWidth={3 / zoom} // Thicker line
        strokeDasharray={`${6 / zoom},${4 / zoom}`}
        style={{ 
          opacity: 0.9,
          filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.4))' 
        }}
      />
    </svg>
  );
}
