import { Query, argmax, argmin, max, min, sql } from '@uwdata/mosaic-sql';
import { binField } from './util/bin-field.js';
import { filteredExtent } from './util/extent.js';
import { Mark } from './Mark.js';

export class ConnectedMark extends Mark {
  constructor(type, source, encodings) {
    const dim = type.endsWith('X') ? 'y' : type.endsWith('Y') ? 'x' : null;
    const req = { [dim]: ['count', 'min', 'max'] };

    super(type, source, encodings, req);
    this.dim = dim;
  }

  query(filter = []) {
    const { plot, dim, source, stats } = this;
    const { optimize = true } = source.options || {};
    const q = super.query(filter);

    if (optimize && dim) {
      const { field, as } = this.channelField(dim);

      // TODO: handle stacked data
      const { column } = field;
      const { count, max, min } = stats[column];
      const size = dim === 'x' ? plot.innerWidth() : plot.innerHeight();

      const [lo, hi] = filteredExtent(filter, column) || [min, max];
      const scale = (hi - lo) / (max - min);
      if (count * scale > size * 4) {
        const dd = binField(this, dim, as);
        const val = this.channelField(dim === 'x' ? 'y' : 'x').as;
        const cols = q.select().map(c => c.as).filter(c => c !== as && c !== val);
        return m4(q, dd, as, val, lo, hi, size, cols);
      }

      q.orderby(as);
    }

    return q;
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
    for (var {column, stats} of fields) {
      if (column == this.column) {
	stats.add("sum");
	stats.add("count");
	return fields;
      }
    }
    fields.push({table: this.source.table, column: this.column, stats: ["count", "sum"]});
    return fields;
  }

  query(filter = []) {
    const { plot, dim, source, stats, column } = this;
    const { optimize = true } = source.options || {};
    const { as } = this.channelField(dim);
    const q = super.query(filter);

    if (optimize) {
      const { count, sum } = stats[column];
      const size = dim === 'x' ? plot.innerWidth() : plot.innerHeight();

      const [lo, hi] = [0, sum];
      if (count > size * 4) {
        const dd = dim;
        const val = this.channelField(dim === 'x' ? 'y' : 'x').as;
        const cols = q.select().map(c => c.as).filter(c => c !== as && c !== val);
        return m4(q, dd, as, val, lo, hi, size, cols);
      }
    }

    return q.orderby(as);
  }
}

/**
 * M4 is an optimization for value-preserving time-series aggregation
 * (http://www.vldb.org/pvldb/vol7/p797-jugel.pdf). This implementation uses
 * an efficient version with a single scan and the aggregate function
 * argmin and argmax, following https://arxiv.org/pdf/2306.03714.pdf.
 */
function m4(input, bx, x, y, lo, hi, width, cols = []) {
  const bins = sql`FLOOR(${width / (hi - lo)}::DOUBLE * (${bx} - ${+lo}::DOUBLE))::INTEGER`;

  const q = (sel) => Query
    .from(input)
    .select(sel)
    .groupby(bins, cols);

  return Query
    .union(
      q([{ [x]: min(x), [y]: argmin(y, x) }, ...cols]),
      q([{ [x]: max(x), [y]: argmax(y, x) }, ...cols]),
      q([{ [x]: argmin(x, y), [y]: min(y) }, ...cols]),
      q([{ [x]: argmax(x, y), [y]: max(y) }, ...cols])
    )
    .orderby(cols, x);
}
