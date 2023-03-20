import { DataSourceJsonData, DataSourceSettings } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

import {
  QueryEditorColumnsExpression,
  QueryEditorExpressionType,
  QueryEditorGroupByExpressionArray,
  QueryEditorOperatorExpression,
  QueryEditorPropertyExpression,
  QueryEditorReduceExpressionArray,
  QueryEditorWhereArrayExpression,
} from './components/LegacyQueryEditor/editor/expressions';

const packageJson = require('../package.json');

export interface QueryExpression {
  from?: QueryEditorPropertyExpression;
  columns?: QueryEditorColumnsExpression;
  where: QueryEditorWhereArrayExpression;
  reduce: QueryEditorReduceExpressionArray;
  groupBy: QueryEditorGroupByExpressionArray;
  timeshift?: QueryEditorPropertyExpression;
}

type QuerySource = 'raw' | 'schema' | 'autocomplete' | 'visual';
export interface KustoQuery extends DataQuery {
  query: string;
  database: string;
  alias?: string;
  resultFormat: string;
  expression: QueryExpression;
  rawMode?: boolean;
  querySource: QuerySource;
  pluginVersion: string;
}

export interface AutoCompleteQuery {
  database: string;
  search: QueryEditorOperatorExpression;
  expression: QueryExpression;
  index?: string;
}

export enum EditorMode {
  Visual = 'visual',
  Raw = 'raw',
}

export const defaultQuery: Pick<KustoQuery, 'query' | 'expression' | 'querySource' | 'pluginVersion'> = {
  query: '',
  querySource: EditorMode.Raw,
  expression: {
    where: {
      type: QueryEditorExpressionType.And,
      expressions: [],
    },
    groupBy: {
      type: QueryEditorExpressionType.And,
      expressions: [],
    },
    reduce: {
      type: QueryEditorExpressionType.And,
      expressions: [],
    },
  },
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
  defaultEditorMode: EditorMode;
  queryTimeout: string;
  dataConsistency: string;
  cacheMaxAge: string;
  dynamicCaching: boolean;
  useSchemaMapping: boolean;
  schemaMappings?: Array<Partial<SchemaMapping>>;
  enableUserTracking: boolean;
  clusterUrl: string;
}

export interface LogshipDataSourceSecureOptions {}

export interface LogshipDatabaseSchema {
  Name: string;
  Tables: LogshipTableSchema[];
}

export interface LogshipTableSchema {
  Name: string;
  Columns: LogshipColumnSchema[];
}

export interface LogshipColumnSchema {
  Name: string;
  Type: string;
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

export enum FormatOptions {
  table = 'table',
  timeSeries = 'time_series',
  logshipTimeSeries = 'time_series_logship_series',
}

export type LogshipDataSourceSettings = DataSourceSettings<LogshipDataSourceOptions, LogshipDataSourceSecureOptions>;
