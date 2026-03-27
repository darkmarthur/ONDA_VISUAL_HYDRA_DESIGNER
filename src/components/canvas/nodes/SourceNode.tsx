/**
 * Source Node Component
 * Represents Hydra source functions (osc, noise, shape, etc.)
 */

'use client';

import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Activity, Box, Sun, Type } from 'lucide-react';
import { HydraNodeData } from '@/hydra/types';
import { categoryMeta } from '@/hydra/registry';
import { useGraphStore } from '@/store/graphStore';

function SourceNode({ id, data, selected }: NodeProps & { data: HydraNodeData }) {
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);
  const setNodeAlias = useGraphStore((s) => s.setNodeAlias);
  const meta = categoryMeta[data.functionDef.category];

  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [editAlias, setEditAlias] = useState(data.alias || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingAlias && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingAlias]);

  const handleAliasSubmit = () => {
    setIsEditingAlias(false);
    if (editAlias !== data.alias) {
      setNodeAlias(id, editAlias);
    }
  };

  return (
    <div
      className={`hydra-node hydra-node--source ${selected ? 'hydra-node--selected' : ''}`}
      onClick={() => setSelectedNode(id)}
      style={{ '--node-accent': meta?.color || '#f472b6' } as React.CSSProperties}
    >
      <div 
        className="hydra-node__header"
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditingAlias(true);
          setEditAlias(data.alias || '');
        }}
        title="Double-click to set alias"
      >
        <span className="hydra-node__icon">
          <Activity size={14} strokeWidth={2.5} />
        </span>
        {isEditingAlias ? (
          <input
            ref={inputRef}
            className="hydra-node__alias-input"
            value={editAlias}
            onChange={(e) => setEditAlias(e.target.value)}
            onBlur={handleAliasSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAliasSubmit();
              if (e.key === 'Escape') {
                setIsEditingAlias(false);
                setEditAlias(data.alias || '');
              }
            }}
          />
        ) : (
          <div className="hydra-node__title-group">
            <span className="hydra-node__label">{data.alias || data.label}</span>
            {data.alias && <span className="hydra-node__badge">{data.hydraFunction}</span>}
          </div>
        )}
        {!data.alias && !isEditingAlias && <span className="hydra-node__category">{meta?.label || 'Source'}</span>}
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
        onClick={(e) => {
          e.stopPropagation();
          const state = useGraphStore.getState();
          const active = state.activeDraftConnection;
          
          if (active && active.handleType === 'target') {
            state.onConnect({
              source: id,
              sourceHandle: 'texture-out',
              target: active.nodeId,
              targetHandle: active.handleId
            });
            state.setActiveDraftConnection(null);
          } else {
            state.setActiveDraftConnection({ nodeId: id, handleId: 'texture-out', handleType: 'source' });
          }
        }}
      />
    </div>
  );
}

export default memo(SourceNode);
