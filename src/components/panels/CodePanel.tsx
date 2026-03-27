/**
 * Code Panel
 * Shows the generated Hydra code with syntax highlighting-like styling.
 */

'use client';

import React, { useState } from 'react';
import Editor from 'react-simple-code-editor';
// @ts-ignore
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism-tomorrow.css'; // Dark theme for code

import { useGraphStore } from '@/store/graphStore';
import { Terminal, Copy, Check, Trash2 } from 'lucide-react';

export default function CodePanel() {
  const generatedCode = useGraphStore((s) => s.generatedCode);
  const updateGraphFromCode = useGraphStore((s) => s.updateGraphFromCode);
  const hydraLogs = useGraphStore((s) => s.hydraLogs);
  const clearHydraLogs = useGraphStore((s) => s.clearHydraLogs);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = generatedCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="code-panel">
      <div className="code-panel__header">
        <div className="code-panel__title-group">
          <Terminal size={14} className="code-panel__icon" />
          <h3 className="code-panel__title">Generated Logic</h3>
        </div>
        <button
          className="code-panel__copy-btn"
          onClick={copyToClipboard}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div className="code-panel__editor-container">
        <Editor
          value={generatedCode}
          onValueChange={(code) => updateGraphFromCode(code)}
          highlight={(code) => highlight(code, languages.js)}
          padding={20}
          className="code-panel__editor"
          spellCheck={false}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            minHeight: '100%',
          }}
        />
      </div>

      <div className="code-panel__footer">
        <div className="code-panel__footer-header">
          <h4 className="code-panel__footer-title">Execution Logs</h4>
          <button 
            className="code-panel__clear-btn" 
            onClick={clearHydraLogs}
            title="Clear Logs"
          >
            <Trash2 size={12} />
          </button>
        </div>
        <div className="code-panel__logs">
          {hydraLogs.length === 0 ? (
            <div className="code-panel__log-empty">No activity logs</div>
          ) : (
            hydraLogs.map((log, i) => (
              <div key={i} className={`code-panel__log-item code-panel__log-item--${log.type}`}>
                <span className="code-panel__log-time">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="code-panel__log-msg">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
