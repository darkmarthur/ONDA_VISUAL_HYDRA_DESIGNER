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

  /**
   * Execute Hydra code string in the synth context.
   */
  evaluate(code: string): void {
    if (!this.hydraInstance) {
      this.reportError('Hydra not initialized');
      return;
    }

    const trimmedCode = code?.trim() || '';
    // Only skip if truly empty or a generic placeholder
    if (!trimmedCode || 
        trimmedCode === '// Add nodes and connect them to generate Hydra code' ||
        trimmedCode === '// Connect nodes to build a visual chain') {
      return;
    }

    // Don't re-evaluate identical code
    if (code === this.lastCode) return;
    this.lastCode = code;

    try {
      const synth = this.hydraInstance.synth || this.hydraInstance;

      // Expose EVERY global function from the synth to the eval scope
      const evalContext: Record<string, any> = {};
      const keys = Object.keys(synth);
      for (const key of keys) {
         if (typeof synth[key] === 'function') {
            evalContext[key] = synth[key].bind(synth);
         } else {
            evalContext[key] = synth[key];
         }
      }

      evalContext.time = synth.time ?? 0;
      evalContext.mouse = synth.mouse || { x: 0, y: 0 };
      
      const contextKeys = Object.keys(evalContext);
      const contextValues = contextKeys.map(k => evalContext[k]);

      // Execute code within the context
      try {
        const fn = new Function(...contextKeys, code);
        fn(...contextValues);
        this.reportError(null);
      } catch (innerErr: any) {
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
