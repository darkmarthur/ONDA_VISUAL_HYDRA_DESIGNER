/**
 * Hydra Function Registry
 * 
 * Complete registry of all Hydra functions with their exact signatures,
 * default values, and types — sourced from hydra-synth/src/glsl/glsl-functions.js
 * 
 * Every entry here corresponds 1:1 to a real Hydra function.
 * No invented functions, no extra parameters.
 */

import { HydraFunctionDef } from './types';

export const hydraFunctionRegistry: HydraFunctionDef[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  //  SOURCES (type: 'src')
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'noise',
    type: 'src',
    category: 'source',
    description: 'Generate Perlin noise',
    params: [
      { name: 'scale', type: 'float', default: 10, min: 0, max: 100, step: 0.1 },
      { name: 'offset', type: 'float', default: 0.1, min: -2, max: 2, step: 0.01 },
    ],
  },
  {
    name: 'voronoi',
    type: 'src',
    category: 'source',
    description: 'Generate Voronoi diagram',
    params: [
      { name: 'scale', type: 'float', default: 5, min: 0, max: 100, step: 0.1 },
      { name: 'speed', type: 'float', default: 0.3, min: -2, max: 2, step: 0.01 },
      { name: 'blending', type: 'float', default: 0.3, min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'osc',
    type: 'src',
    category: 'source',
    description: 'Visual oscillator',
    params: [
      { name: 'frequency', type: 'float', default: 60, min: 0, max: 200, step: 0.1 },
      { name: 'sync', type: 'float', default: 0.1, min: -2, max: 2, step: 0.01 },
      { name: 'offset', type: 'float', default: 0, min: -2, max: 2, step: 0.01 },
    ],
  },
  {
    name: 'shape',
    type: 'src',
    category: 'source',
    description: 'Geometric shape generator',
    params: [
      { name: 'sides', type: 'float', default: 3, min: 1, max: 20, step: 0.1 },
      { name: 'radius', type: 'float', default: 0.3, min: 0, max: 1, step: 0.01 },
      { name: 'smoothing', type: 'float', default: 0.01, min: 0, max: 1, step: 0.001 },
    ],
  },
  {
    name: 'gradient',
    type: 'src',
    category: 'source',
    description: 'Color gradient',
    params: [
      { name: 'speed', type: 'float', default: 0, min: -2, max: 2, step: 0.01 },
    ],
  },
  {
    name: 'solid',
    type: 'src',
    category: 'source',
    description: 'Solid color',
    params: [
      { name: 'r', type: 'float', default: 0, min: 0, max: 1, step: 0.01 },
      { name: 'g', type: 'float', default: 0, min: 0, max: 1, step: 0.01 },
      { name: 'b', type: 'float', default: 0, min: 0, max: 1, step: 0.01 },
      { name: 'a', type: 'float', default: 1, min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'prev',
    type: 'src',
    category: 'source',
    description: 'Previous frame feedback buffer',
    params: [],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  GEOMETRY / COORD transforms (type: 'coord')
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'rotate',
    type: 'coord',
    category: 'geometry',
    description: 'Rotate coordinates',
    params: [
      { name: 'angle', type: 'float', default: 10, min: -6.28, max: 6.28, step: 0.01 },
      { name: 'speed', type: 'float', default: 0, min: -2, max: 2, step: 0.01 },
    ],
  },
  {
    name: 'scale',
    type: 'coord',
    category: 'geometry',
    description: 'Scale coordinates',
    params: [
      { name: 'amount', type: 'float', default: 1.5, min: 0, max: 10, step: 0.01 },
      { name: 'xMult', type: 'float', default: 1, min: 0, max: 10, step: 0.01 },
      { name: 'yMult', type: 'float', default: 1, min: 0, max: 10, step: 0.01 },
      { name: 'offsetX', type: 'float', default: 0.5, min: 0, max: 1, step: 0.01 },
      { name: 'offsetY', type: 'float', default: 0.5, min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'pixelate',
    type: 'coord',
    category: 'geometry',
    description: 'Pixelate image',
    params: [
      { name: 'pixelX', type: 'float', default: 20, min: 1, max: 200, step: 1 },
      { name: 'pixelY', type: 'float', default: 20, min: 1, max: 200, step: 1 },
    ],
  },
  {
    name: 'repeat',
    type: 'coord',
    category: 'geometry',
    description: 'Tile / repeat',
    params: [
      { name: 'repeatX', type: 'float', default: 3, min: 1, max: 20, step: 0.1 },
      { name: 'repeatY', type: 'float', default: 3, min: 1, max: 20, step: 0.1 },
      { name: 'offsetX', type: 'float', default: 0, min: -1, max: 1, step: 0.01 },
      { name: 'offsetY', type: 'float', default: 0, min: -1, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'repeatX',
    type: 'coord',
    category: 'geometry',
    description: 'Tile horizontally',
    params: [
      { name: 'reps', type: 'float', default: 3, min: 1, max: 20, step: 0.1 },
      { name: 'offset', type: 'float', default: 0, min: -1, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'repeatY',
    type: 'coord',
    category: 'geometry',
    description: 'Tile vertically',
    params: [
      { name: 'reps', type: 'float', default: 3, min: 1, max: 20, step: 0.1 },
      { name: 'offset', type: 'float', default: 0, min: -1, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'kaleid',
    type: 'coord',
    category: 'geometry',
    description: 'Kaleidoscope effect',
    params: [
      { name: 'nSides', type: 'float', default: 4, min: 1, max: 20, step: 0.1 },
    ],
  },
  {
    name: 'scroll',
    type: 'coord',
    category: 'geometry',
    description: 'Scroll coordinates',
    params: [
      { name: 'scrollX', type: 'float', default: 0.5, min: -1, max: 1, step: 0.01 },
      { name: 'scrollY', type: 'float', default: 0.5, min: -1, max: 1, step: 0.01 },
      { name: 'speedX', type: 'float', default: 0, min: -2, max: 2, step: 0.01 },
      { name: 'speedY', type: 'float', default: 0, min: -2, max: 2, step: 0.01 },
    ],
  },
  {
    name: 'scrollX',
    type: 'coord',
    category: 'geometry',
    description: 'Horizontal scroll',
    params: [
      { name: 'scrollX', type: 'float', default: 0.5, min: -1, max: 1, step: 0.01 },
      { name: 'speed', type: 'float', default: 0, min: -2, max: 2, step: 0.01 },
    ],
  },
  {
    name: 'scrollY',
    type: 'coord',
    category: 'geometry',
    description: 'Vertical scroll',
    params: [
      { name: 'scrollY', type: 'float', default: 0.5, min: -1, max: 1, step: 0.01 },
      { name: 'speed', type: 'float', default: 0, min: -2, max: 2, step: 0.01 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  COLOR transforms (type: 'color')
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'posterize',
    type: 'color',
    category: 'color',
    description: 'Reduce color palette',
    params: [
      { name: 'bins', type: 'float', default: 3, min: 1, max: 20, step: 1 },
      { name: 'gamma', type: 'float', default: 0.6, min: 0.01, max: 3, step: 0.01 },
    ],
  },
  {
    name: 'shift',
    type: 'color',
    category: 'color',
    description: 'Shift RGBA channels',
    params: [
      { name: 'r', type: 'float', default: 0.5, min: -1, max: 1, step: 0.01 },
      { name: 'g', type: 'float', default: 0, min: -1, max: 1, step: 0.01 },
      { name: 'b', type: 'float', default: 0, min: -1, max: 1, step: 0.01 },
      { name: 'a', type: 'float', default: 0, min: -1, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'invert',
    type: 'color',
    category: 'color',
    description: 'Invert colors',
    params: [
      { name: 'amount', type: 'float', default: 1, min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'contrast',
    type: 'color',
    category: 'color',
    description: 'Adjust contrast',
    params: [
      { name: 'amount', type: 'float', default: 1.6, min: 0, max: 5, step: 0.01 },
    ],
  },
  {
    name: 'brightness',
    type: 'color',
    category: 'color',
    description: 'Adjust brightness',
    params: [
      { name: 'amount', type: 'float', default: 0.4, min: -1, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'luma',
    type: 'color',
    category: 'color',
    description: 'Luminance threshold (alpha mask)',
    params: [
      { name: 'threshold', type: 'float', default: 0.5, min: 0, max: 1, step: 0.01 },
      { name: 'tolerance', type: 'float', default: 0.1, min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'thresh',
    type: 'color',
    category: 'color',
    description: 'Hard threshold',
    params: [
      { name: 'threshold', type: 'float', default: 0.5, min: 0, max: 1, step: 0.01 },
      { name: 'tolerance', type: 'float', default: 0.04, min: 0, max: 1, step: 0.001 },
    ],
  },
  {
    name: 'color',
    type: 'color',
    category: 'color',
    description: 'Multiply / mix color channels',
    params: [
      { name: 'r', type: 'float', default: 1, min: -2, max: 2, step: 0.01 },
      { name: 'g', type: 'float', default: 1, min: -2, max: 2, step: 0.01 },
      { name: 'b', type: 'float', default: 1, min: -2, max: 2, step: 0.01 },
      { name: 'a', type: 'float', default: 1, min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'saturate',
    type: 'color',
    category: 'color',
    description: 'Adjust saturation',
    params: [
      { name: 'amount', type: 'float', default: 2, min: 0, max: 5, step: 0.01 },
    ],
  },
  {
    name: 'hue',
    type: 'color',
    category: 'color',
    description: 'Shift hue',
    params: [
      { name: 'hue', type: 'float', default: 0.4, min: -1, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'colorama',
    type: 'color',
    category: 'color',
    description: 'HSV color shift',
    params: [
      { name: 'amount', type: 'float', default: 0.005, min: -1, max: 1, step: 0.001 },
    ],
  },
  {
    name: 'sum',
    type: 'color',
    category: 'color',
    description: 'Sum color channels',
    params: [
      { name: 'scale', type: 'vec4', default: 1, min: 0, max: 2, step: 0.01 },
    ],
  },
  {
    name: 'r',
    type: 'color',
    category: 'color',
    description: 'Extract red channel',
    params: [
      { name: 'scale', type: 'float', default: 1, min: 0, max: 2, step: 0.01 },
      { name: 'offset', type: 'float', default: 0, min: -1, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'g',
    type: 'color',
    category: 'color',
    description: 'Extract green channel',
    params: [
      { name: 'scale', type: 'float', default: 1, min: 0, max: 2, step: 0.01 },
      { name: 'offset', type: 'float', default: 0, min: -1, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'b',
    type: 'color',
    category: 'color',
    description: 'Extract blue channel',
    params: [
      { name: 'scale', type: 'float', default: 1, min: 0, max: 2, step: 0.01 },
      { name: 'offset', type: 'float', default: 0, min: -1, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'a',
    type: 'color',
    category: 'color',
    description: 'Extract alpha channel',
    params: [
      { name: 'scale', type: 'float', default: 1, min: 0, max: 2, step: 0.01 },
      { name: 'offset', type: 'float', default: 0, min: -1, max: 1, step: 0.01 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  BLEND / COMBINE (type: 'combine')
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'add',
    type: 'combine',
    category: 'blend',
    description: 'Additive blend',
    params: [
      { name: 'amount', type: 'float', default: 1, min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'sub',
    type: 'combine',
    category: 'blend',
    description: 'Subtractive blend',
    params: [
      { name: 'amount', type: 'float', default: 1, min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'layer',
    type: 'combine',
    category: 'blend',
    description: 'Layer with alpha',
    params: [],
  },
  {
    name: 'blend',
    type: 'combine',
    category: 'blend',
    description: 'Linear blend',
    params: [
      { name: 'amount', type: 'float', default: 0.5, min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'mult',
    type: 'combine',
    category: 'blend',
    description: 'Multiply blend',
    params: [
      { name: 'amount', type: 'float', default: 1, min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'diff',
    type: 'combine',
    category: 'blend',
    description: 'Difference blend',
    params: [],
  },
  {
    name: 'mask',
    type: 'combine',
    category: 'blend',
    description: 'Luminance mask',
    params: [],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  MODULATE / COMBINE-COORD (type: 'combineCoord')
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'modulate',
    type: 'combineCoord',
    category: 'modulate',
    description: 'Coordinate modulation',
    params: [
      { name: 'amount', type: 'float', default: 0.1, min: -2, max: 2, step: 0.01 },
    ],
  },
  {
    name: 'modulateRepeat',
    type: 'combineCoord',
    category: 'modulate',
    description: 'Modulate with repeat',
    params: [
      { name: 'repeatX', type: 'float', default: 3, min: 1, max: 20, step: 0.1 },
      { name: 'repeatY', type: 'float', default: 3, min: 1, max: 20, step: 0.1 },
      { name: 'offsetX', type: 'float', default: 0.5, min: -1, max: 1, step: 0.01 },
      { name: 'offsetY', type: 'float', default: 0.5, min: -1, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'modulateRepeatX',
    type: 'combineCoord',
    category: 'modulate',
    description: 'Modulate with horizontal repeat',
    params: [
      { name: 'reps', type: 'float', default: 3, min: 1, max: 20, step: 0.1 },
      { name: 'offset', type: 'float', default: 0.5, min: -1, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'modulateRepeatY',
    type: 'combineCoord',
    category: 'modulate',
    description: 'Modulate with vertical repeat',
    params: [
      { name: 'reps', type: 'float', default: 3, min: 1, max: 20, step: 0.1 },
      { name: 'offset', type: 'float', default: 0.5, min: -1, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'modulateKaleid',
    type: 'combineCoord',
    category: 'modulate',
    description: 'Modulated kaleidoscope',
    params: [
      { name: 'nSides', type: 'float', default: 4, min: 1, max: 20, step: 0.1 },
    ],
  },
  {
    name: 'modulateScrollX',
    type: 'combineCoord',
    category: 'modulate',
    description: 'Modulated horizontal scroll',
    params: [
      { name: 'scrollX', type: 'float', default: 0.5, min: -1, max: 1, step: 0.01 },
      { name: 'speed', type: 'float', default: 0, min: -2, max: 2, step: 0.01 },
    ],
  },
  {
    name: 'modulateScrollY',
    type: 'combineCoord',
    category: 'modulate',
    description: 'Modulated vertical scroll',
    params: [
      { name: 'scrollY', type: 'float', default: 0.5, min: -1, max: 1, step: 0.01 },
      { name: 'speed', type: 'float', default: 0, min: -2, max: 2, step: 0.01 },
    ],
  },
  {
    name: 'modulateScale',
    type: 'combineCoord',
    category: 'modulate',
    description: 'Modulated scale',
    params: [
      { name: 'multiple', type: 'float', default: 1, min: 0, max: 10, step: 0.01 },
      { name: 'offset', type: 'float', default: 1, min: -2, max: 2, step: 0.01 },
    ],
  },
  {
    name: 'modulatePixelate',
    type: 'combineCoord',
    category: 'modulate',
    description: 'Modulated pixelate',
    params: [
      { name: 'multiple', type: 'float', default: 10, min: 1, max: 100, step: 1 },
      { name: 'offset', type: 'float', default: 3, min: 0, max: 50, step: 0.1 },
    ],
  },
  {
    name: 'modulateRotate',
    type: 'combineCoord',
    category: 'modulate',
    description: 'Modulated rotation',
    params: [
      { name: 'multiple', type: 'float', default: 1, min: 0, max: 10, step: 0.01 },
      { name: 'offset', type: 'float', default: 0, min: -6.28, max: 6.28, step: 0.01 },
    ],
  },
  {
    name: 'modulateHue',
    type: 'combineCoord',
    category: 'modulate',
    description: 'Modulated hue shift',
    params: [
      { name: 'amount', type: 'float', default: 1, min: -2, max: 2, step: 0.01 },
    ],
  },
];

// ─── Lookup helpers ──────────────────────────────────────────────────────────

const registryMap = new Map<string, HydraFunctionDef>();
hydraFunctionRegistry.forEach((fn) => registryMap.set(fn.name, fn));

export function getHydraFunction(name: string): HydraFunctionDef | undefined {
  return registryMap.get(name);
}

export function getHydraFunctionsByCategory(category: string): HydraFunctionDef[] {
  return hydraFunctionRegistry.filter((fn) => fn.category === category);
}

export function getHydraFunctionsByType(type: string): HydraFunctionDef[] {
  return hydraFunctionRegistry.filter((fn) => fn.type === type);
}

// Category metadata for the UI
export const categoryMeta: Record<string, { label: string; color: string; icon: string }> = {
  source:         { label: 'Source',    color: '#f472b6', icon: '◉' },
  geometry:       { label: 'Geometry',  color: '#60a5fa', icon: '⬡' },
  color:          { label: 'Color',     color: '#a78bfa', icon: '◆' },
  blend:          { label: 'Blend',     color: '#34d399', icon: '◎' },
  modulate:       { label: 'Modulate',  color: '#fbbf24', icon: '◈' },
  externalSource: { label: 'External',  color: '#f97316', icon: '▣' },
  output:         { label: 'Output',    color: '#ef4444', icon: '▶' },
  settings:       { label: 'Settings',  color: '#94a3b8', icon: '⚙' },
};
