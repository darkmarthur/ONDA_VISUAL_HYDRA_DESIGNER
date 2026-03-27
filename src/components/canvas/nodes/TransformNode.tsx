/**
 * Transform Node Component
 * Represents Hydra transform functions (coord, color, combine, combineCoord)
 */

'use client';

import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, useHandleConnections } from '@xyflow/react';
import { Filter, Layers, Box } from 'lucide-react';
import { HydraNodeData } from '@/hydra/types';
import { categoryMeta } from '@/hydra/registry';
import { useGraphStore } from '@/store/graphStore';

function TransformNode({ id, data, selected }: NodeProps&{ data: HydraNodeData }) {
  const setSelectedNode=useGraphStore((s) => s.setSelectedNode);
  const setNodeAlias=useGraphStore((s) => s.setNodeAlias);
  const updateNodeParam=useGraphStore((s) => s.updateNodeParam);
  const updateNodeBinding=useGraphStore((s) => s.updateNodeBinding);
  const meta=categoryMeta[data.functionDef.category];
  const isCombine=data.functionDef.type==='combine'||data.functionDef.type==='combineCoord';

  const mainConnections=useHandleConnections({ type: 'target', id: 'texture-in' });
  const secConnections=useHandleConnections({ type: 'target', id: 'texture-secondary' });

  const hasMain=mainConnections.length>0;
  const hasSec=isCombine? secConnections.length>0:true;
  const hasError=!hasMain||!hasSec;

  const [isEditingAlias, setIsEditingAlias]=useState(false);
  const [editAlias, setEditAlias]=useState(data.alias||'');
  const inputRef=useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingAlias&&inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingAlias]);

  const handleAliasSubmit=() => {
    setIsEditingAlias(false);
    if (editAlias!==data.alias) {
      setNodeAlias(id, editAlias);
    }
  };

  return (
    <div
      className={`hydra-node hydra-node--transform ${selected? 'hydra-node--selected':''} ${hasError? 'hydra-node--error':''}`}
      onClick={() => setSelectedNode(id)}
      style={{ '--node-accent': meta?.color||'#60a5fa' } as React.CSSProperties}
    >
      {/* Main texture input on the left */}
      <Handle
        type="target"
        position={Position.Left}
        id="texture-in"
        className="hydra-handle hydra-handle--texture-in"
        style={{ top: isCombine? '45%':'50%' }}
        onClick={(e) => {
          e.stopPropagation();
          const state=useGraphStore.getState();
          const active=state.activeDraftConnection;
          if (active&&active.handleType==='source') {
            state.onConnect({
              source: active.nodeId,
              sourceHandle: active.handleId,
              target: id,
              targetHandle: 'texture-in'
            });
            state.setActiveDraftConnection(null);
          } else {
            state.setActiveDraftConnection({ nodeId: id, handleId: 'texture-in', handleType: 'target' });
          }
        }}
      />

      {/* Secondary texture input (only for combine/combineCoord) */}
      {isCombine&&(
        <Handle
          type="target"
          position={Position.Left}
          id="texture-secondary"
          className="hydra-handle hydra-handle--texture-secondary"
          style={{ top: '75%' }}
          onClick={(e) => {
            e.stopPropagation();
            const state=useGraphStore.getState();
            const active=state.activeDraftConnection;
            if (active&&active.handleType==='source') {
              state.onConnect({
                source: active.nodeId,
                sourceHandle: active.handleId,
                target: id,
                targetHandle: 'texture-secondary'
              });
              state.setActiveDraftConnection(null);
            } else {
              state.setActiveDraftConnection({ nodeId: id, handleId: 'texture-secondary', handleType: 'target' });
            }
          }}
        />
      )}

      <div
        className="hydra-node__header"
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditingAlias(true);
          setEditAlias(data.alias||'');
        }}
        title="Double-click to set alias"
      >
        <span className="hydra-node__icon">
          <Filter size={14} strokeWidth={2.5} />
        </span>
        {isEditingAlias? (
          <input
            ref={inputRef}
            className="hydra-node__alias-input"
            value={editAlias}
            onChange={(e) => setEditAlias(e.target.value)}
            onBlur={handleAliasSubmit}
            onKeyDown={(e) => {
              if (e.key==='Enter') handleAliasSubmit();
              if (e.key==='Escape') {
                setIsEditingAlias(false);
                setEditAlias(data.alias||'');
              }
            }}
          />
        ):(
          <div className="hydra-node__title-group">
            <span className="hydra-node__label">{data.alias||data.label}</span>
            {data.alias&&<span className="hydra-node__badge">{data.hydraFunction}</span>}
          </div>
        )}
        {hasError&&(
          <span className="hydra-node__error-icon" title="Missing required connection">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--accent-red)" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L1 21h22L12 2zm1 16h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
          </span>
        )}
        <span className="hydra-node__category">{meta?.label}</span>
      </div>

      {/* Visual indicator for combine nodes */}
      {isCombine&&(
        <div className="hydra-node__combine-indicator">
          <div className="hydra-node__input-label" style={{ top: '45%' }}>main</div>
          <div className="hydra-node__input-label hydra-node__input-label--secondary" style={{ top: '75%' }}>
            text
          </div>
        </div>
      )}

      <div className={`hydra-node__params ${isCombine? 'hydra-node__params--combine':''}`}>
        {data.functionDef.params.map((p) => {
          const binding=data.bindings?.[p.name];
          const isBound=binding&&binding.mode!=='literal';

          return (
            <div key={p.name} className={`hydra-node__param-preview ${isBound? 'hydra-node__param-preview--bound':''}`}>
              {p.canBind&&(
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`param-in:${p.name}`}
                  className="hydra-handle hydra-handle--param-in"
                  title={`Bind ${p.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const state=useGraphStore.getState();
                    const active=state.activeDraftConnection;
                    if (active&&active.handleType==='source'&&active.handleId?.startsWith('value-out')) {
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
                className={`hydra-node__param-input ${isBound? 'hydra-node__param-input--locked':''}`}
                type={isBound? "text":"number"}
                step={p.step||0.01}
                value={isBound? "() =>":(data.params[p.name]??p.default)}
                disabled={isBound}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (!isBound) {
                    const val=parseFloat(e.target.value);
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
        className="hydra-handle hydra-handle--texture-out"
        onClick={(e) => {
          e.stopPropagation();
          const state=useGraphStore.getState();
          const active=state.activeDraftConnection;
          if (active&&active.handleType==='target') {
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

export default memo(TransformNode);
