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
      label: database.name,
      value: database.name,
    });

    for (const table of Object.values(database.tables)) {
      schemaMappingOptions.push({
        type: SchemaMappingType.table,
        label: `${database.name}/tables/${table.name}`,
        value: table.name,
        name: table.name,
        database: database.name,
      });
    }
  }

  return { databases, schemaMappingOptions };
}
