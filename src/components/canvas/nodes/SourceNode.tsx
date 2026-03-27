/**
 * Source Node Component
 * Represents Hydra source functions (osc, noise, shape, etc.)
 */

'use client';

import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Activity } from 'lucide-react';
import { HydraNodeData } from '@/hydra/types';
import { categoryMeta } from '@/hydra/registry';
import { useGraphStore } from '@/store/graphStore';

function SourceNode({ id, data, selected }: NodeProps & { data: HydraNodeData }) {
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);
  const setNodeAlias = useGraphStore((s) => s.setNodeAlias);
  const updateNodeParam = useGraphStore((s) => s.updateNodeParam);
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
        {data.functionDef.params.map((p) => {
          const binding = data.bindings?.[p.name];
          const isBound = binding && binding.mode !== 'literal';

          return (
            <div key={p.name} className={`hydra-node__param-preview ${isBound ? 'hydra-node__param-preview--bound' : ''}`}>
              {p.canBind && (
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`param-in:${p.name}`}
                  className="hydra-handle"
                  title={`Bind ${p.name}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    const state = useGraphStore.getState();
                    const active = state.activeDraftConnection;
                    if (active && active.handleType === 'source') {
                      state.onConnect({
                        source: active.nodeId,
                        sourceHandle: active.handleId,
                        target: id,
                        targetHandle: `param-in:${p.name}`
                      });
                      state.setActiveDraftConnection(null);
                    } else {
                      state.setActiveDraftConnection({ nodeId: id, handleId: `param-in:${p.name}`, handleType: 'target' });
                    }
                  }}
                />
              )}
              <span className="hydra-node__param-name">{p.name}</span>
              <input
                className={`hydra-node__param-input ${isBound ? 'hydra-node__param-input--locked' : ''}`}
                type={isBound ? "text" : "number"}
                step={p.step || 0.01}
                value={isBound ? "() =>" : (data.params[p.name] ?? p.default)}
                disabled={isBound}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (!isBound) {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) updateNodeParam(id, p.name, val);
                  }
                }}
              />
            </div>
          );
        })}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="texture-out"
        className="hydra-handle"
        onPointerDown={(e) => e.stopPropagation()}
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
