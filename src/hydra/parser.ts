/**
 * Hydra Parser (Robust Version)
 * Converts Hydra JS code chains into a graph of nodes and edges.
 * Handles line breaks, comments within chains, and complex lambda expressions.
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
 * Tokenizer that captures tokens needed for Hydra grammar
 */
function tokenize(code: string): string[] {
  // Matches: // comments, function names, numbers, parentheses, dots, commas, arrows (=>), and operators
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
  private expect(val: string) {
    if (this.peek() !== val) {
      console.warn(`Expected ${val} but got ${this.peek()}`);
    }
    return this.consume();
  }

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

      const alias = this.parseAlias();
      const chain = this.parseExpression();
      if (chain) {
        if (alias) chain.alias = alias;
        chains.push(chain);
      } else if (this.current < this.tokens.length) {
        this.consume(); 
      }
    }
    return chains;
  }

  private parseAlias(): string | undefined {
    // Check if previous token was a comment with alias
    // (This is tricky because skipNoise consumes them)
    // We'll peek manually
    return undefined; // Handled better inside parseExpression if needed
  }

  private parseExpression(): ParsedCall | null {
    const token = this.peek();
    if (!token || token === '.' || token === ')' || token === ',' ) return null;

    // Start of an expression
    const fn = this.consume();
    if (this.peek() !== '(') return null;

    const node = this.parseCall(fn);
    
    // Check for chaining
    let currentNode = node;
    while (this.current < this.tokens.length) {
      const next = this.peek();
      if (next === '.') {
        this.consume(); // dot
        this.skipNoise();
        const nextFn = this.consume();
        if (nextFn && this.peek() === '(') {
          const nextCall = this.parseCall(nextFn);
          currentNode.chain = nextCall;
          currentNode = nextCall;
        } else {
          break; // Invalid chain
        }
      } else if (next?.startsWith('//')) {
        this.consume(); // skip comment and continue looking for dot
      } else {
        break;
      }
    }
    
    return node;
  }

  private parseCall(fn: string): ParsedCall {
    this.expect('(');
    const args: any[] = [];
    while (this.current < this.tokens.length && this.peek() !== ')') {
      const arg = this.parseArgument();
      if (arg !== undefined) args.push(arg);
      if (this.peek() === ',') this.consume();
    }
    this.expect(')');
    return { fn, args };
  }

  private parseArgument(): any {
    const token = this.peek();
    if (token === ')') return undefined;

    // Check if it's a nested hydra call: fn(
    if (/^[a-zA-Z_$]/.test(token) && this.peekNext() === '(') {
      return this.parseExpression();
    }

    // Check if it's a lambda: () => ...
    if (token === '(' && (this.peekNext() === ')' || this.peekNext() === 'id' || this.peekNext() === 'v')) {
      // Very rough lambda detection
      let level = 0;
      let expr = '';
      while (this.current < this.tokens.length) {
        const t = this.consume();
        expr += t + (t === ',' ? ' ' : '');
        if (t === '(') level++;
        if (t === ')') level--;
        if (level === 0) break;
      }
      // If next is =>, it's definitely a lambda
      if (this.peek() === '=>') {
        expr += ' ' + this.consume() + ' ';
        // Grab the rest of the body until comma or closing paren
        while (this.current < this.tokens.length && this.peek() !== ',' && this.peek() !== ')') {
          expr += this.consume();
        }
      }
      return expr;
    }

    // Default: consume as literal or string
    let val = this.consume();
    const num = parseFloat(val);
    if (!isNaN(num)) return num;
    return val;
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
  let nodeIdCounter = 0;

  const createNode = (fn: string, args: any[], alias?: string, x = 0, y = 0): Node<HydraNodeData> | null => {
    const fnDef = getHydraFunction(fn);
    if (!fnDef) return null;

    // Try to find existing node by alias or by type/index
    const existing = existingNodes.find(n => 
      (alias && n.data.alias === alias) || 
      (n.data.hydraFunction === fn && !nodes.some(placed => placed.id === n.id))
    );

    const id = existing?.id || `node_${Date.now()}_${nodeIdCounter++}`;
    const nodeType: HydraNodeType = 
      fnDef.category === 'output' ? 'output' : 
      fnDef.category === 'value' ? 'value' : 
      fnDef.type === 'src' ? 'source' : 'transform';

    const params: Record<string, any> = {};
    const bindings: Record<string, any> = {};

    fnDef.params.forEach((p, i) => {
      const arg = args[i];
      if (arg === undefined) {
        params[p.name] = p.default;
      } else if (typeof arg === 'string' && (arg.includes('=>') || isNaN(parseFloat(arg)))) {
        // Handle lambda or complex expression as a body binding
        params[p.name] = ""; // Visual placeholder
        bindings[p.name] = {
           mode: 'expression',
           expression: arg
        };
      } else if (typeof arg === 'object' && arg.fn) {
        // Nested node
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
        hydraFunction: fn,
        functionDef: fnDef,
        params,
        bindings,
        label: alias || fn,
        alias,
        nodeType
      }
    };
    
    nodes.push(node);
    return node;
  };

  parsedChains.forEach((chain, chainIdx) => {
    let currentX = 100;
    let currentY = 100 + (chainIdx * 300);
    
    let prevNode: Node<HydraNodeData> | null = null;
    let step: ParsedCall | undefined = chain;

    while (step) {
      const node = createNode(step.fn, step.args, step.alias, currentX, currentY);
      
      if (node) {
        // Primary Chain Connection
        if (prevNode) {
          edges.push({
            id: `e_${prevNode.id}_${node.id}`,
            source: prevNode.id,
            target: node.id,
            sourceHandle: 'texture-out',
            targetHandle: node.data.nodeType === 'output' ? 'output-in' : 'texture-in',
            type: 'hydra',
            animated: true
          });
        }

        // Nested Node Connections (e.g. modulate(noise()))
        step.args.forEach((arg, i) => {
          if (typeof arg === 'object' && arg.fn) {
            const paramDef = node.data.functionDef.params[i];
            const nestedNode = createNode(arg.fn, arg.args, undefined, currentX - 250, currentY + 150);
            if (nestedNode && paramDef) {
               node.data.bindings = node.data.bindings || {};
               
               // If nested node is a source/texture, it's a secondary texture input
               if (nestedNode.data.nodeType === 'source' || nestedNode.data.nodeType === 'transform') {
                  node.data.bindings[paramDef.name] = { mode: 'literal' }; // It's a cable connection
                  edges.push({
                    id: `e_${nestedNode.id}_${node.id}_sec`,
                    source: nestedNode.id,
                    target: node.id,
                    sourceHandle: 'texture-out',
                    targetHandle: 'texture-secondary',
                    type: 'hydra',
                    animated: true
                  });
               } else {
                  node.data.bindings[paramDef.name] = {
                    mode: 'value_node',
                    boundNodeId: nestedNode.id
                  };
                  edges.push({
                    id: `e_${nestedNode.id}_${node.id}_val`,
                    source: nestedNode.id,
                    target: node.id,
                    sourceHandle: 'value-out',
                    targetHandle: `param-in:${paramDef.name}`,
                    type: 'hydra',
                    animated: true
                  });
               }
            }
          }
        });

        prevNode = node;
        currentX += 300;
      }
      step = step.chain;
    }
  });

  return { nodes, edges };
}
