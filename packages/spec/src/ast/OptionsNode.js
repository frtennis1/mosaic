import { ASTNode } from './ASTNode.js';
import { OPTIONS } from '../constants.js';
import { isObject } from '../util.js';
import { SQL, AGG} from '../constants.js';
import { parseExpression } from './ExpressionNode.js';
import { parseTransform } from './TransformNode.js';

function maybeTransform(value, ctx) {
  if (isObject(value)) {
    return (value[SQL] || value[AGG])
      ? parseExpression(value, ctx)
      : parseTransform(value, ctx);
  }
}

export function parseOptions(spec, ctx) {
  const options = {};
  for (const key in spec) {
    options[key] = maybeTransform(spec[key], ctx) || ctx.maybeSelection(spec[key]);
  }
  return new OptionsNode(options);
}

export class OptionsNode extends ASTNode {
  constructor(options) {
    super(OPTIONS);
    this.options = options;
  }

  filter(predicate) {
    const opt = Object.fromEntries(
      Object.entries(this.options)
        .filter(([key, value]) => predicate(key, value))
    );
    return new OptionsNode(opt);
  }

  instantiate(ctx) {
    const { options } = this;
    const opt = {};
    for (const key in options) {
      opt[key] = options[key].instantiate(ctx);
    }
    return opt;
  }

  codegen(ctx) {
    const { options } = this;
    const opt = [];
    for (const key in options) {
      opt.push(`${key}: ${options[key].codegen(ctx)}`);
    }
    return opt.length ? `{${ctx.maybeLineWrap(opt)}}` : '';
  }

  toJSON() {
    const { options } = this;
    const opt = {};
    for (const key in options) {
      opt[key] = options[key].toJSON();
    }
    return opt;
  }
}
