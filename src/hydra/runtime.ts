/**
 * Hydra Runtime Manager
 * 
 * Handles the lifecycle of the hydra-synth instance on the client.
 * Uses eval to execute generated Hydra code in the synth's context.
 */

'use client';

export class HydraRuntime {
  private hydraInstance: any = null;
  private canvas: HTMLCanvasElement | null = null;
  private lastCode: string = '';
  private errorCallback: ((error: string | null) => void) | null = null;

  async initialize(
    canvas: HTMLCanvasElement,
    onError?: (error: string | null) => void,
  ): Promise<void> {
    this.canvas = canvas;
    this.errorCallback = onError || null;

    try {
      const HydraModule = await import('hydra-synth');
      const Hydra = HydraModule.default || HydraModule;

      this.hydraInstance = new Hydra({
        canvas,
        detectAudio: false,
        enableStreamCapture: false,
        width: canvas.width,
        height: canvas.height,
        makeGlobal: false,
        numOutputs: 4,
        numSources: 4,
      });

      this.reportError(null);
    } catch (err) {
      console.error('Failed to initialize Hydra:', err);
      this.reportError(`Failed to initialize Hydra: ${err}`);
    }
  }

  evaluate(code: string): void {
    if (!this.hydraInstance) {
      this.reportError('Hydra not initialized');
      return;
    }

    if (!code || code.trim().length < 2) return;

    // Don't re-evaluate identical code
    if (code === this.lastCode) return;
    this.lastCode = code;

    try {
      const synth = this.hydraInstance.synth || this.hydraInstance;

      // Expose EVERY global function from the synth to the eval scope
      const evalContext: Record<string, any> = {};
      
      // Hydra exposes its functions on the synth object
      // We grab everything that looks like a function or a buffer
      const keys = Object.keys(synth);
      for (const key of keys) {
         if (typeof synth[key] === 'function') {
            evalContext[key] = synth[key].bind(synth);
         } else {
            evalContext[key] = synth[key];
         }
      }

      // Also ensure standard 'time' and 'mouse' are available
      evalContext.time = synth.time ?? 0;
      evalContext.mouse = synth.mouse || { x: 0, y: 0 };
      
      // Inject speed correction: if code contains "speed =" we should treat it as setting the synth speed
      // but only if it's top-level. For now, we trust the standard Hydra behavior.

      const contextKeys = Object.keys(evalContext);
      const contextValues = contextKeys.map(k => evalContext[k]);

      // Execute code within the context
      try {
        const fn = new Function(...contextKeys, code);
        fn(...contextValues);
        this.reportError(null);
      } catch (innerErr: any) {
        // This is where syntax errors from the user's manual typing usually hit
        this.reportError(innerErr.message);
      }
    } catch (err: any) {
      this.reportError(err.message || String(err));
    }
  }

  hush(): void {
    if (!this.hydraInstance) return;
    try {
      const synth = this.hydraInstance.synth || this.hydraInstance;
      if (typeof synth.hush === 'function') synth.hush();
    } catch { /* ignore */ }
  }

  resize(width: number, height: number): void {
    if (this.canvas && this.hydraInstance) {
      this.hydraInstance.setResolution(width, height);
    }
  }

  destroy(): void {
    if (this.hydraInstance) {
      this.hush();
      // Hydra-synth doesn't have a formal destroy, but we can stop its loop if possible
      // Usually clearing the context is enough for GC
      this.hydraInstance = null;
    }
  }

  private reportError(msg: string | null): void {
    if (this.errorCallback) this.errorCallback(msg);
  }
}

// Singleton instance for the app
let runtimeInstance: HydraRuntime | null = null;

export function getHydraRuntime(): HydraRuntime {
  if (typeof window === 'undefined') return {} as any;
  if (!runtimeInstance) {
    runtimeInstance = new HydraRuntime();
  }
  return runtimeInstance;
}
