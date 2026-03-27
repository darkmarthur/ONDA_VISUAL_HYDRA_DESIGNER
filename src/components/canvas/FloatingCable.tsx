'use client';

import React, { useEffect, useState } from 'react';
import { useReactFlow, getBezierPath } from '@xyflow/react';
import { useGraphStore } from '@/store/graphStore';

export default function FloatingCable() {
  const { screenToFlowPosition, getNode } = useReactFlow();
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

  const node = getNode(activeDraft.nodeId);
  if (!node || !node.measured) return null;

  // Estimate handle position if not provided by internal API easily
  // In a real implementation we'd use useInternalNode or similar, 
  // but for drafting we can approximate or use node position + offset.
  
  // Actually, React Flow nodes have internals. 
  // Let's try to get a better position.
  const isSource = activeDraft.handleType === 'source';
  const isSecondary = activeDraft.handleId === 'texture-secondary';
  
  // Approximate handle positions based on node size and handle type
  const startX = isSource ? node.position.x + (node.measured.width || 0) : node.position.x;
  
  let startY = node.position.y + (node.measured.height || 0) / 2; // Mid height default
  if (isSecondary) {
    startY = node.position.y + (node.measured.height || 0) * 0.75; // Secondary is at 75% height
  } else if (!isSource && (node.data as any).functionDef?.type.startsWith('combine')) {
    startY = node.position.y + (node.measured.height || 0) * 0.45; // Primary on combine nodes is at 45%
  }

  const [edgePath] = getBezierPath({
    sourceX: isSource ? startX : mousePos.x,
    sourceY: isSource ? startY : mousePos.y,
    targetX: isSource ? mousePos.x : startX,
    targetY: isSource ? mousePos.y : startY,
  });

  return (
    <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9 }}>
      <path
        d={edgePath}
        fill="none"
        stroke="#6366f1"
        strokeWidth={2}
        strokeDasharray="5,5"
        style={{ opacity: 0.6 }}
      />
    </svg>
  );
}
