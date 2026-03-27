'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { HydraRuntime } from '@/hydra/runtime';
import { Maximize2, Minimize2 } from 'lucide-react';

function ExternalHydraLive() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    let runtime: HydraRuntime | null = null;
    let isMounted = true;

    const initHydra = async () => {
      if (!canvasRef.current) return;
      runtime = new HydraRuntime();
      
      await runtime.initialize(canvasRef.current, (err) => {
        if (isMounted) setError(err);
      });

      // Execute initial code
      const initialCode = localStorage.getItem('hydra-live-code') || 'osc(60, 0.1, 0).out(o0)';
      runtime.evaluate(initialCode);

      // Listen for updates
      window.addEventListener('storage', handleStorageEvent);
      
      // Polling just in case
      const interval = setInterval(() => {
        if (runtime) {
          const currentCode = localStorage.getItem('hydra-live-code');
          if (currentCode) {
            runtime.evaluate(currentCode);
          }
        }
      }, 500);

      const resizeListener = () => {
        if (runtime) runtime.resize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', resizeListener);

      return () => {
        clearInterval(interval);
        window.removeEventListener('storage', handleStorageEvent);
        window.removeEventListener('resize', resizeListener);
      };
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'hydra-live-code' && runtime) {
        runtime.evaluate(e.newValue || '');
      }
    };

    // Fullscreen change listener
    const onFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);

    initHydra();

    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageEvent);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (runtime) {
        runtime.destroy();
      }
    };
  }, []);

  // Hide controls after inactivity
  useEffect(() => {
    if (!showControls) return;
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [showControls]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
  };

  return (
    <div 
        ref={containerRef}
        onMouseMove={() => setShowControls(true)}
        style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />

      {/* Floating Controls Overlay */}
      <div style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.5s ease',
          zIndex: 100
      }}>
          <button 
            onClick={toggleFullscreen}
            style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                padding: '12px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
      </div>

      {error && (
        <div style={{ position: 'absolute', bottom: 10, left: 10, color: '#ff4444', fontFamily: 'monospace', fontSize: 12, background: 'rgba(0,0,0,0.8)', padding: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
}

const DynamicExternalLive = dynamic(() => Promise.resolve(ExternalHydraLive), { ssr: false });

export default function LivePage() {
  return <DynamicExternalLive />;
}
