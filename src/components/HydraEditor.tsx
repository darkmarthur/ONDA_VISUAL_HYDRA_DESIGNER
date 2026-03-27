/**
 * HydraEditor — Main editor layout
 * Composes: Toolbar + NodeLibrary + Canvas + Inspector + Preview + CodePanel
 */

'use client';

import React, { useState } from 'react';
import HydraCanvas from './canvas/HydraCanvas';
import NodeLibrary from './panels/NodeLibrary';
import Inspector from './panels/Inspector';
import CodePanel from './panels/CodePanel';
import HydraPreview from './preview/HydraPreview';
import Toolbar from './panels/Toolbar';

export default function HydraEditor() {
  const [showCode, setShowCode] = useState(true);

  return (
    <div className="editor">
      <Toolbar />

      <div className="editor__body">
        {/* Left panel — Node library */}
        <NodeLibrary />

        {/* Center — Canvas */}
        <div className="editor__center">
          <HydraCanvas />
        </div>

        {/* Right panel — Inspector + Preview + Code */}
        <div className="editor__right">
          <div className="editor__preview-container">
            <HydraPreview />
          </div>

          <Inspector />

          <div className="editor__code-toggle">
            <button
              className={`editor__toggle-btn ${showCode ? 'editor__toggle-btn--active' : ''}`}
              onClick={() => setShowCode(!showCode)}
            >
              {showCode ? '▾ Code' : '▸ Code'}
            </button>
          </div>
          {showCode && <CodePanel />}
        </div>
      </div>
    </div>
  );
}
