import { MosaicClient, Param, isSelection, clausePoints } from '@uwdata/mosaic-core';
import { Query, desc } from '@uwdata/mosaic-sql';
import { input } from './input.js';

let _id = 0;

export const topnselector = options => input(TopNSelector, options);

export class TopNSelector extends MosaicClient {
  /**
   * Create a new TopNSelector input.
   * @param {object} [options] Options object
   * @param {HTMLElement} [options.element] The parent DOM element in which to
   *  place the input elements. If undefined, a new `div` element is created.
   * @param {Selection} [options.filterBy] A selection to filter the database
   *  table indicated by the *from* option.
   * @param {Param} [options.as] The output param or selection. A selection
   *  clause is added based on the top N query results.
   * @param {string} [options.by] The database column name to use for grouping.
   * @param {string} [options.value] The aggregation column name to use for sorting.
   * @param {number} [options.n=10] The number of top results to select.
   * @param {string} [options.from] The name of a database table to query.
   * @param {string} [options.label] A text label for this input.
   */
  constructor({
    element,
    filterBy,
    from,
    by,
    value,
    n = 10,
    label,
    as,
    headless = false,
  } = {}) {
    super(filterBy);
    this.id = 'topn_' + (++_id);
    this.by = by;
    this.value = value;
    this.n = n;
    this.from = from;
    this.selection = as;

    this.element = element ?? document.createElement('div');
    this.element.setAttribute('class', 'input');
    Object.defineProperty(this.element, 'value', { value: this });

    if (label) {
      const lab = document.createElement('label');
      lab.setAttribute('for', this.id);
      lab.innerText = label;
      if (!headless) {
	this.element.appendChild(lab);
      }
    }

    this.numberbox = document.createElement('input');
    this.numberbox.setAttribute('id', this.id);
    this.numberbox.setAttribute('type', 'number');
    this.numberbox.setAttribute('value', this.n);
    this.numberbox.setAttribute('min', '1');
    if (!headless) {
      this.element.appendChild(this.numberbox);
    }

    if (this.selection) {
      this.numberbox.addEventListener('input', () => {
        this.n = parseInt(this.numberbox.value, 10);
	this.requestUpdate()
      });
    }
  }

  query(filter = []) {
    const { from, by, value, n } = this;
    if (!from || !by || !value) return null;
    if (isNaN(n)) {
      return null;
    }
    return Query
      .from(from)
      .select(by)
      .where(filter)
      .groupby(by)
      .orderby(desc(value))
      .limit(n);
  }

  queryResult(data) {
    const {selection, by} = this;
    if (isSelection(selection)) {
      const values = Array.from(data.getChild(by).toArray());
      const clause = clausePoints([this.by], values.map(v => [v]), {source: this});
      selection.update(clause);
    } else {
      console.log("TopNSelector doesn't have a selection, no-op-ing.");
    }
    return this;
  }
}

