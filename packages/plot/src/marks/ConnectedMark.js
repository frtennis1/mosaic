import { Query, argmax, argmin, max, min, sql } from '@uwdata/mosaic-sql';
import { binExpr } from './util/bin-expr.js';
import { filteredExtent } from './util/extent.js';
import { Mark } from './Mark.js';

export class ConnectedMark extends Mark {
  constructor(type, source, encodings) {
    const dim = type.endsWith('X') ? 'y' : type.endsWith('Y') ? 'x' : null;
    const req = dim ? { [dim]: ['min', 'max'] } : undefined;
    super(type, source, encodings, req);
    this.dim = dim;
  }

  /**
   * Return a query specifying the data needed by this Mark client.
   * @param {*} [filter] The filtering criteria to apply in the query.
   * @returns {*} The client query
   */
  query(filter = []) {
    const { plot, dim, source } = this;
    const { optimize = true } = source.options || {};
    const q = super.query(filter);
    if (!dim) return q;

    const ortho = dim === 'x' ? 'y' : 'x';
    const value = this.channelField(ortho, { exact: true })?.as;
    const { field, as, type, min, max } = this.channelField(dim);
    const isContinuous = type === 'date' || type === 'number';

    if (optimize && isContinuous && value) {
      // TODO: handle stacked data!
      const size = dim === 'x' ? plot.innerWidth() : plot.innerHeight();
      const [lo, hi] = filteredExtent(filter, field) || [min, max];
      const [expr] = binExpr(this, dim, size, [lo, hi], 1, as);
      const cols = q.select()
        // @ts-ignore
        .map(c => c.as)
        .filter(c => c !== as && c !== value);
      return m4(q, expr, as, value, cols);
    } else {
      return q.orderby(field);
    }
  }
}

/// Like a connected mark, but the x-value will be transformed to cumsum(x)
/// while preserving M4 optimization.
export class CumConnectedMark extends Mark {
  constructor(type, source, encodings) {
    const dim = type.endsWith('X') ? 'y' : 'x';
    const column = encodings[dim];
    encodings[dim] = sql`sum(${encodings[dim]}) over (order by ${encodings["order"]})`

    super(type, source, encodings);
    this.dim = dim;
    this.column = column
  }

  fields() {
    var fields = super.fields()
    let fieldsModified = false;
    for (var {column, stats} of fields) {
      if (column == this.column) {
        stats.add("sum");
        stats.add("count");
        fieldsModified = true;
      }
    }
    if (!fieldsModified) {
      fields.push({table: this.source.table, column: this.column, stats: ["count", "sum"]});
    }
    return fields;
  }

  fieldInfo(info) {
    super.fieldInfo(info);
    for (const item of info) {
      if (item.column === this.column) {
        this.column_sum = item.sum;
        break;
      }
    }
    return info;
  }

  query(filter = []) {
    const { plot, dim, source, column_sum} = this;
    const { optimize = true } = source.options || {};
    const { as } = this.channelField(dim);
    const q = super.query(filter);

    if (optimize) {
      const size = dim === 'x' ? plot.innerWidth() : plot.innerHeight();
      const [expr] = binExpr(this, dim, size, [0, column_sum], 1, as);
      const val = this.channelField(dim === 'x' ? 'y' : 'x').as;
      const cols = q.select()
        .map(c => c.as)
        .filter(c => c !== as && c !== val);
      return m4(q, expr, as, val, cols);
    } else {
      return q.orderby(as);
    }
  }
}

/**
 * M4 is an optimization for value-preserving time-series aggregation
 * (http://www.vldb.org/pvldb/vol7/p797-jugel.pdf). This implementation uses
 * an efficient version with a single scan and the aggregate function
 * argmin and argmax, following https://arxiv.org/pdf/2306.03714.pdf.
 */
function m4(input, bin, x, y, cols = []) {
  const pixel = sql`FLOOR(${bin})::INTEGER`;

  const q = (sel) => Query
    .from(input)
    .select(sel)
    .groupby(pixel, cols);

  return Query
    .union(
      q([{ [x]: min(x), [y]: argmin(y, x) }, ...cols]),
      q([{ [x]: max(x), [y]: argmax(y, x) }, ...cols]),
      q([{ [x]: argmin(x, y), [y]: min(y) }, ...cols]),
      q([{ [x]: argmax(x, y), [y]: max(y) }, ...cols])
    )
    .orderby(cols, x);
}
