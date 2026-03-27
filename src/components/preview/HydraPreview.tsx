/**
 * Hydra Preview Component
 * Renders the Hydra output in real-time using hydra-synth.
 */

'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { getHydraRuntime } from '@/hydra/runtime';

export default function HydraPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const generatedCode = useGraphStore((s) => s.generatedCode);
  const setHydraError = useGraphStore((s) => s.setHydraError);

  // Initialize Hydra on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || initializedRef.current) return;

    initializedRef.current = true;
    const runtime = getHydraRuntime();

    runtime.initialize(canvas, (error) => {
      setHydraError(error);
    });

    return () => {
      runtime.destroy();
      initializedRef.current = false;
    };
  }, [setHydraError]);

  // Evaluate code changes
  useEffect(() => {
    if (!initializedRef.current) return;
    const runtime = getHydraRuntime();

    // Debounce evaluation slightly
    const timer = setTimeout(() => {
      runtime.evaluate(generatedCode);
    }, 150);

    return () => clearTimeout(timer);
  }, [generatedCode]);

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
    <div ref={containerRef} className="hydra-preview">
      <canvas
        ref={canvasRef}
        className="hydra-preview__canvas"
      />
      <div className="hydra-preview__overlay">
        <span className="hydra-preview__badge">HYDRA LIVE</span>
      </div>
    </div>
  );
}
