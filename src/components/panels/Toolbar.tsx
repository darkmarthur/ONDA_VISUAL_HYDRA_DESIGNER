/**
 * Toolbar Component
 * Top bar with save/load, clear, and patch management.
 */

'use client';

import React, { useState } from 'react';
import { useGraphStore } from '@/store/graphStore';

export default function Toolbar() {
  const clearGraph = useGraphStore((s) => s.clearGraph);
  const savePatch = useGraphStore((s) => s.savePatch);
  const loadPatch = useGraphStore((s) => s.loadPatch);
  const getSavedPatches = useGraphStore((s) => s.getSavedPatches);

  const [showSave, setShowSave] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [patchName, setPatchName] = useState('');

  const handleSave = () => {
    if (patchName.trim()) {
      savePatch(patchName.trim());
      setPatchName('');
      setShowSave(false);
    }
  };

  const savedPatches = getSavedPatches();

  return (
    <header className="toolbar">
      <div className="toolbar__brand">
        <span className="toolbar__logo">◈</span>
        <h1 className="toolbar__title">HYDRA DESIGNER</h1>
        <span className="toolbar__subtitle">Visual Patch Editor</span>
      </div>

      <div className="toolbar__actions">
        {/* Save */}
        <div className="toolbar__action-group">
          <button
            className="toolbar__btn"
            onClick={() => { setShowSave(!showSave); setShowLoad(false); }}
          >
            💾 Save
          </button>
          {showSave && (
            <div className="toolbar__dropdown">
              <input
                type="text"
                placeholder="Patch name..."
                value={patchName}
                onChange={(e) => setPatchName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="toolbar__input"
                autoFocus
              />
              <button className="toolbar__dropdown-btn" onClick={handleSave}>
                Save Patch
              </button>
            </div>
          )}
        </div>

        {/* Load */}
        <div className="toolbar__action-group">
          <button
            className="toolbar__btn"
            onClick={() => { setShowLoad(!showLoad); setShowSave(false); }}
          >
            📂 Load
          </button>
          {showLoad && (
            <div className="toolbar__dropdown">
              {savedPatches.length === 0 ? (
                <p className="toolbar__dropdown-empty">No saved patches</p>
              ) : (
                savedPatches.map((name) => (
                  <button
                    key={name}
                    className="toolbar__dropdown-item"
                    onClick={() => {
                      loadPatch(name);
                      setShowLoad(false);
                    }}
                  >
                    {name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Clear */}
        <button
          className="toolbar__btn toolbar__btn--danger"
          onClick={() => {
            if (window.confirm('Clear the entire patch? This cannot be undone.')) {
              clearGraph();
            }
          }}
        >
          🗑 Clear
        </button>
      </div>
    </header>
  );
}
