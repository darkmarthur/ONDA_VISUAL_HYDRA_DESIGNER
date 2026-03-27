/**
 * FloatingCable Component
 * Draws a Bezier cable from a source handle to the mouse cursor during drafting.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useReactFlow, getBezierPath, useStore, Position } from '@xyflow/react';
import { useGraphStore } from '@/store/graphStore';

export default function FloatingCable() {
  const { screenToFlowPosition } = useReactFlow();
  
  // Get data from React Flow store
  const transform = useStore((s) => s.transform);
  const nodeLookup = useStore((s) => s.nodeLookup);
  
  // Get draft state from our store
  const activeDraft = useGraphStore((s) => s.activeDraftConnection);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
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

  // Use XY Flow internals for pixel-perfect handle locating
  const node = nodeLookup.get(activeDraft.nodeId);
  if (!node) return null;

  const handleBounds = (node as any).internals?.handleBounds;
  if (!handleBounds) return null;

  // Find the exact handle being drafted (source or target)
  const isSource = activeDraft.handleType === 'source';
  const bounds = (handleBounds[isSource ? 'source' : 'target'] as any[])?.find(
    (h) => h.id === activeDraft.handleId
  );

  if (!bounds) return null;

  // Precise coordinates for the handle center in graph space
  const handleX = (node as any).internals.positionAbsolute.x + bounds.x + bounds.width / 2;
  const handleY = (node as any).internals.positionAbsolute.y + bounds.y + bounds.height / 2;

  // The Bezier path needs a start (source) and an end (target)
  // If we start from a source handle, the target is the mouse.
  // If we start from a target handle, the source is the mouse.
  const sourceX = isSource ? handleX : mousePos.x;
  const sourceY = isSource ? handleY : mousePos.y;
  const targetX = isSource ? mousePos.x : handleX;
  const targetY = isSource ? mousePos.y : handleY;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition: Position.Right,
    targetX,
    targetY,
    targetPosition: Position.Left,
  });

  // Apply the pane's transform to the SVG root
  const [tx, ty, zoom] = transform;

  return (
    <svg 
      style={{ 
        position: 'absolute', 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none', 
        zIndex: 9999,
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
        strokeWidth={3 / zoom}
        strokeDasharray={`${6 / zoom},${4 / zoom}`}
        style={{ 
          opacity: 0.9,
          filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.4))' 
        }}
      />
    </svg>
  );
}
