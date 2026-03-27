/**
 * HydraEditor — Main editor layout
 * Composes: Toolbar + NodeLibrary + Canvas + Inspector + Preview + CodePanel
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useGraphStore } from '@/store/graphStore';
import HydraCanvas from './canvas/HydraCanvas';
import NodeLibrary from './panels/NodeLibrary';
import Inspector from './panels/Inspector';
import CodePanel from './panels/CodePanel';
import HydraPreview from './preview/HydraPreview';
import Toolbar from './panels/Toolbar';
import TabMenu from './panels/TabMenu';
import Footer from './panels/Footer';
import MobileWarning from './panels/MobileWarning';

export default function HydraEditor() {
  const [tabMenuConfig, setTabMenuConfig] = useState<{ open: boolean; insertEdgeId?: string; position?: { x: number; y: number } }>({ open: false });
  const editorMode = useGraphStore((s) => s.editorMode);

  useEffect(() => {
    const undo = useGraphStore.temporal.getState().undo;
    const redo = useGraphStore.temporal.getState().redo;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Tab Menu toggle
      if (e.key === 'Tab') {
        // Only trigger if we aren't inside an input element that naturally uses Tab
        // (unless it's the tab menu search input itself, handled inside TabMenu component)
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
          return;
        }

        e.preventDefault();
        window.dispatchEvent(new CustomEvent('request-tab-menu'));
      }
    };

    const handleCustomMenu = (e: any) => {
      setTabMenuConfig({ 
        open: true, 
        insertEdgeId: e.detail?.insertEdgeId,
        position: e.detail?.position
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-tab-menu', handleCustomMenu);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-tab-menu', handleCustomMenu);
    };
  }, []);

  return (
    <div className="editor">
      <Toolbar />

      <div className="editor__body">
        {/* Left panel — Node library */}
        {editorMode === 'visual' && <NodeLibrary />}

        {/* Center — Canvas or Code */}
        <div className="editor__center">
          <div style={{ display: editorMode === 'visual' ? 'flex' : 'none', flex: 1, width: '100%', height: '100%' }}>
            <HydraCanvas />
          </div>
          {editorMode === 'code' && (
            <CodePanel />
          )}
        </div>

        {/* Right panel — Inspector + Preview + Code */}
        <div className="editor__right">
          <div className="editor__preview-container">
            <HydraPreview />
          </div>

          {editorMode === 'visual' && <Inspector />}
        </div>
      </div>

      <Footer />

      {tabMenuConfig.open && (
        <TabMenu 
          onClose={() => setTabMenuConfig({ open: false })} 
          insertEdgeId={tabMenuConfig.insertEdgeId}
          spawnPosition={tabMenuConfig.position}
        />
      )}

      <MobileWarning />
    </div>
  );
}
