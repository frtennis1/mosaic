import { Highlight } from '../selections/Highlight.js';
import { PointSelection } from '../selections/Point.js';
import { Interval1DSelection } from '../selections/Interval1D.js';
import { Interval2DSelection } from '../selections/Interval2D.js';
import { PanZoomSelection } from '../selections/PanZoom.js';

function point(signal, channels) {
  return plot => {
    const mark = plot.marks[plot.marks.length - 1];
    plot.addSelection(new PointSelection(mark, signal, channels));
  };
}

export function select({ as, channels }) {
  return point(as, channels);
}

export function selectX({ as }) {
  return point(as, ['x']);
}

export function selectY({ as }) {
  return point(as, ['y']);
}

export function selectColor({ as }) {
  return point(as, ['color']);
}

function interval1d(channel, signal, field) {
  return plot => {
    const mark = plot.marks[plot.marks.length - 1];
    plot.addSelection(new Interval1DSelection(mark, channel, signal, field));
  };
}

function interval2d(signal, xfield, yfield) {
  return plot => {
    const mark = plot.marks[plot.marks.length - 1];
    plot.addSelection(new Interval2DSelection(mark, signal, xfield, yfield));
  };
}

export function intervalX({ as, field }) {
  return interval1d('x', as, field);
}

export function intervalY({ as, field }) {
  return interval1d('y', as, field);
}

export function intervalXY({ as, xfield, yfield }) {
  return interval2d(as, xfield, yfield);
}

export function highlight(signal, channels) {
  return plot => {
    const mark = plot.marks[plot.marks.length - 1];
    plot.addSelection(new Highlight(mark, signal, channels));
  };
}

function zoom(options) {
  return plot => {
    const mark = plot.marks[plot.marks.length - 1];
    plot.addSelection(new PanZoomSelection(mark, options));
  };
}

export function pan(options = {}) {
  return zoom({ ...options, zoom: false });
}

export function panX(options = {}) {
  return zoom({ ...options, zoom: false, pany: false });
}

export function panY(options = {}) {
  return zoom({ ...options, zoom: false, panx: false });
}

export function panZoom(options = {}) {
  return zoom(options);
}

export function panZoomX(options = {}) {
  return zoom({ ...options, pany: false });
}

export function panZoomY(options = {}) {
  return zoom({ ...options, panx: false });
}
