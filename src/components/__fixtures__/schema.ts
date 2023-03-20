import { LogshipDatabaseSchema } from 'types';

export default function createMockSchema(overrides?: LogshipDatabaseSchema) {
  return {
    Name: 'testdb',
    Tables: [
      {
        Name: 'testtable',
        OrderedColumns: [{ Name: 'column', Type: 'string' }]
      }
    ],
  };
}
