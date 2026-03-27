'use client';

import React, { useState, useRef } from 'react';
import { useGraphStore } from '@/store/graphStore';

export default function Toolbar() {
  const clearGraph = useGraphStore((s) => s.clearGraph);
  const savePatch = useGraphStore((s) => s.savePatch);
  const loadPatch = useGraphStore((s) => s.loadPatch);
  const getSavedPatches = useGraphStore((s) => s.getSavedPatches);
  const serializeGraph = useGraphStore((s) => s.serializeGraph);
  const deserializeGraph = useGraphStore((s) => s.deserializeGraph);
  const updateGraphFromCode = useGraphStore((s) => s.updateGraphFromCode);
  const editorMode = useGraphStore((s) => s.editorMode);
  const setEditorMode = useGraphStore((s) => s.setEditorMode);

  const [showSave, setShowSave] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [patchName, setPatchName] = useState('');

  const savedPatches = getSavedPatches();
  const lastPatch = savedPatches.length > 0 ? savedPatches[savedPatches.length - 1] : null;
  const liveWindowRef = useRef<Window | null>(null);

  const handleSave = () => {
    if (patchName.trim()) {
      savePatch(patchName.trim());
      setPatchName('');
      setShowSave(false);
    }
  };

  const handleExportJS = () => {
    const json = serializeGraph();
    const code = useGraphStore.getState().generatedCode;
    const fileContent = `// ONDA VISUAL HYDRA DESIGNER PATCH\n// ==BEGIN_GRAPH==\n// ${json}\n// ==END_GRAPH==\n\n${code}`;
    
    const blob = new Blob([fileContent], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hydra-patch-${Date.now()}.js`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  const handleImportJS = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.js';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const graphMatch = text.match(/\/\/ ==BEGIN_GRAPH==\s*\/\/\s*([\s\S]*?)\s*\/\/ ==END_GRAPH==/);
        if (graphMatch && graphMatch[1]) {
          deserializeGraph(graphMatch[1]);
        } else {
          // If no JSON block, try code sync
          updateGraphFromCode(text);
        }
      };
      reader.readAsText(file);
    };
    input.click();
    setShowMenu(false);
  };

  const launchLiveWindow = () => {
    if (liveWindowRef.current && !liveWindowRef.current.closed) {
      liveWindowRef.current.focus();
    } else {
      liveWindowRef.current = window.open('/live', 'HydraLive', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
    }
  };

  const closeLiveWindow = () => {
    if (liveWindowRef.current && !liveWindowRef.current.closed) {
      liveWindowRef.current.close();
      liveWindowRef.current = null;
    }
  };

  return (
    <header className="toolbar">
      <div className="toolbar__brand">
        <span className="toolbar__logo">◈</span>
        <h1 className="toolbar__title">HYDRA DESIGNER</h1>
      </div>

      <div className="toolbar__mode-switch">
        <button
          className={`toolbar__btn toolbar__mode-btn ${editorMode === 'visual' ? 'toolbar__mode-btn--active' : ''}`}
          onClick={() => setEditorMode('visual')}
        >
          Visual Editor
        </button>
        <button
          className={`toolbar__btn toolbar__mode-btn ${editorMode === 'code' ? 'toolbar__mode-btn--active' : ''}`}
          onClick={() => setEditorMode('code')}
        >
          Code Editor
        </button>
      </div>

      <div className="toolbar__actions">
        {/* Live Window Controls — Always Visible */}
        <div className="toolbar__action-group toolbar__live-controls">
          <button 
            className="toolbar__btn toolbar__btn--live-show" 
            onClick={launchLiveWindow}
          >
            ◱ Show Live
          </button>
          <button 
            className="toolbar__btn toolbar__btn--live-hide"
            onClick={closeLiveWindow}
          >
            ✕ Hide
          </button>
        </div>

        {/* Quick Load Last */}
        <button 
          className="toolbar__btn" 
          onClick={() => lastPatch && loadPatch(lastPatch)}
          disabled={!lastPatch}
          style={{ opacity: lastPatch ? 1 : 0.5 }}
        >
          ⟲ Load Last
        </button>

        {/* Save */}
        <div className="toolbar__action-group">
          <button
            className="toolbar__btn"
            onClick={() => { setShowSave(!showSave); setShowMenu(false); }}
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

        {/* Hamburger Menu (Projects / Import / Export) */}
        <div className="toolbar__action-group">
          <button
            className="toolbar__btn"
            onClick={() => { setShowMenu(!showMenu); setShowSave(false); }}
          >
            ☰ Menu
          </button>
          {showMenu && (
            <div className="toolbar__dropdown" style={{ width: '240px' }}>
              <div style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                Actions
              </div>
              <button className="toolbar__dropdown-item" onClick={handleExportJS}>
                ↳ Export Patch (.js)
              </button>
              <button className="toolbar__dropdown-item" onClick={handleImportJS}>
                ↱ Import Patch (.js)
              </button>
              
              <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-subtle)' }}></div>
              
              <div style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                Projects Folder
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {savedPatches.length === 0 ? (
                  <p className="toolbar__dropdown-empty">No saved projects</p>
                ) : (
                  savedPatches.map((name) => (
                    <button
                      key={name}
                      className="toolbar__dropdown-item"
                      style={{ paddingLeft: '16px' }}
                      onClick={() => {
                        loadPatch(name);
                        setShowMenu(false);
                      }}
                    >
                      📁 {name}
                    </button>
                  ))
                )}
              </div>
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
