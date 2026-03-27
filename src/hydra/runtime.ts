/**
 * Hydra Runtime Manager
 * 
 * Handles the lifecycle of the hydra-synth instance on the client.
 * Uses eval to execute generated Hydra code in the synth's context.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export class HydraRuntime {
  private hydraInstance: any = null;
  private canvas: HTMLCanvasElement | null = null;
  private lastCode: string = '';
  private errorCallback: ((error: string | null) => void) | null = null;

  /**
   * Initialize hydra-synth on a canvas element.
   * Must be called from client-side only.
   */
  async initialize(
    canvas: HTMLCanvasElement,
    onError?: (error: string | null) => void,
  ): Promise<void> {
    this.canvas = canvas;
    this.errorCallback = onError || null;

    try {
      // Dynamic import to avoid SSR issues
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

    if (!code || code.startsWith('//')) {
      return;
    }

    // Don't re-evaluate identical code
    if (code === this.lastCode) return;
    this.lastCode = code;

    try {
      // Get the synth object which has all Hydra functions
      const synth = this.hydraInstance.synth || this.hydraInstance;

      // Build an evaluation context with all Hydra globals
      const evalContext: Record<string, any> = {};

      // Copy source functions
      const srcFunctions = [
        'osc', 'noise', 'voronoi', 'shape', 'gradient',
        'solid', 'prev', 'src',
      ];
      for (const fn of srcFunctions) {
        if (typeof synth[fn] === 'function') {
          evalContext[fn] = synth[fn].bind(synth);
        }
      }

      // Copy output buffers
      for (let i = 0; i < 4; i++) {
        const key = `o${i}`;
        if (synth[key]) {
          evalContext[key] = synth[key];
        }
      }

      // Copy source buffers
      for (let i = 0; i < 4; i++) {
        const key = `s${i}`;
        if (synth[key]) {
          evalContext[key] = synth[key];
        }
      }

      // Copy utility functions
      const utilFns = ['render', 'update', 'setResolution', 'hush', 'speed', 'bpm', 'setFunction'];
      for (const fn of utilFns) {
        if (typeof synth[fn] === 'function') {
          evalContext[fn] = synth[fn].bind(synth);
        } else if (synth[fn] !== undefined) {
          evalContext[fn] = synth[fn];
        }
      }

      // Also expose time, mouse etc
      if (synth.time !== undefined) evalContext.time = synth.time;
      if (synth.mouse) evalContext.mouse = synth.mouse;

      // Build function args and execute
      const keys = Object.keys(evalContext);
      const values = keys.map((k) => evalContext[k]);

      // eslint-disable-next-line no-new-func
      const fn = new Function(...keys, code);
      fn(...values);

      this.reportError(null);
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      console.warn('Hydra eval error:', errorMsg);
      this.reportError(errorMsg);
    }
  }

  /**
   * Reset the Hydra output (call hush).
   */
  hush(): void {
    if (!this.hydraInstance) return;
    try {
      const synth = this.hydraInstance.synth || this.hydraInstance;
      if (typeof synth.hush === 'function') {
        synth.hush();
      }
    } catch {
      // ignore
    }
  }

  /**
   * Resize the canvas.
   */
  resize(width: number, height: number): void {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    if (this.hydraInstance) {
      try {
        const synth = this.hydraInstance.synth || this.hydraInstance;
        if (typeof synth.setResolution === 'function') {
          synth.setResolution(width, height);
        }
      } catch {
        // ignore
      }
    }
  }

  /**
   * Clean up the Hydra instance.
   */
  destroy(): void {
    this.hush();
    this.hydraInstance = null;
    this.canvas = null;
    this.lastCode = '';
  }

  private reportError(error: string | null): void {
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }
}

// Singleton instance
let runtimeInstance: HydraRuntime | null = null;

export function getHydraRuntime(): HydraRuntime {
  if (!runtimeInstance) {
    runtimeInstance = new HydraRuntime();
  }
  return runtimeInstance;
}
