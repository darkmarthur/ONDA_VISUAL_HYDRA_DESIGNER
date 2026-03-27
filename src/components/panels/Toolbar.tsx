'use client';

import React, { useState, useRef } from 'react';
import { useGraphStore } from '@/store/graphStore';
import {
  Monitor,
  MonitorOff,
  Code,
  LayoutTemplate,
  Save,
  FolderOpen,
  RotateCcw,
  Trash2,
  ChevronDown,
  Download,
  Upload,
  Hexagon,
  Globe,
  Plus
} from 'lucide-react';

export default function Toolbar() {
  const clearGraph=useGraphStore((s) => s.clearGraph);
  const savePatch=useGraphStore((s) => s.savePatch);
  const loadPatch=useGraphStore((s) => s.loadPatch);
  const getSavedPatches=useGraphStore((s) => s.getSavedPatches);
  const serializeGraph=useGraphStore((s) => s.serializeGraph);
  const deserializeGraph=useGraphStore((s) => s.deserializeGraph);
  const updateGraphFromCode=useGraphStore((s) => s.updateGraphFromCode);
  const editorMode=useGraphStore((s) => s.editorMode);
  const setEditorMode=useGraphStore((s) => s.setEditorMode);
  const autosaveEnabled=useGraphStore((s) => s.autosaveEnabled);
  const setAutosaveEnabled=useGraphStore((s) => s.setAutosaveEnabled);

  const [showSave, setShowSave]=useState(false);
  const [showMenu, setShowMenu]=useState(false);
  const [patchName, setPatchName]=useState('');

  const savedPatches=getSavedPatches();
  const lastPatch=savedPatches.length>0? savedPatches[savedPatches.length-1]:null;
  const liveWindowRef=useRef<Window|null>(null);

  const handleSave=() => {
    if (patchName.trim()) {
      savePatch(patchName.trim());
      setPatchName('');
      setShowSave(false);
    }
  };

  const handleExportJS=() => {
    const json=serializeGraph();
    const code=useGraphStore.getState().generatedCode;
    const fileContent=`// ONDA VISUAL HYDRA DESIGNER PATCH\n// ==BEGIN_GRAPH==\n// ${json}\n// ==END_GRAPH==\n\n${code}`;

    const blob=new Blob([fileContent], { type: 'application/javascript' });
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`hydra-patch-${Date.now()}.js`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  const handleImportJS=() => {
    const input=document.createElement('input');
    input.type='file';
    input.accept='.js';
    input.onchange=(e) => {
      const file=(e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader=new FileReader();
      reader.onload=(event) => {
        const text=event.target?.result as string;
        const graphMatch=text.match(/\/\/ ==BEGIN_GRAPH==\s*\/\/\s*([\s\S]*?)\s*\/\/ ==END_GRAPH==/);
        if (graphMatch&&graphMatch[1]) {
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

  const launchLiveWindow=() => {
    if (liveWindowRef.current&&!liveWindowRef.current.closed) {
      liveWindowRef.current.focus();
    } else {
      liveWindowRef.current=window.open('/live', 'HydraLive', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
    }
  };

  const closeLiveWindow=() => {
    if (liveWindowRef.current&&!liveWindowRef.current.closed) {
      liveWindowRef.current.close();
      liveWindowRef.current=null;
    }
  };

  return (
    <header className="toolbar">
      <div className="toolbar__brand">
        <div className="toolbar__brand-group">
          <h1 className="toolbar__title">HYDRA｜DESIGNER</h1>
          <span className="toolbar__subtitle">BETA V0.01</span>
        </div>
      </div>

      <div className="toolbar__actions">
        {/* Group 1: Workspace Mode Switcher - Refactored to Segmented Control */}
        <div className="toolbar__mode-switch">
          <button
            className={`toolbar__mode-btn ${editorMode === 'visual' ? 'toolbar__mode-btn--active' : ''}`}
            onClick={() => setEditorMode('visual')}
          >
            <LayoutTemplate size={14} className="toolbar__mode-icon" />
            Visual
          </button>
          <button
            className={`toolbar__mode-btn ${editorMode === 'code' ? 'toolbar__mode-btn--active' : ''}`}
            onClick={() => setEditorMode('code')}
          >
            <Code size={14} className="toolbar__mode-icon" />
            Code
          </button>
        </div>

        <div className="toolbar__divider" />

        {/* Group 2: View / Output Control */}
        <div className="toolbar__group">
          <button
            className="toolbar__btn"
            onClick={launchLiveWindow}
            title="Open dedicated performance window (Visuals only)"
          >
            <Monitor size={14} className="toolbar__icon" />
            Performance window
          </button>
        </div>

        <div className="toolbar__divider" />

        {/* Group 3: Project Management */}
        <div className="toolbar__group">
          <button
            className="toolbar__btn"
            onClick={() => lastPatch&&loadPatch(lastPatch)}
            disabled={!lastPatch}
            title="Restore the last state of the most recent project"
          >
            <RotateCcw size={14} className="toolbar__icon" />
            Load Last
          </button>

          <div className="toolbar__action-group">
            <button
              className="toolbar__btn"
              onClick={() => { setShowSave(!showSave); setShowMenu(false); }}
              title="Save current patch state locally"
            >
              <Save size={14} className="toolbar__icon" />
              Save
            </button>
            {showSave&&(
              <div className="toolbar__dropdown">
                <input
                  type="text"
                  placeholder="Patch name..."
                  value={patchName}
                  onChange={(e) => setPatchName(e.target.value)}
                  onKeyDown={(e) => e.key==='Enter'&&handleSave()}
                  className="toolbar__input"
                  autoFocus
                />
                <button className="toolbar__dropdown-btn" onClick={handleSave}>
                  Save Patch
                </button>
              </div>
            )}
          </div>

          <div className="toolbar__action-group">
            <button
              className="toolbar__btn"
              onClick={() => { setShowMenu(!showMenu); setShowSave(false); }}
              title="Browse projects and exports"
            >
              <FolderOpen size={14} className="toolbar__icon" />
              Projects
              <ChevronDown size={12} style={{ marginLeft: '4px', opacity: 0.5 }} />
            </button>
            {showMenu&&(
              <div className="toolbar__dropdown" style={{ width: '240px' }}>
                <div style={{ padding: '6px 8px', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Actions
                </div>
                <button className="toolbar__dropdown-item" onClick={handleExportJS}>
                  <Download size={12} style={{ marginRight: '8px' }} />
                  Export .js
                </button>
                <button className="toolbar__dropdown-item" onClick={handleImportJS}>
                  <Upload size={12} style={{ marginRight: '8px' }} />
                  Import .js
                </button>

                <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-subtle)' }}></div>

                <div style={{ padding: '6px 8px', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Your Projects
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {savedPatches.length===0? (
                    <p className="toolbar__dropdown-empty">No saved projects</p>
                  ):(
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
                        <Globe size={12} style={{ marginRight: '8px', opacity: 0.5 }} />
                        {name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="toolbar__divider" />

        {/* Group 5: Settings / Safety */}
        <div className="toolbar__group">
          <div className="toolbar__setting">
             <span className="toolbar__setting-label">Autosave</span>
             <button
               className={`toolbar__toggle ${autosaveEnabled ? 'toolbar__toggle--active' : ''}`}
               onClick={() => setAutosaveEnabled(!autosaveEnabled)}
               title={autosaveEnabled ? "Autosave is ON" : "Autosave is OFF"}
             >
               <div className="toolbar__toggle-thumb" />
             </button>
          </div>

          <button
            className="toolbar__btn toolbar__btn--danger"
            onClick={() => {
              if (window.confirm('Clear current workspace? This will remove all nodes and links.')) {
                clearGraph();
              }
            }}
          >
            <Trash2 size={14} className="toolbar__icon" />
            Clear
          </button>
        </div>
      </div>
    </header>
  );
}
