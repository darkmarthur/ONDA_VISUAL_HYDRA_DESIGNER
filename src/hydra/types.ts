/**
 * Hydra Type System
 * Based on the actual hydra-synth glsl-functions.js source code.
 *
 * Hydra internally classifies functions into 5 types:
 *   - src:          Generates a texture (vec4) from coordinates (vec2)
 *   - coord:        Transforms coordinates (vec2 → vec2), chainable on a texture chain
 *   - color:        Transforms color (vec4 → vec4), chainable on a texture chain
 *   - combine:      Blends two textures (vec4, vec4 → vec4), requires secondary texture
 *   - combineCoord: Modulates coordinates using a texture (vec2, vec4 → vec2), requires secondary texture
 */

// ─── Hydra internal function type ────────────────────────────────────────────
export type HydraFunctionType = 'src' | 'coord' | 'color' | 'combine' | 'combineCoord';

// ─── UI category for the node library panel ──────────────────────────────────
export type HydraCategory =
  | 'source'
  | 'geometry'
  | 'color'
  | 'blend'
  | 'modulate'
  | 'externalSource'
  | 'output'
  | 'settings';

// ─── Parameter definition ────────────────────────────────────────────────────
export interface HydraParamDef {
  name: string;
  type: 'float' | 'int' | 'sampler2D' | 'vec4';
  default: number;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

// ─── Function definition in the registry ─────────────────────────────────────
export interface HydraFunctionDef {
  name: string;
  type: HydraFunctionType;
  category: HydraCategory;
  params: HydraParamDef[];
  description?: string;
}

// ─── Node types for the visual editor ────────────────────────────────────────
export type HydraNodeType = 'source' | 'transform' | 'output';

// ─── Data stored inside each React Flow node ─────────────────────────────────
export interface HydraNodeData {
  [key: string]: unknown;
  hydraFunction: string;           // e.g. 'osc', 'rotate', 'blend'
  functionDef: HydraFunctionDef;   // full definition from registry
  params: Record<string, number>;  // current parameter values
  label: string;                   // display label
  alias?: string;                  // custom conceptual label
  nodeType: HydraNodeType;         // visual node classification
}

// ─── Handle (port) types ─────────────────────────────────────────────────────
export type HandleKind =
  | 'texture-out'       // source/chain output → produces texture
  | 'texture-in'        // main chain input → receives texture chain
  | 'texture-secondary' // secondary texture input (for combine/combineCoord)
  | 'output-in';        // output node input

// ─── Serializable patch format ───────────────────────────────────────────────
export interface SerializedPatch {
  version: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  viewport: { x: number; y: number; zoom: number };
}

export interface SerializedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    hydraFunction: string;
    params: Record<string, number>;
    alias?: string;
  };
}

export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
}

// ─── Output buffer identifiers ───────────────────────────────────────────────
export type HydraOutput = 'o0' | 'o1' | 'o2' | 'o3';
