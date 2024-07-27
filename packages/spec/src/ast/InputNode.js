import { ASTNode } from './ASTNode.js';
import { INPUT, SQL, AGG } from '../constants.js';
import { parseExpression } from './ExpressionNode.js';
import { parseTransform } from './TransformNode.js';
import { parseOptions } from './OptionsNode.js';
import { isObject } from '../util.js';


function maybeTransform(value, ctx) {
  if (isObject(value)) {
    return (value[SQL] || value[AGG])
      ? parseExpression(value, ctx)
      : parseTransform(value, ctx);
  }
}


export function parseInput(spec, ctx) {
  const { [INPUT]: name, ...options } = spec;
  if (!ctx.inputs?.has(name)) {
    ctx.error(`Unrecognized input type: ${name}`, spec);
  }
  var opt = {};
  for (const key in options) {
    const value = options[key];
    if (Array.isArray(value)) {
      opt[key] = value.map(v => maybeTransform(v, ctx) || ctx.maybeParam(v));
    } else {
      opt[key] = maybeTransform(value, ctx) || ctx.maybeParam(value);
    }
  }
  return new InputNode(name, parseOptions(options, ctx));
}

export class InputNode extends ASTNode {
  constructor(name, options) {
    super(INPUT);
    this.name = name;
    this.options = options;
  }

  instantiate(ctx) {
    return ctx.api[this.name](this.options.instantiate(ctx));
  }

  codegen(ctx) {
    const opt = this.options.codegen(ctx);
    return `${ctx.tab()}${ctx.ns()}${this.name}(${opt})`;
  }

  toJSON() {
    const { type, name, options } = this;
    return { [type]: name, ...options.toJSON() };
  }
}
