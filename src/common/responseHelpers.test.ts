import { FieldType, toDataFrame } from '@grafana/data';
import { firstFieldToMetricFindValue } from './responseHelpers';

describe('firstStringFieldToMetricFindValue', () => {
  it('should find a string field value', () => {
    const frame = toDataFrame({
      fields: [
        {
          type: FieldType.string,
          values: ['foo'],
        },
      ],
    });
    expect(firstFieldToMetricFindValue(frame)).toEqual([{ text: 'foo' }]);
  });
});
