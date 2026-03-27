/**
 * Output Node Component
 * Represents the .out(oN) terminal node in Hydra
 */

'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, useHandleConnections } from '@xyflow/react';
import { HydraNodeData } from '@/hydra/types';
import { useGraphStore } from '@/store/graphStore';

function OutputNode({ id, data, selected }: NodeProps & { data: HydraNodeData }) {
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);
  const updateOutputBuffer = useGraphStore((s) => s.updateOutputBuffer);
  const bufferIndex = data.params.buffer ?? 0;

  const inConnections = useHandleConnections({ type: 'target', id: 'output-in' });
  const hasError = inConnections.length === 0;

  return (
    <div
      className={`hydra-node hydra-node--output ${selected ? 'hydra-node--selected' : ''} ${hasError ? 'hydra-node--error' : ''}`}
      onClick={() => setSelectedNode(id)}
      style={{ '--node-accent': '#ef4444' } as React.CSSProperties}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="output-in"
        className="hydra-handle hydra-handle--output-in"
      />

      <div className="hydra-node__header">
        <span className="hydra-node__icon">▹</span>
        <span className="hydra-node__label">out</span>
        {hasError && (
          <span className="hydra-node__error-icon" title="Missing required connection">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--accent-red)" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L1 21h22L12 2zm1 16h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
          </span>
        )}
      </div>

      <div className="hydra-node__output-selector">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            className={`hydra-node__buffer-btn ${bufferIndex === i ? 'hydra-node__buffer-btn--active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              updateOutputBuffer(id, i);
            }}
          >
            o{i}
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(OutputNode);
