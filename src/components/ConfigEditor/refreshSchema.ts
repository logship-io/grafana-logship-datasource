import { LogshipDataSource } from 'datasource';
import { SchemaMappingOption, SchemaMappingType } from '../../types';

export interface Schema {
  databases: Array<{
    label: string;
    value: string;
  }>;
  schemaMappingOptions: SchemaMappingOption[];
}

export async function refreshSchema(datasource: LogshipDataSource): Promise<Schema> {
  const databases: Array<{ label: string; value: string }> = [];
  const schemaMappingOptions: SchemaMappingOption[] = [];

  const schema = await datasource.getSchema();
  for (const database of [schema]) {
    databases.push({
      label: database.Name,
      value: database.Name,
    });

    for (const table of Object.values(database.Tables)) {
      schemaMappingOptions.push({
        type: SchemaMappingType.table,
        label: `${database.Name}/tables/${table.Name}`,
        value: table.Name,
        name: table.Name,
        database: database.Name,
      });
    }
  }

  return { databases, schemaMappingOptions };
}
