

import { DataSourceJsonData, DataSourceSettings } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

const packageJson = require('../package.json');

export type QuerySource = 'raw' | 'schema' | 'autocomplete' | 'variable';
export type QueryResultFormat = 'time_series' | 'table';

export interface KustoQuery extends DataQuery {
  query: string;
  resultFormat: QueryResultFormat;
  querySource: QuerySource;
  pluginVersion: string;
}

export const defaultQuery: Pick<KustoQuery, 'query' | 'querySource' | 'pluginVersion'> = {
  query: '',
  querySource: 'raw',
  pluginVersion: packageJson.version,
};

export interface SchemaMapping {
  type: SchemaMappingType;
  value: string;
  name: string;
  database: string;
  displayName: string;
}

export interface SchemaMappingOption {
  label: string;
  value: string;
  type: SchemaMappingType;
  name: string;
  database: string;
  input?: LogshipFunctionInputParameterSchema[];
}

export enum SchemaMappingType {
  function = 'function',
  table = 'table',
  materializedView = 'materializedView',
}

export interface LogshipDataSourceOptions extends DataSourceJsonData {
  defaultDatabase: string;
  minimalCache: number;
  queryTimeout: string;
  cacheMaxAge: string;
  dynamicCaching: boolean;
  useSchemaMapping: boolean;
  schemaMappings?: Array<Partial<SchemaMapping>>;
  enableUserTracking: boolean;
  clusterUrl: string;
  authType: string;
  username: string;
  clientId: string;
  tokenEndpoint: string | undefined;
  oauthPassThru?: boolean;
  scope?: string;
}

export interface LogshipDataSourceSecureOptions {
  pass: string | undefined;
  clientSecret: string | undefined;
}

export interface LogshipDatabaseSchema {
  name: string;
  tables: LogshipTableSchema[];
}

export interface LogshipTableSchema {
  name: string;
  columns: LogshipColumnSchema[];
}

export interface LogshipColumnSchema {
  name: string;
  type: string;
}

export interface LogshipFunctionSchema {
  Body: string;
  FunctionKind: string;
  Name: string;
  InputParameters: LogshipFunctionInputParameterSchema[];
  OutputColumns: LogshipColumnSchema[];
  DocString?: string;
}

export interface LogshipFunctionInputParameterSchema extends LogshipColumnSchema {}

export type LogshipSchemaDefinition = string | LogshipSchemaDefinition[] | { [k: string]: LogshipSchemaDefinition };
export type LogshipDataSourceSettings = DataSourceSettings<LogshipDataSourceOptions, LogshipDataSourceSecureOptions>;
