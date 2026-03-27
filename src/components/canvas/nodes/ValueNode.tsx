/**
 * Value Node Component
 * Represents Hydra value sources such as time, mouse, FFT, or Math operators.
 * These nodes produce numerical values rather than textures.
 */

'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Activity, MousePointer2, Clock, Hash, Percent, Divide, Plus, X } from 'lucide-react';
import { HydraNodeData } from '@/hydra/types';
import { categoryMeta } from '@/hydra/registry';
import { useGraphStore } from '@/store/graphStore';

const ValueIcon = ({ name, size = 14 }: { name: string; size?: number }) => {
  if (name.includes('mouse')) return <MousePointer2 size={size} />;
  if (name === 'time') return <Clock size={size} />;
  if (name === 'fft') return <Activity size={size} />;
  if (name === 'mod') return <Divide size={size} />;
  return <Hash size={size} />;
};

function ValueNode({ id, data, selected }: NodeProps & { data: HydraNodeData }) {
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);
  const updateNodeParam = useGraphStore((s) => s.updateNodeParam);
  const removeNodeParam = useGraphStore((s) => s.removeNodeParam);
  const renameNodeParam = useGraphStore((s) => s.renameNodeParam);
  const updateNodeBinding = useGraphStore((s) => s.updateNodeBinding);
  const meta = categoryMeta[data.functionDef.category];

  const isConstant = data.hydraFunction === 'constant';

  // Helper to add a new constant variable
  const addConstantVar = () => {
    const nextIdx = Object.keys(data.params).length + 1;
    updateNodeParam(id, `var${nextIdx}`, 1.0);
  };

  return (
    <div
      className={`hydra-node hydra-node--value ${selected ? 'hydra-node--selected' : ''} ${isConstant ? 'hydra-node--constant' : ''}`}
      onClick={() => setSelectedNode(id)}
      style={{ '--node-accent': meta?.color || '#eab308' } as React.CSSProperties}
    >
      <div className="hydra-node__header">
        <span className="hydra-node__icon">
          <ValueIcon name={data.hydraFunction} size={14} />
        </span>
        <div className="hydra-node__title-group">
          <span className="hydra-node__label">{data.alias || data.label}</span>
        </div>
        {!isConstant && <span className="hydra-node__category">{meta?.label || 'Value'}</span>}
      </div>

      {isConstant ? (
        <div className="hydra-node__params hydra-node__params--constant">
          {Object.entries(data.params).map(([key, value]) => (
            <div key={key} className="hydra-node__param-row">
              <input
                className="hydra-node__param-key-input"
                value={key}
                spellCheck={false}
                onChange={(e) => renameNodeParam(id, key, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <input
                className="hydra-node__param-input"
                type="number"
                step={0.01}
                value={value as number}
                onChange={(e) => updateNodeParam(id, key, parseFloat(e.target.value))}
                onClick={(e) => e.stopPropagation()}
              />
              <button 
                className="hydra-node__remove-var-btn"
                onClick={(e) => { e.stopPropagation(); removeNodeParam(id, key); }}
              >
                <X size={10} />
              </button>
              <Handle
                type="source"
                position={Position.Right}
                id={`value-out:${key}`}
                style={{ right: -8, top: '50%' }}
                className="hydra-handle"
                onClick={(e) => {
                  e.stopPropagation();
                  const state = useGraphStore.getState();
                  const active = state.activeDraftConnection;
                  if (active && active.handleType === 'target') {
                    state.onConnect({
                      source: id,
                      sourceHandle: `value-out:${key}`,
                      target: active.nodeId,
                      targetHandle: active.handleId!,
                    });
                    state.setActiveDraftConnection(null);
                  } else {
                    state.setActiveDraftConnection({ nodeId: id, handleId: `value-out:${key}`, handleType: 'source' });
                  }
                }}
              />
            </div>
          ))}
          <button 
            className="hydra-node__add-btn" 
            onClick={(e) => { e.stopPropagation(); addConstantVar(); }}
          >
            <Plus size={10} /> Add Variable
          </button>
        </div>
      ) : data.params.body !== undefined ? (
        <div className="hydra-node__lambda-container">
          <div className="hydra-node__lambda-code">
            <span className="hydra-node__lambda-prefix">() =&gt;</span>
            <input
              className="hydra-node__lambda-input"
              value={(data.params.body as string) || (data.hydraFunction)}
              onChange={(e) => updateNodeParam(id, 'body', e.target.value)}
              spellCheck={false}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      ) : (
        data.functionDef.params.length > 0 && (
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
                        className="hydra-handle hydra-handle--param-in"
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
        )
      )}

      {/* Main output handle (for non-constant or legacy) */}
      {!isConstant && (
        <Handle
          type="source"
          position={Position.Right}
          id="value-out"
          className="hydra-handle hydra-handle--value-out"
          onClick={(e) => {
            e.stopPropagation();
            const state = useGraphStore.getState();
            const active = state.activeDraftConnection;
            
            if (active && active.handleType === 'target' && active.handleId?.startsWith('param-in')) {
              state.onConnect({
                source: id,
                sourceHandle: 'value-out',
                target: active.nodeId,
                targetHandle: active.handleId
              });
              state.setActiveDraftConnection(null);
            } else {
              state.setActiveDraftConnection({ nodeId: id, handleId: 'value-out', handleType: 'source' });
            }
          }}
        />
      )}
    </div>
  );
}

export default memo(ValueNode);
