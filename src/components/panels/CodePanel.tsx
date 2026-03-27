/**
 * Code Panel
 * Shows the generated Hydra code with syntax highlighting-like styling.
 */

'use client';

import React, { useState } from 'react';
import { useGraphStore } from '@/store/graphStore';

export default function CodePanel() {
  const generatedCode = useGraphStore((s) => s.generatedCode);
  const updateGraphFromCode = useGraphStore((s) => s.updateGraphFromCode);
  const hydraError = useGraphStore((s) => s.hydraError);
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
        <h3 className="code-panel__title">Generated Code</h3>
        <button
          className="code-panel__copy-btn"
          onClick={copyToClipboard}
          title="Copy to clipboard"
        >
          {copied ? '✓ Copied' : '⎘ Copy'}
        </button>
      </div>
      <textarea
        className="code-panel__code"
        value={generatedCode}
        onChange={(e) => updateGraphFromCode(e.target.value)}
        spellCheck={false}
        style={{ width: '100%', border: 'none', background: 'transparent', color: 'inherit' }}
      />
      {hydraError && (
        <div className="code-panel__error">
          <span className="code-panel__error-icon">⚠</span>
          <span className="code-panel__error-text">{hydraError}</span>
        </div>
      )}
    </div>
  );
}
