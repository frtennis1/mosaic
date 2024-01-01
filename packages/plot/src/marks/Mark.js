import { MosaicClient } from '@uwdata/mosaic-core';
import { Query, Ref, column, isParamLike } from '@uwdata/mosaic-sql';
import { isColor } from './util/is-color.js';
import { isConstantOption } from './util/is-constant-option.js';
import { isSymbol } from './util/is-symbol.js';
import { toDataArray } from './util/to-data-array.js';
import { Transform } from '../symbols.js';

const isColorChannel = channel => channel === 'stroke' || channel === 'fill';
const isSymbolChannel = channel => channel === 'symbol';
const isFieldObject = (channel, field) => {
  return channel !== 'sort' && channel !== 'tip'
    && field != null && !Array.isArray(field);
};
const fieldEntry = (channel, field) => ({
  channel,
  field,
  as: field instanceof Ref ? field.column : channel
});
const valueEntry = (channel, value) => ({ channel, value });

// checks if a data source is an explicit array of values
// as opposed to a database table refernece
export const isDataArray = source => Array.isArray(source);

export class Mark extends MosaicClient {
  constructor(type, source, encodings, reqs = {}) {
    super(source?.options?.filterBy);
    this.type = type;
    this.reqs = reqs;

    this.source = source;
    if (isDataArray(this.source)) {
      this.data = this.source;
    }

    const channels = this.channels = [];
    const detail = this.detail = new Set;
    const params = this.params = new Set;

    const process = (channel, entry) => {
      const type = typeof entry;
      if (channel === 'channels') {
        for (const name in entry) {
          detail.add(name);
          process(name, entry[name]);
        }
      } else if (type === 'function' && entry[Transform]) {
        const enc = entry(this, channel);
        for (const key in enc) {
          process(key, enc[key]);
        }
      } else if (type === 'string') {
        if (
          isConstantOption(channel) ||
          isColorChannel(channel) && isColor(entry) ||
          isSymbolChannel(channel) && isSymbol(entry)
        ) {
          // interpret constants and color/symbol names as values, not fields
          channels.push(valueEntry(channel, entry));
        } else {
          channels.push(fieldEntry(channel, column(entry)));
        }
      } else if (isParamLike(entry)) {
        if (Array.isArray(entry.columns)) {
          channels.push(fieldEntry(channel, entry));
          params.add(entry);
        } else {
          const c = valueEntry(channel, entry.value);
          channels.push(c);
          entry.addEventListener('value', value => {
            c.value = value;
            return this.update();
          });
        }
      } else if (type === 'object' && isFieldObject(channel, entry)) {
        channels.push(fieldEntry(channel, entry));
      } else if (entry !== undefined) {
        channels.push(valueEntry(channel, entry));
      }
    };

    for (const channel in encodings) {
      process(channel, encodings[channel]);
    }
  }

  setPlot(plot, index) {
    this.plot = plot;
    this.index = index;
    plot.addParams(this, this.params);
    if (this.source?.table) this.queryPending();
  }

  hasOwnData() {
    return this.source == null || isDataArray(this.source);
  }

  hasFieldInfo() {
    return !!this._fieldInfo;
  }

  channel(channel) {
    return this.channels.find(c => c.channel === channel);
  }

  channelField(channel, { exact } = {}) {
    const c = exact
      ? this.channel(channel)
      : this.channels.find(c => c.channel.startsWith(channel));
    return c?.field ? c : null;
  }

  fields() {
    if (this.hasOwnData()) return null;

    const { source: { table }, channels, reqs } = this;
    const fields = new Map;
    for (const { channel, field } of channels) {
      if (!field) continue;
      const stats = field.stats?.stats || [];
      const key = field.stats?.column ?? field;
      const entry = fields.get(key) ?? fields.set(key, new Set).get(key);
      stats.forEach(s => entry.add(s));
      reqs[channel]?.forEach(s => entry.add(s));
    }

    return Array.from(fields, ([c, s]) => ({ table, column: c, stats: s }));
  }

  fieldInfo(info) {
    const lookup = Object.fromEntries(info.map(x => [x.column, x]));
    for (const entry of this.channels) {
      const { field } = entry;
      if (field) {
        Object.assign(entry, lookup[field.stats?.column ?? field]);
      }
    }
    this._fieldInfo = true;
    return this;
  }

  query(filter = []) {
    if (this.hasOwnData()) return null;
    const { channels, source: { table } } = this;
    return markQuery(channels, table, filter);
  }

  queryPending() {
    this.plot.pending(this);
    return this;
  }

  queryResult(data) {
    this.data = toDataArray(data);
    return this;
  }

  update() {
    return this.plot.update(this);
  }

  plotSpecs() {
    const { type, data, detail, channels } = this;
    const options = {};
    const side = {};
    for (const c of channels) {
      const obj = detail.has(c.channel) ? side : options;
      obj[c.channel] = channelOption(c)
    }
    if (detail.size) options.channels = side;
    return [{ type, data, options }];
  }
}

/**
 * Helper method for setting a channel option in a Plot specification.
 * Checks if a constant value or a data field is needed.
 * Also avoids misinterpretation of data values as color names.
 * @param {*} c a visual encoding channel spec
 * @returns the Plot channel option
 */
export function channelOption(c) {
  // use a scale override for color channels to sidestep
  // https://github.com/observablehq/plot/issues/1593
  return Object.hasOwn(c, 'value') ? c.value
    : isColorChannel(c.channel) ? { value: c.as, scale: 'color' }
    : c.as;
}

/**
 * Default query construction for a mark.
 * Tracks aggregates by checking fields for an aggregate flag.
 * If aggregates are found, groups by all non-aggregate fields.
 * @param {*} channels array of visual encoding channel specs.
 * @param {*} table the table to query.
 * @param {*} skip an optional array of channels to skip.
 *  Mark subclasses can skip channels that require special handling.
 * @returns a Query instance
 */
export function markQuery(channels, table, filter, skip = []) {
  const q_with = Query.from({ source: table }).select('*');
  const q = Query.from('__mosaicTemp');
  const dims = new Set;
  let aggr = false;

  for (const c of channels) {
    const { channel, field, as } = c;
    if (skip.includes(channel)) continue;

    if (channel === 'orderby') {
      q.orderby(c.value);
    } else if (field) {
      if (field.aggregate) {
        aggr = true;
        q.select({ [as]: field });
      } else {
        if (dims.has(as)) continue;
        dims.add(as);
	q_with.select({ [as]: field });
        q.select({ [as]: as });
      }
    }
  }
  q.with({__mosaicTemp: q_with.where(filter)});
  if (aggr) {
    q.groupby(Array.from(dims));
  }

  return q;
}
