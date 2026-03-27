/**
 * Transform Node Component
 * Represents Hydra transform functions (coord, color, combine, combineCoord)
 */

'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, useHandleConnections } from '@xyflow/react';
import { HydraNodeData } from '@/hydra/types';
import { categoryMeta } from '@/hydra/registry';
import { useGraphStore } from '@/store/graphStore';

function TransformNode({ id, data, selected }: NodeProps & { data: HydraNodeData }) {
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);
  const meta = categoryMeta[data.functionDef.category];
  const isCombine = data.functionDef.type === 'combine' || data.functionDef.type === 'combineCoord';

  const mainConnections = useHandleConnections({ type: 'target', id: 'texture-in' });
  const secConnections = useHandleConnections({ type: 'target', id: 'texture-secondary' });
  
  const hasMain = mainConnections.length > 0;
  const hasSec = isCombine ? secConnections.length > 0 : true;
  const hasError = !hasMain || !hasSec;

  return (
    <div
      className={`hydra-node hydra-node--transform ${selected ? 'hydra-node--selected' : ''} ${hasError ? 'hydra-node--error' : ''}`}
      onClick={() => setSelectedNode(id)}
      style={{ '--node-accent': meta?.color || '#60a5fa' } as React.CSSProperties}
    >
      {/* Main texture input on the left */}
      <Handle
        type="target"
        position={Position.Left}
        id="texture-in"
        className="hydra-handle hydra-handle--texture-in"
        style={{ top: isCombine ? '35%' : '50%' }}
      />

      {/* Secondary texture input (only for combine/combineCoord) */}
      {isCombine && (
        <Handle
          type="target"
          position={Position.Left}
          id="texture-secondary"
          className="hydra-handle hydra-handle--texture-secondary"
          style={{ top: '65%' }}
        />
      )}

      <div className="hydra-node__header">
        <span className="hydra-node__icon">{meta?.icon || '⬡'}</span>
        <span className="hydra-node__label">{data.label}</span>
        {hasError && (
          <span className="hydra-node__error-icon" title="Missing required connection">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--accent-red)" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L1 21h22L12 2zm1 16h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
          </span>
        )}
        <span className="hydra-node__category">{meta?.label}</span>
      </div>

      {/* Visual indicator for combine nodes */}
      {isCombine && (
        <div className="hydra-node__combine-indicator">
          <div className="hydra-node__input-label" style={{ top: '28%' }}>main</div>
          <div className="hydra-node__input-label hydra-node__input-label--secondary" style={{ top: '58%' }}>
            texture
          </div>
        </div>
      )}

      <div className="hydra-node__params">
        {data.functionDef.params.slice(0, 2).map((p) => (
          <div key={p.name} className="hydra-node__param-preview">
            <span className="hydra-node__param-name">{p.name}</span>
            <span className="hydra-node__param-value">
              {(data.params[p.name] ?? p.default).toFixed(2)}
            </span>
          </div>
        ))}
        {data.functionDef.params.length > 2 && (
          <div className="hydra-node__param-more">
            +{data.functionDef.params.length - 2} more
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="texture-out"
        className="hydra-handle hydra-handle--texture-out"
      />
    </div>
  );
}

export default memo(TransformNode);
