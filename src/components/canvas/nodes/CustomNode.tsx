/**
 * Custom Node Component
 * Represents custom Javascript logic or functions.
 */

'use client';

import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Code } from 'lucide-react';
import { HydraNodeData } from '@/hydra/types';
import { categoryMeta } from '@/hydra/registry';
import { useGraphStore } from '@/store/graphStore';

function CustomNode({ id, data, selected }: NodeProps & { data: HydraNodeData }) {
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);
  const updateNodeParam = useGraphStore((s) => s.updateNodeParam);
  const meta = categoryMeta[data.functionDef.category];

  const codeValue = (data.params.code || '') as string;
  const nameValue = (data.params.name || '') as string;

  return (
    <div
      className={`hydra-node hydra-node--custom ${selected ? 'hydra-node--selected' : ''}`}
      onClick={() => setSelectedNode(id)}
      style={{ 
        '--node-accent': meta?.color || '#ed4c67',
        width: '320px' // Slightly wider for code
      } as React.CSSProperties}
    >
      <div className="hydra-node__header">
        <span className="hydra-node__icon">
          <Code size={14} strokeWidth={2.5} />
        </span>
        <div className="hydra-node__title-group">
            <span className="hydra-node__label">{data.alias || nameValue || 'Custom script'}</span>
        </div>
        <span className="hydra-node__category">{meta?.label || 'Custom'}</span>
      </div>

      <div className="hydra-node__params" style={{ padding: '4px' }}>
          <div className="hydra-node__custom-input-group">
              <label style={{ fontSize: '10px', opacity: 0.6, marginBottom: '4px', display: 'block' }}>Function Name / Identifier</label>
              <input 
                className="hydra-node__custom-name-input"
                value={nameValue}
                onChange={(e) => updateNodeParam(id, 'name', e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: 'white',
                    padding: '4px 8px',
                    fontSize: '11px',
                    marginBottom: '8px'
                }}
              />
              
              <label style={{ fontSize: '10px', opacity: 0.6, marginBottom: '4px', display: 'block' }}>Javascript Code</label>
              <textarea 
                className="hydra-node__custom-code-area"
                value={codeValue}
                onChange={(e) => updateNodeParam(id, 'code', e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                rows={5}
                spellCheck={false}
                style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: '#a5f3fc',
                    padding: '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    resize: 'vertical'
                }}
              />
          </div>
      </div>
      
      {/* Visual node output for reference if needed, though usually these are just global definitions */}
      <Handle
        type="source"
        position={Position.Right}
        id="value-out"
        className="hydra-handle"
        style={{ background: '#ed4c67' }}
        onPointerDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export default memo(CustomNode);
