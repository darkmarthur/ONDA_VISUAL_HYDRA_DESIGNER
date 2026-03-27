/**
 * Inspector Panel
 * Right sidebar — displays and edits parameters of the currently selected node.
 */

'use client';

import React from 'react';
import { useGraphStore } from '@/store/graphStore';
import { categoryMeta } from '@/hydra/registry';
import { HydraParamDef } from '@/hydra/types';

export default function Inspector() {
  const nodes = useGraphStore((s) => s.nodes);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const updateNodeParam = useGraphStore((s) => s.updateNodeParam);
  const removeNode = useGraphStore((s) => s.removeNode);
  const setNodeAlias = useGraphStore((s) => s.setNodeAlias);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  if (!selectedNode) {
    return (
      <aside className="inspector">
        <div className="inspector__empty">
          <div className="inspector__empty-icon">⬡</div>
          <p className="inspector__empty-text">Select a node to inspect its parameters</p>
        </div>
      </aside>
    );
  }

  const { data } = selectedNode;
  const meta = categoryMeta[data.functionDef.category];
  const isOutput = data.nodeType === 'output';

  return (
    <aside className="inspector">
      <div className="inspector__header" style={{ '--accent': meta?.color || '#6366f1' } as React.CSSProperties}>
        <div className="inspector__title-row">
          <span className="inspector__icon">{meta?.icon || '⬡'}</span>
          <h3 className="inspector__title">{data.label}</h3>
        </div>
        <span className="inspector__category-badge" style={{ background: meta?.color }}>
          {meta?.label || data.functionDef.category}
        </span>
        {data.functionDef.description && (
          <p className="inspector__description">{data.functionDef.description}</p>
        )}
        <div className="inspector__meta">
          <span className="inspector__type-badge">type: {data.functionDef.type}</span>
        </div>
        <div className="inspector__alias-section" style={{ marginTop: '16px' }}>
          <label className="inspector__param-label" style={{ display: 'block', marginBottom: '4px' }}>Node Alias (Custom Label)</label>
          <input 
            type="text" 
            className="inspector__param-number" 
            style={{ width: '100%', textAlign: 'left', padding: '6px 8px' }}
            placeholder={`e.g. main_${data.hydraFunction}`}
            value={data.alias || ''}
            onChange={(e) => setNodeAlias(selectedNode.id, e.target.value)}
          />
        </div>
      </div>

      {!isOutput && data.functionDef.params.length > 0 && (
        <div className="inspector__params">
          <h4 className="inspector__section-title">Parameters</h4>
          {data.functionDef.params.map((paramDef: HydraParamDef) => {
            const value = data.params[paramDef.name] ?? paramDef.default;
            return (
              <div key={paramDef.name} className="inspector__param">
                <div className="inspector__param-header">
                  <label className="inspector__param-label">{paramDef.name}</label>
                  <input
                    type="number"
                    className="inspector__param-number"
                    value={value}
                    step={paramDef.step || 0.01}
                    min={paramDef.min}
                    max={paramDef.max}
                    onChange={(e) =>
                      updateNodeParam(
                        selectedNode.id,
                        paramDef.name,
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <input
                  type="range"
                  className="inspector__param-slider"
                  value={value}
                  step={paramDef.step || 0.01}
                  min={paramDef.min ?? 0}
                  max={paramDef.max ?? 10}
                  onChange={(e) =>
                    updateNodeParam(
                      selectedNode.id,
                      paramDef.name,
                      parseFloat(e.target.value),
                    )
                  }
                />
                <div className="inspector__param-range">
                  <span>{paramDef.min ?? 0}</span>
                  <span className="inspector__param-default">
                    default: {paramDef.default}
                  </span>
                  <span>{paramDef.max ?? 10}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isOutput && (
        <div className="inspector__params">
          <h4 className="inspector__section-title">Output Buffer</h4>
          <p className="inspector__hint">
            Select which output buffer this chain renders to.
            Use different buffers for multi-output patches.
          </p>
        </div>
      )}

      <div className="inspector__actions">
        <button
          className="inspector__btn inspector__btn--reset"
          onClick={() => {
            data.functionDef.params.forEach((p: HydraParamDef) => {
              updateNodeParam(selectedNode.id, p.name, p.default);
            });
          }}
        >
          Reset Defaults
        </button>
        <button
          className="inspector__btn inspector__btn--delete"
          onClick={() => removeNode(selectedNode.id)}
        >
          Delete Node
        </button>
      </div>
    </aside>
  );
}
