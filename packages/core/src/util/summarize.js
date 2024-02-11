import { Query, count, isNull, max, min, sum } from '@uwdata/mosaic-sql';

export const Count = 'count';
export const Nulls = 'nulls';
export const Max = 'max';
export const Min = 'min';
export const Distinct = 'distinct';
export const Sum = 'sum';

export const Stats = { Count, Nulls, Max, Min, Distinct };

export const statMap = {
  [Count]: count,
  [Distinct]: column => count(column).distinct(),
  [Max]: max,
  [Min]: min,
  [Sum]: sum,
  [Nulls]: column => count().where(isNull(column))
};

export function summarize({ table, column }, stats) {
  return Query
    .from(table)
    .select(stats.map(s => [s, statMap[s](column)]));
}
