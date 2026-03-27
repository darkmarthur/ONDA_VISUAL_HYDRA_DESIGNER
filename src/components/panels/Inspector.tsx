/**
 * Inspector Panel
 * Right sidebar — displays and edits parameters of the currently selected node.
 */

'use client';

import React from 'react';
import { 
  Activity, 
  Layers, 
  Filter, 
  Box, 
  Zap, 
  Monitor, 
  Grid,
  Sun,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { categoryMeta } from '@/hydra/registry';
import { HydraParamDef } from '@/hydra/types';

const CategoryIcon = ({ category, size = 14, color }: { category: string; size?: number; color?: string }) => {
  const iconProps = { size, style: { color: color || 'currentColor' } };
  switch (category) {
    case 'source': return <Zap {...iconProps} />;
    case 'geometry': return <Box {...iconProps} />;
    case 'color': return <Sun {...iconProps} />;
    case 'blend': return <Layers {...iconProps} />;
    case 'modulate': return <Activity {...iconProps} />;
    case 'output': return <Monitor {...iconProps} />;
    default: return <Grid {...iconProps} />;
  }
};

export default function Inspector() {
  const nodes = useGraphStore((s) => s.nodes);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const updateNodeParam = useGraphStore((s) => s.updateNodeParam);
  const updateNodeBinding = useGraphStore((s) => s.updateNodeBinding);
  const removeNode = useGraphStore((s) => s.removeNode);
  const setNodeAlias = useGraphStore((s) => s.setNodeAlias);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  if (!selectedNode) {
    return (
      <aside className="inspector">
        <div className="inspector__empty">
          <div className="inspector__empty-icon">
            <Grid size={48} strokeWidth={1} />
          </div>
          <p className="inspector__empty-text">Select a node to inspect its parameters</p>
        </div>
      </aside>
    );
  }

  const { data } = selectedNode;
  const meta = categoryMeta[data.functionDef.category];
  const isOutput = data.nodeType === 'output';

  const formatParamDefList = (params: HydraParamDef[]) => {
    return params.map(p => `${p.name} = ${p.default}`).join(', ');
  };

  const getCanonicalSignature = () => {
    if (isOutput) return `.out(oN)`;
    const paramsStr = formatParamDefList(data.functionDef.params);
    if (data.functionDef.type === 'src') {
      return `${data.hydraFunction}(${paramsStr})`;
    } else if (data.functionDef.type === 'combine' || data.functionDef.type === 'combineCoord') {
      return `.${data.hydraFunction}(texture${paramsStr ? ', ' + paramsStr : ''})`;
    }
    return `.${data.hydraFunction}(${paramsStr})`;
  };

  const getCurrentSnippet = () => {
    if (isOutput) {
      const bufferIndex = data.params.buffer ?? 0;
      return `.out(o${bufferIndex})`;
    }
    const paramsStr = data.functionDef.params.map((p: HydraParamDef) => {
      const val = data.params[p.name] ?? p.default;
      return typeof val === 'number' ? val.toFixed(2).replace(/\.00$/, '') : String(val);
    }).join(', ');
    
    if (data.functionDef.type === 'src') {
      return `${data.hydraFunction}(${paramsStr})`;
    } else if (data.functionDef.type === 'combine' || data.functionDef.type === 'combineCoord') {
      return `.${data.hydraFunction}(/* texture */${paramsStr ? ', ' + paramsStr : ''})`;
    }
    return `.${data.hydraFunction}(${paramsStr})`;
  };

  const getExampleUsage = () => {
    if (data.functionDef.exampleUsage && data.functionDef.exampleUsage.length > 0) {
      return data.functionDef.exampleUsage[0];
    }
    // Generate systematic dummy example
    const defaults = data.functionDef.params.map((p: HydraParamDef) => p.default).join(', ');
    if (data.functionDef.type === 'src') {
      return `${data.hydraFunction}(${defaults})\n  .out()`;
    } else if (data.functionDef.type === 'combine' || data.functionDef.type === 'combineCoord') {
      return `osc().${data.hydraFunction}(noise()${defaults ? ', ' + defaults : ''})\n  .out()`;
    }
    return `osc().${data.hydraFunction}(${defaults})\n  .out()`;
  };

  return (
    <aside className="inspector">
      <div className="inspector__header" style={{ '--accent': meta?.color || '#6366f1' } as React.CSSProperties}>
        <div className="inspector__title-row">
          <span className="inspector__icon">
            <CategoryIcon category={data.functionDef.category} size={20} color="var(--accent)" />
          </span>
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
            const binding = data.bindings?.[paramDef.name];
            const isBound = binding && binding.mode !== 'literal';

            return (
              <div key={paramDef.name} className={`inspector__param ${isBound ? 'inspector__param--bound' : ''}`}>
                <div className="inspector__param-header">
                  <label className="inspector__param-label">{paramDef.name}</label>
                  {isBound ? (
                    <div className="inspector__binding-summary">
                      <span className="inspector__binding-badge">SIGNAL</span>
                      <button 
                        className="inspector__param-reset"
                        onClick={() => {
                          const state = useGraphStore.getState();
                          useGraphStore.setState((s) => ({
                            nodes: s.nodes.map(n => n.id === selectedNode.id ? {
                              ...n, data: { ...n.data, bindings: { ...n.data.bindings, [paramDef.name]: { mode: 'literal' } } }
                            } : n)
                          }));
                          state.regenerateCode();
                        }}
                      >
                        <RotateCcw size={10} />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="number"
                      className="inspector__param-number"
                      value={value}
                      step={paramDef.step || 0.01}
                      onChange={(e) => updateNodeParam(selectedNode.id, paramDef.name, parseFloat(e.target.value) || 0)}
                    />
                  )}
                </div>
                
                {isBound ? (
                  <div className="inspector__binding-details">
                    <input
                      className="inspector__param-input inspector__param-input--binding"
                      value={binding.expression || ''}
                      onChange={(e) => updateNodeBinding(selectedNode.id, paramDef.name, { expression: e.target.value })}
                      placeholder="e.g. time * 0.5"
                      spellCheck={false}
                    />
                  </div>
                ) : (
                  <input
                    type="range"
                    className="inspector__param-slider"
                    min={paramDef.min ?? 0}
                    max={paramDef.max ?? 10}
                    step={paramDef.step || 0.01}
                    value={value as number}
                    onChange={(e) => updateNodeParam(selectedNode.id, paramDef.name, parseFloat(e.target.value) || 0)}
                  />
                )}
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

      <div className="inspector__params inspector__pedagogy">
        <h4 className="inspector__section-title">Base Signature</h4>
        <pre className="inspector__snippet-block">{getCanonicalSignature()}</pre>
        
        <h4 className="inspector__section-title" style={{ marginTop: '12px' }}>Current Snippet</h4>
        <pre className="inspector__snippet-block inspector__snippet-block--current">{getCurrentSnippet()}</pre>
        
        <h4 className="inspector__section-title" style={{ marginTop: '12px' }}>Example Usage</h4>
        <pre className="inspector__snippet-block inspector__snippet-block--example">{getExampleUsage()}</pre>
        
        <p className="inspector__hint" style={{ marginTop: '8px' }}>
          Hydra parameters accept dynamic inputs such as: <code>10</code>, <code>[10, 20]</code>, <code>() =&gt; time</code>, <code>() =&gt; mouse.x</code>, <code>() =&gt; a.fft[0]</code>
        </p>
      </div>

      <div className="inspector__actions">
        <button
          className="inspector__btn inspector__btn--reset"
          onClick={() => {
            data.functionDef.params.forEach((p: HydraParamDef) => {
              updateNodeParam(selectedNode.id, p.name, p.default);
            });
          }}
        >
          <RotateCcw size={12} style={{ marginRight: '6px' }} />
          Reset Defaults
        </button>
        <button
          className="inspector__btn inspector__btn--delete"
          onClick={() => removeNode(selectedNode.id)}
        >
          <Trash2 size={12} style={{ marginRight: '6px' }} />
          Delete Node
        </button>
      </div>
    </aside>
  );
}
