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

function ConstantRow({ nodeId, name, value }: { nodeId: string; name: string; value: number }) {
  const [localName, setLocalName] = React.useState(name);
  const updateNodeParam = useGraphStore((s) => s.updateNodeParam);
  const removeNodeParam = useGraphStore((s) => s.removeNodeParam);
  const renameNodeParam = useGraphStore((s) => s.renameNodeParam);

  // Sync local name if prop changes from outside
  React.useEffect(() => {
    setLocalName(name);
  }, [name]);

  const handleBlur = () => {
    if (localName !== name && localName.trim()) {
      renameNodeParam(nodeId, name, localName);
    }
  };

  return (
    <div className="hydra-node__param-preview hydra-node__param-preview--constant">
      <input
        className="hydra-node__param-key-input"
        value={localName}
        spellCheck={false}
        onChange={(e) => setLocalName(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
        onClick={(e) => e.stopPropagation()}
      />
      <input
        className="hydra-node__param-input"
        type="number"
        step={0.01}
        value={value}
        onChange={(e) => updateNodeParam(nodeId, name, parseFloat(e.target.value))}
        onClick={(e) => e.stopPropagation()}
      />
      <button 
        className="hydra-node__remove-var-btn"
        onClick={(e) => { e.stopPropagation(); removeNodeParam(nodeId, name); }}
      >
        <X size={10} />
      </button>
      <Handle
        type="source"
        position={Position.Right}
        id={`value-out:${name}`}
        className="hydra-handle"
        style={{ top: '50%', right: -4, transform: 'translateY(-50%)' }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          const state = useGraphStore.getState();
          const active = state.activeDraftConnection;
          if (active && active.handleType === 'target') {
            state.onConnect({
              source: nodeId,
              sourceHandle: `value-out:${name}`,
              target: active.nodeId,
              targetHandle: active.handleId
            });
            state.setActiveDraftConnection(null);
          } else {
            state.setActiveDraftConnection({ nodeId: nodeId, handleId: `value-out:${name}`, handleType: 'source' });
          }
        }}
      />
    </div>
  );
}

function ValueNode({ id, data, selected }: NodeProps & { data: HydraNodeData }) {
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);
  const updateNodeParam = useGraphStore((s) => s.updateNodeParam);
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
        {isConstant ? (
          <button 
            className="hydra-node__header-action"
            onClick={(e) => { e.stopPropagation(); addConstantVar(); }}
            title="Add Variable"
          >
            <Plus size={12} />
          </button>
        ) : (
          <span className="hydra-node__category">{meta?.label || 'Value'}</span>
        )}
      </div>

      {isConstant ? (
        <div className="hydra-node__params hydra-node__params--constant">
          {Object.entries(data.params).map(([key, value]) => (
            <ConstantRow key={key} nodeId={id} name={key} value={value as number} />
          ))}
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
                        title={`Bind ${p.name}`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          const state = useGraphStore.getState();
                          const active = state.activeDraftConnection;
                          if (active && active.handleType === 'source') {
                            state.onConnect({
                              source: active.nodeId,
                              sourceHandle: active.handleId!,
                              target: id,
                              targetHandle: `param-in:${p.name}`,
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
        )
      )}

      {/* Main output handle (for non-constant or legacy) */}
      {!isConstant && (
        <Handle
          type="source"
          position={Position.Right}
          id="value-out"
          className="hydra-handle"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            const state = useGraphStore.getState();
            const active = state.activeDraftConnection;
            if (active && active.handleType === 'target') {
              state.onConnect({
                source: id,
                sourceHandle: 'value-out',
                target: active.nodeId,
                targetHandle: active.handleId!,
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
