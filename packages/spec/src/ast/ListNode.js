import { ASTNode } from './ASTNode.js';
import { LIST } from '../constants.js';

export class ListNode extends ASTNode {
  constructor(children) {
    super(LIST);
    this.children = children
  }

  instantiate() {
    return this.children.map(c => c.instantiate());
  }

  codegen(ctx) {
    return `[${this.children.map(c => c.codegen(ctx)).join(',')}]`;
  }

  toJSON() {
    return this.children.map(c => c.toJSON());
  }
}
