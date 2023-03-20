import { columnsToDefinition } from './mapper';

describe('columnsToDefinition', () => {
  it('should convert a column to a definition', () => {
    expect(columnsToDefinition([{ Name: 'foo', Type: 'string' }])).toEqual([
      {
        label: 'foo',
        type: 'string',
        value: 'foo',
      },
    ]);
  });
});
