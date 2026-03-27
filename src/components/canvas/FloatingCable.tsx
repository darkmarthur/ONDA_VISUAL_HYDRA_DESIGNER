'use client';

import React, { useEffect, useState } from 'react';
import { useReactFlow, getBezierPath, useStore } from '@xyflow/react';
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
  if (!node || !node.measured) return null;

  const isSource = activeDraft.handleType === 'source';
  const isSecondary = activeDraft.handleId === 'texture-secondary';
  const isCombine = (node.data as any).functionDef?.type.startsWith('combine');
  
  // Calculate source/target in graph coordinates
  const nodeX = node.position.x;
  const nodeY = node.position.y;
  const nodeW = node.measured.width || 0;
  const nodeH = node.measured.height || 0;

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
    targetX,
    targetY,
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
        zIndex: 1000,
        top: 0,
        left: 0,
        transform: `translate(${tx}px, ${ty}px) scale(${zoom})`,
        transformOrigin: '0 0'
      }}
    >
      <path
        d={edgePath}
        fill="none"
        stroke="#6366f1"
        strokeWidth={2 / zoom} // Keep stroke width consistent regardless of zoom
        strokeDasharray={`${5 / zoom},${5 / zoom}`}
        style={{ opacity: 0.8 }}
      />
    </svg>
  );
}
