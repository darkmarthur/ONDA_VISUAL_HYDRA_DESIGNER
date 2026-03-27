/**
 * Hydra Parser (Recursive & Robust)
 * Converts Hydra JS code chains into a graph of nodes and edges.
 */

import { getHydraFunction } from './registry';
import { HydraNodeData, HydraNodeType } from './types';
import { Node, Edge } from '@xyflow/react';

interface ParsedCall {
  fn: string;
  args: any[];
  alias?: string;
  chain?: ParsedCall;
}

let sessionNodeIdCounter = 0;
let sessionEdgeIdCounter = 0;

function generateUniqueNodeId(prefix: string = 'node'): string {
  return `${prefix}_${Date.now()}_${sessionNodeIdCounter++}_${Math.floor(Math.random() * 1000000)}`;
}

function generateUniqueEdgeId(prefix: string = 'e'): string {
  return `${prefix}_${Date.now()}_${sessionEdgeIdCounter++}_${Math.floor(Math.random() * 1000000)}`;
}

function tokenize(code: string): string[] {
  const regex = /(\/\/.*)|([a-zA-Z_$][\w$]*)|(-?\d*\.?\d+)|(\()|(\))|(\.)|(,)|(=>)|([+*\/%-])|("[^"]*")|('[^']*')|(\[)|(\])/g;
  const tokens: string[] = [];
  let match;
  while ((match = regex.exec(code)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

class Parser {
  private tokens: string[];
  private current = 0;

  constructor(tokens: string[]) {
    this.tokens = tokens;
  }

  private peek() { return this.tokens[this.current]; }
  private peekNext() { return this.tokens[this.current + 1]; }
  private consume() { return this.tokens[this.current++]; }

  private skipNoise() {
    while (this.current < this.tokens.length && 
           (this.peek()?.startsWith('//') || this.peek() === ';')) {
      this.consume();
    }
  }

  parse(): ParsedCall[] {
    const chains: ParsedCall[] = [];
    while (this.current < this.tokens.length) {
      this.skipNoise();
      if (this.current >= this.tokens.length) break;

      const chain = this.parseExpression();
      if (chain) {
        chains.push(chain);
      } else {
        this.consume(); 
      }
    }
    return chains;
  }

  private parseExpression(): ParsedCall | null {
    this.skipNoise();
    let token = this.peek();
    
    if (token === '.') {
       this.consume(); 
       token = this.peek();
    }

    if (!token || token === ')' || token === ',' || token === ']') return null;

    const fn = this.consume();
    if (this.peek() !== '(') {
      return { fn, args: [] };
    }

    const node = this.parseCall(fn);
    if (!node) return null;
    
    let currentNode = node;
    while (this.current < this.tokens.length) {
      this.skipNoise();
      const next = this.peek();
      if (next === '.') {
        this.consume(); 
        this.skipNoise();
        const nextFn = this.consume();
        if (nextFn && this.peek() === '(') {
          const nextCall = this.parseCall(nextFn);
          if (nextCall) {
            currentNode.chain = nextCall;
            currentNode = nextCall;
          } else break;
        } else break;
      } else {
        break;
      }
    }
    
    return node;
  }

  private parseCall(fn: string): ParsedCall | null {
    if (this.peek() !== '(') return null;
    this.consume(); 

    const args: any[] = [];
    while (this.current < this.tokens.length && this.peek() !== ')') {
      this.skipNoise();
      const arg = this.parseArgument();
      if (arg !== undefined) args.push(arg);
      this.skipNoise();
      if (this.peek() === ',') this.consume();
    }

    if (this.peek() === ')') this.consume();

    return { fn, args };
  }

  private parseArgument(): any {
    const token = this.peek();
    if (!token || token === ')') return undefined;

    if (/^[a-zA-Z_$]/.test(token) && this.peekNext() === '(') {
      return this.parseExpression();
    }

    let expr = '';
    let level = 0;
    let bracketLevel = 0;

    while (this.current < this.tokens.length) {
      const t = this.peek();
      if (level === 0 && bracketLevel === 0 && (t === ',' || t === ')')) break;

      this.consume();
      expr += t + (t === ',' ? ' ' : '');
      
      if (t === '(') level++;
      else if (t === ')') level--;
      else if (t === '[') bracketLevel++;
      else if (t === ']') bracketLevel--;
    }

    const trimmed = expr.trim();
    if (/^(o[0-3]|s[0-3])$/.test(trimmed)) {
       return { fn: trimmed, args: [] };
    }

    const num = parseFloat(trimmed);
    if (!isNaN(num) && !trimmed.includes(' ') && !/[a-zA-Z_$]/.test(trimmed)) {
      return num;
    }

    return trimmed || undefined;
  }
}

function deduplicate<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  items.forEach(i => map.set(i.id, i));
  return Array.from(map.values());
}

/**
 * Main build Graph logic
 */
export function buildGraphFromCode(
  code: string, 
  existingNodes: Node<HydraNodeData>[]
): { nodes: Node<HydraNodeData>[], edges: Edge[] } {
  const tokens = tokenize(code);
  const parser = new Parser(tokens);
  const parsedChains = parser.parse();

  const nodes: Node<HydraNodeData>[] = [];
  const edges: Edge[] = [];

  const createNode = (fn: string, args: any[], x: number, y: number): Node<HydraNodeData> | null => {
    let hydraFn = fn;
    let hydraArgs = args;
    if (/^(o[0-3]|s[0-3])$/.test(fn)) {
      hydraFn = 'src';
      hydraArgs = [fn];
    }

    const fnDef = getHydraFunction(hydraFn);
    if (!fnDef) return null;

    const existing = existingNodes.find(n => 
      n.data.hydraFunction === hydraFn && 
      !nodes.some(placed => placed.id === n.id)
    );

    const id = existing?.id || generateUniqueNodeId();
    const nodeType = fnDef.category === 'output' ? 'output' : 
                     fnDef.category === 'value' ? 'value' : 
                     fnDef.type === 'src' ? 'source' : 'transform';

    const params: Record<string, any> = {};
    const bindings: Record<string, any> = {};

    const isCombine = fnDef.type.startsWith('combine');
    const startIdx = isCombine ? 1 : 0;

    fnDef.params.forEach((p, i) => {
      const arg = hydraArgs[i + startIdx];
      if (arg === undefined) {
        params[p.name] = p.default;
      } else if (typeof arg === 'string') {
        // Special case: Buffer names are literal strings, not expressions
        if (/^(o[0-3]|s[0-3])$/.test(arg)) {
          params[p.name] = arg;
        } else if (arg.includes('=>') || isNaN(parseFloat(arg))) {
          params[p.name] = "";
          bindings[p.name] = { mode: 'expression', expression: arg };
        } else {
          params[p.name] = parseFloat(arg);
        }
      } else if (typeof arg === 'object' && arg.fn) {
        params[p.name] = p.default;
      } else {
        params[p.name] = arg;
      }
    });

    const node: Node<HydraNodeData> = {
      id,
      type: nodeType === 'source' ? 'hydraSource' : nodeType === 'output' ? 'hydraOutput' : nodeType === 'value' ? 'hydraValue' : 'hydraTransform',
      position: existing?.position || { x, y },
      data: {
        hydraFunction: hydraFn,
        functionDef: fnDef,
        params,
        bindings,
        label: hydraFn,
        nodeType
      }
    };
    
    nodes.push(node);
    return node;
  };

  const processChain = (head: ParsedCall, startX: number, startY: number): Node<HydraNodeData> | null => {
    let currentCall: ParsedCall | undefined = head;
    let prevNode: Node<HydraNodeData> | null = null;
    let x = startX;
    let y = startY;

    while (currentCall) {
      const node = createNode(currentCall.fn, currentCall.args, x, y);
      if (!node) break;

      if (prevNode) {
        edges.push({
          id: generateUniqueEdgeId(),
          source: prevNode.id,
          target: node.id,
          sourceHandle: 'texture-out',
          targetHandle: node.data.nodeType === 'output' ? 'output-in' : 'texture-in',
          type: 'hydra'
        });
      }

      const isCombine = node.data.functionDef.type.startsWith('combine');

      currentCall.args.forEach((arg, i) => {
        let argTailNode: Node<HydraNodeData> | null = null;
        let isSecondaryTexture = false;

        if (isCombine && i === 0) {
           isSecondaryTexture = true;
           if (typeof arg === 'object' && arg.fn) {
             argTailNode = processChain(arg, x - 350, y + 250);
           } else if (typeof arg === 'string' && /^(o[0-3]|s[0-3])$/.test(arg)) {
             argTailNode = createNode('src', [arg], x - 350, y + 250);
           }
        } else if (typeof arg === 'object' && arg.fn) {
           argTailNode = processChain(arg, x - 350, y + 250);
        }

        if (argTailNode) {
          const paramDef = isCombine ? node.data.functionDef.params[i - 1] : node.data.functionDef.params[i];
          const isTexture = argTailNode.data.nodeType === 'source' || argTailNode.data.nodeType === 'transform';
          
          edges.push({
            id: generateUniqueEdgeId(),
            source: argTailNode.id,
            target: node.id,
            sourceHandle: isTexture ? 'texture-out' : 'value-out',
            targetHandle: isSecondaryTexture ? 'texture-secondary' : `param-in:${paramDef?.name}`,
            type: 'hydra'
          });
        }
      });

      prevNode = node;
      x += 380;
      currentCall = currentCall.chain;
    }

    return prevNode;
  };

  parsedChains.forEach((rootChain, idx) => {
    processChain(rootChain, 50, 100 + (idx * 600));
  });

  return { nodes: deduplicate(nodes), edges: deduplicate(edges) };
}
