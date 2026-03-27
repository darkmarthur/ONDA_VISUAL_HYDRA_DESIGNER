/**
 * Source Node Component
 * Represents Hydra source functions (osc, noise, shape, etc.)
 */

'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { HydraNodeData } from '@/hydra/types';
import { categoryMeta } from '@/hydra/registry';
import { useGraphStore } from '@/store/graphStore';

function SourceNode({ id, data, selected }: NodeProps & { data: HydraNodeData }) {
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);
  const meta = categoryMeta[data.functionDef.category];

  return (
    <div
      className={`hydra-node hydra-node--source ${selected ? 'hydra-node--selected' : ''}`}
      onClick={() => setSelectedNode(id)}
      style={{ '--node-accent': meta?.color || '#f472b6' } as React.CSSProperties}
    >
      <div className="hydra-node__header">
        <span className="hydra-node__icon">{meta?.icon || '◉'}</span>
        <span className="hydra-node__label">{data.label}</span>
        <span className="hydra-node__category">{meta?.label || 'Source'}</span>
      </div>
      <div className="hydra-node__params">
        {data.functionDef.params.slice(0, 3).map((p) => (
          <div key={p.name} className="hydra-node__param-preview">
            <span className="hydra-node__param-name">{p.name}</span>
            <span className="hydra-node__param-value">
              {(data.params[p.name] ?? p.default).toFixed(2)}
            </span>
          </div>
        ))}
        {data.functionDef.params.length > 3 && (
          <div className="hydra-node__param-more">
            +{data.functionDef.params.length - 3} more
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

export default memo(SourceNode);
