/**
 * Node Library Panel
 * Left sidebar — categorized list of Hydra functions to drag onto the canvas.
 */

'use client';

import React, { useState, DragEvent } from 'react';
import { hydraFunctionRegistry, categoryMeta } from '@/hydra/registry';
import { HydraCategory } from '@/hydra/types';

const categories: { key: HydraCategory; label: string }[] = [
  { key: 'source', label: 'Source' },
  { key: 'geometry', label: 'Geometry' },
  { key: 'color', label: 'Color' },
  { key: 'blend', label: 'Blend' },
  { key: 'modulate', label: 'Modulate' },
];

export default function NodeLibrary() {
  const [expandedCategory, setExpandedCategory] = useState<string>('source');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFunctions = searchQuery
    ? hydraFunctionRegistry.filter((fn) =>
        fn.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const onDragStart = (event: DragEvent, functionName: string) => {
    event.dataTransfer.setData(
      'application/hydra-node',
      JSON.stringify({ functionName, type: 'function' })
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  const onOutputDragStart = (event: DragEvent, buffer: string) => {
    event.dataTransfer.setData(
      'application/hydra-node',
      JSON.stringify({ type: 'output', buffer })
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="node-library">
      <div className="node-library__header">
        <h2 className="node-library__title">Nodes</h2>
        <div className="node-library__search">
          <input
            type="text"
            placeholder="Search functions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="node-library__search-input"
          />
        </div>
      </div>

      <div className="node-library__content">
        {/* Search results */}
        {filteredFunctions ? (
          <div className="node-library__search-results">
            {filteredFunctions.length === 0 ? (
              <p className="node-library__empty">No functions found</p>
            ) : (
              filteredFunctions.map((fn) => {
                const meta = categoryMeta[fn.category];
                return (
                  <div
                    key={fn.name}
                    className="node-library__item"
                    draggable
                    onDragStart={(e) => onDragStart(e, fn.name)}
                    style={{ '--item-color': meta?.color } as React.CSSProperties}
                  >
                    <span className="node-library__item-icon">{meta?.icon}</span>
                    <span className="node-library__item-name">{fn.name}</span>
                    <span className="node-library__item-type">{fn.type}</span>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <>
            {/* Categorized list */}
            {categories.map((cat) => {
              const meta = categoryMeta[cat.key];
              const functions = hydraFunctionRegistry.filter(
                (fn) => fn.category === cat.key
              );

              return (
                <div key={cat.key} className="node-library__category">
                  <button
                    className={`node-library__category-header ${
                      expandedCategory === cat.key ? 'node-library__category-header--expanded' : ''
                    }`}
                    onClick={() =>
                      setExpandedCategory(
                        expandedCategory === cat.key ? '' : cat.key
                      )
                    }
                    style={{ '--cat-color': meta?.color } as React.CSSProperties}
                  >
                    <span className="node-library__category-icon">{meta?.icon}</span>
                    <span className="node-library__category-label">{cat.label}</span>
                    <span className="node-library__category-count">{functions.length}</span>
                    <span className="node-library__category-chevron">
                      {expandedCategory === cat.key ? '▾' : '▸'}
                    </span>
                  </button>

                  {expandedCategory === cat.key && (
                    <div className="node-library__items">
                      {functions.map((fn) => (
                        <div
                          key={fn.name}
                          className="node-library__item"
                          draggable
                          onDragStart={(e) => onDragStart(e, fn.name)}
                          title={fn.description}
                          style={{ '--item-color': meta?.color } as React.CSSProperties}
                        >
                          <span className="node-library__item-name">{fn.name}</span>
                          {fn.description && (
                            <span className="node-library__item-desc">{fn.description}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Output nodes */}
            <div className="node-library__category">
              <button
                className={`node-library__category-header ${
                  expandedCategory === 'output' ? 'node-library__category-header--expanded' : ''
                }`}
                onClick={() =>
                  setExpandedCategory(expandedCategory === 'output' ? '' : 'output')
                }
                style={{ '--cat-color': '#ef4444' } as React.CSSProperties}
              >
                <span className="node-library__category-icon">▶</span>
                <span className="node-library__category-label">Output</span>
                <span className="node-library__category-count">4</span>
                <span className="node-library__category-chevron">
                  {expandedCategory === 'output' ? '▾' : '▸'}
                </span>
              </button>

              {expandedCategory === 'output' && (
                <div className="node-library__items">
                  {['o0', 'o1', 'o2', 'o3'].map((buf) => (
                    <div
                      key={buf}
                      className="node-library__item"
                      draggable
                      onDragStart={(e) => onOutputDragStart(e, buf)}
                      style={{ '--item-color': '#ef4444' } as React.CSSProperties}
                    >
                      <span className="node-library__item-name">out({buf})</span>
                      <span className="node-library__item-desc">Output buffer {buf}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
