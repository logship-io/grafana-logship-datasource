import { DataFrame, MetricFindValue } from '@grafana/data';

export function firstFieldToMetricFindValue(frame: DataFrame): MetricFindValue[] {
  const values: MetricFindValue[] = [];
  const field = frame.fields.at(0);
  if (field) {
    for (let i = 0; i < field.values.length; i++) {
      values.push({ text: field.values.get(i) });
    }
  }
  return values;
}
