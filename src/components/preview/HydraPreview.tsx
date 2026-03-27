/**
 * Hydra Preview Component
 * Renders the Hydra output in real-time using hydra-synth.
 */

'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Monitor, MonitorOff } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { getHydraRuntime } from '@/hydra/runtime';

export default function HydraPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const generatedCode = useGraphStore((s) => s.generatedCode);
  const showPreview = useGraphStore((s) => s.showPreview);
  const setShowPreview = useGraphStore((s) => s.setShowPreview);
  const addHydraLog = useGraphStore((s) => s.addHydraLog);
  const clearHydraLogs = useGraphStore((s) => s.clearHydraLogs);

  // Initialize Hydra on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isInitialized || !showPreview) return;

    const runtime = getHydraRuntime();

    runtime.initialize(canvas, (error) => {
      if (error) {
        addHydraLog('error', error);
      } else {
        setIsInitialized(true);
      }
    }).then(() => {
        // Double check if it initialized correctly
        setIsInitialized(true);
    });

    return () => {
      runtime.destroy();
      setIsInitialized(false);
    };
  }, [addHydraLog, showPreview]);

  // Evaluate code changes
  useEffect(() => {
    if (!isInitialized) return;
    const runtime = getHydraRuntime();

    // Debounce evaluation slightly
    const timer = setTimeout(() => {
      if (showPreview && generatedCode) {
        runtime.evaluate(generatedCode);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [generatedCode, isInitialized, showPreview]);

  // Handle resize
  const handleResize = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const { width, height } = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const runtime = getHydraRuntime();
    runtime.resize(width * dpr, height * dpr);
  }, []);

  useEffect(() => {
    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [handleResize]);

  return (
    <div ref={containerRef} className={`hydra-preview ${!showPreview ? 'hydra-preview--disabled' : ''}`}>
      {showPreview ? (
        <canvas
          ref={canvasRef}
          className="hydra-preview__canvas"
        />
      ) : (
        <div className="hydra-preview__disabled-msg">
          <span>Preview Disabled</span>
          <small>Click the eye icon to enable</small>
        </div>
      )}
      <div className="hydra-preview__overlay">
        <button 
          className="hydra-preview__toggle"
          onClick={() => setShowPreview(!showPreview)}
          title={showPreview ? 'Disable Preview (Optimize)' : 'Enable Preview'}
        >
          {showPreview ? <Monitor size={14} /> : <MonitorOff size={14} />}
        </button>
      </div>
    </div>
  );
}
