/**
 * Hydra Parser (Robust Version)
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

/**
 * Tokenizer that captures meaningful Hydra tokens.
 */
function tokenize(code: string): string[] {
  const regex = /(\/\/.*)|([a-zA-Z_$][\w$]*)|(-?\d*\.?\d+)|(\()|(\))|(\.)|(,)|(=>)|([+*\/%-])|("[^"]*")|('[^']*')/g;
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
        // Fallback: Skip one token if we can't parse anything to avoid infinite loop
        this.consume(); 
      }
    }
    return chains;
  }

  private parseExpression(): ParsedCall | null {
    this.skipNoise();
    let token = this.peek();
    
    // Handle chains starting with dots (auto-heal) or regular functions
    if (token === '.') {
       this.consume(); // skip leading dot
       token = this.peek();
    }

    if (!token || token === ')' || token === ',' ) return null;

    // Start of an expression (function call)
    const fn = this.consume();
    if (this.peek() !== '(') return null;

    const node = this.parseCall(fn);
    if (!node) return null;
    
    // Continue the chain
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
    this.consume(); // '('

    const args: any[] = [];
    while (this.current < this.tokens.length && this.peek() !== ')') {
      this.skipNoise();
      const arg = this.parseArgument();
      if (arg !== undefined) args.push(arg);
      this.skipNoise();
      if (this.peek() === ',') this.consume();
    }

    // Crucial: ensure we consume the closing parenthesis
    if (this.peek() === ')') {
      this.consume();
    } else {
      console.warn(`Call to ${fn} missing closing parenthesis`);
    }

    return { fn, args };
  }

  private parseArgument(): any {
    const token = this.peek();
    if (!token || token === ')') return undefined;

    // Nested call recursive case
    if (/^[a-zA-Z_$]/.test(token) && this.peekNext() === '(') {
      return this.parseExpression();
    }

    // Capture everything else with parenthesis tracking
    let expr = '';
    let level = 0;

    while (this.current < this.tokens.length) {
      const t = this.peek();
      
      // Break at top-level separators
      if (level === 0 && (t === ',' || t === ')')) break;

      this.consume();
      expr += t + (t === ',' ? ' ' : '');
      
      if (t === '(') level++;
      else if (t === ')') level--;
    }

    // Type conversion
    const trimmed = expr.trim();
    const num = parseFloat(trimmed);
    if (!isNaN(num) && !trimmed.includes(' ') && !/[a-zA-Z_$]/.test(trimmed)) {
      return num;
    }

    return trimmed || undefined;
  }
}

/**
 * Convert parsed chains into graph nodes and edges
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
  let nextX = 100;
  let nextY = 100;

  const createNode = (fn: string, args: any[], x: number, y: number): Node<HydraNodeData> | null => {
    const fnDef = getHydraFunction(fn);
    if (!fnDef) return null;

    // Check if we can reuse an existing node to maintain positions
    const existing = existingNodes.find(n => 
      n.data.hydraFunction === fn && !nodes.some(placed => placed.id === n.id)
    );

    const id = existing?.id || `node_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nodeType = fnDef.category === 'output' ? 'output' : 
                     fnDef.category === 'value' ? 'value' : 
                     fnDef.type === 'src' ? 'source' : 'transform';

    const params: Record<string, any> = {};
    const bindings: Record<string, any> = {};

    fnDef.params.forEach((p, i) => {
      const arg = args[i];
      if (arg === undefined) {
        params[p.name] = p.default;
      } else if (typeof arg === 'string' && (arg.includes('=>') || isNaN(parseFloat(arg)))) {
        params[p.name] = "";
        bindings[p.name] = { mode: 'expression', expression: arg };
      } else if (typeof arg === 'object' && arg.fn) {
        params[p.name] = p.default; // Nested nodes handled below
      } else {
        params[p.name] = arg;
      }
    });

    const node: Node<HydraNodeData> = {
      id,
      type: nodeType === 'source' ? 'hydraSource' : nodeType === 'output' ? 'hydraOutput' : nodeType === 'value' ? 'hydraValue' : 'hydraTransform',
      position: existing?.position || { x, y },
      data: {
        hydraFunction: fn,
        functionDef: fnDef,
        params,
        bindings,
        label: fn,
        nodeType
      }
    };
    
    nodes.push(node);
    return node;
  };

  parsedChains.forEach((chain, chainIdx) => {
    let currentX = nextX;
    let currentY = nextY + (chainIdx * 250);
    
    let prevNode: Node<HydraNodeData> | null = null;
    let step: ParsedCall | undefined = chain;

    while (step) {
      const node = createNode(step.fn, step.args, currentX, currentY);
      
      if (node) {
        if (prevNode) {
          edges.push({
            id: `e_${prevNode.id}_${node.id}_${Date.now()}`,
            source: prevNode.id,
            target: node.id,
            sourceHandle: 'texture-out',
            targetHandle: node.data.nodeType === 'output' ? 'output-in' : 'texture-in',
            type: 'hydra'
          });
        }

        // Connect nested calls (secondary textures or value inputs)
        step.args.forEach((arg, i) => {
          if (typeof arg === 'object' && arg.fn) {
            const nestedNode = createNode(arg.fn, arg.args, currentX - 250, currentY + 150);
            if (nestedNode) {
               const paramDef = node.data.functionDef.params[i];
               if (paramDef) {
                  const isTexture = nestedNode.data.nodeType === 'source' || nestedNode.data.nodeType === 'transform';
                  edges.push({
                    id: `e_nested_${nestedNode.id}_${node.id}_${i}`,
                    source: nestedNode.id,
                    target: node.id,
                    sourceHandle: isTexture ? 'texture-out' : 'value-out',
                    targetHandle: isTexture ? 'texture-secondary' : `param-in:${paramDef.name}`,
                    type: 'hydra'
                  });
               }
            }
          }
        });

        prevNode = node;
        currentX += 300;
        nextX = Math.max(nextX, currentX);
      }
      step = step.chain;
    }
    nextY = Math.max(nextY, currentY + 300);
  });

  return { nodes, edges };
}
