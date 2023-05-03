import { SelectableValue } from '@grafana/data';

import { QueryEditorPropertyDefinition, QueryEditorPropertyType } from './types';
import { LogshipDatabaseSchema, LogshipTableSchema } from '../types';

export const tableToDefinition = (table: LogshipTableSchema): QueryEditorPropertyDefinition => {
  return {
    label: table.name,
    value: table.name,
    type: QueryEditorPropertyType.String,
  };
};

export const tableToSelectable = (table: LogshipTableSchema): SelectableValue<string> => {
  return {
    label: table.name,
    value: table.name,
  };
};

export const databaseToDefinition = (database: LogshipDatabaseSchema): QueryEditorPropertyDefinition => {
  return {
    value: database.name,
    label: database.name,
    type: QueryEditorPropertyType.String,
  };
};

export const databasesToDefinition = (databases: LogshipDatabaseSchema[]): QueryEditorPropertyDefinition[] => {
  if (!Array.isArray(databases)) {
    return [];
  }
  return databases.map(databaseToDefinition);
};

export const tablesToDefinition = (tables: LogshipTableSchema[]): QueryEditorPropertyDefinition[] => {
  if (!Array.isArray(tables)) {
    return [];
  }

  return tables.map((table) => ({
    value: table.name,
    label: table.name,
    type: QueryEditorPropertyType.String,
  }));
};

export const toPropertyType = (kustoType: string): QueryEditorPropertyType => {
  switch (kustoType) {
    case 'real':
    case 'Int32':
    case 'UInt64':
    case 'Double':
    case 'Decimal':
      return QueryEditorPropertyType.Number;
    case 'Datetime':
      return QueryEditorPropertyType.DateTime;
    case 'Boolean':
      return QueryEditorPropertyType.Boolean;
    case 'TimeSpan':
      return QueryEditorPropertyType.TimeSpan;
    default:
      return QueryEditorPropertyType.String;
  }
};
