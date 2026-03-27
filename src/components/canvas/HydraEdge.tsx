/**
 * HydraEdge — Custom edge component with hover controls
 * Optimized for v2.0 professional aesthetics.
 */

'use client';

import React, { useState } from 'react';
import { 
  getBezierPath, 
  EdgeProps, 
  EdgeLabelRenderer, 
  BaseEdge,
  useReactFlow
} from '@xyflow/react';
import { Trash2, Plus } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';

export default function HydraEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const removeEdge = useGraphStore((s) => s.removeEdge);
  const { screenToFlowPosition, flowToScreenPosition } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeEdge(id);
  };

  const onInsert = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Use the screen position of the label for the TabMenu spawning
    const screenPos = flowToScreenPosition({ x: labelX, y: labelY });
    
    window.dispatchEvent(
      new CustomEvent('open-tab-menu', { 
        detail: { 
          insertEdgeId: id, 
          position: screenPos
        } 
      })
    );
  };

  return (
    <g 
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)}
      className="hydra-edge"
    >
      {/* Invisible thicker path to capture hover more easily */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />
      
      {/* The actual visible edge */}
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          stroke: isHovered ? 'var(--accent-primary)' : style.stroke,
          strokeWidth: isHovered ? 3 : style.strokeWidth,
          transition: 'stroke 0.2s, stroke-width 0.2s'
        }} 
      />

      {isHovered && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 1000,
            }}
            className="nodrag nopan"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="edge-controls-floating--static">
              <button
                className="edge-control-btn edge-control-btn--delete"
                title="Delete Connection"
                onClick={onDelete}
              >
                <Trash2 size={13} />
              </button>
              <button
                className="edge-control-btn edge-control-btn--insert"
                title="Insert Node"
                onClick={onInsert}
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  );
}
