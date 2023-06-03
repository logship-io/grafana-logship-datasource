import {
  CoreApp,
  DataFrame,
  DataQueryRequest,
  DataSourceInstanceSettings,
  MetricFindValue,
  ScopedVar,
  ScopedVars,
} from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { firstFieldToMetricFindValue } from 'common/responseHelpers';
import { QueryEditorPropertyType } from './schema/types';
import { map } from 'lodash';
import { cache } from 'schema/cache';
import { toPropertyType } from 'schema/mapper';
import interpolateKustoQuery from './query_builder';
import { ResponseParser } from './response_parser';
import {
  LogshipColumnSchema,
  LogshipDataSourceOptions as LogshipDataSourceOptions,
  LogshipSchemaDefinition,
  defaultQuery,
  KustoQuery,
  LogshipDatabaseSchema,
} from './types';
import { LogshipSchemaMapper } from 'schema/LogshipSchemaMapper';

export class LogshipDataSource extends DataSourceWithBackend<KustoQuery, LogshipDataSourceOptions> {
  private templateSrv: TemplateSrv;
  private schemaMapper: LogshipSchemaMapper;

  constructor(instanceSettings: DataSourceInstanceSettings<LogshipDataSourceOptions>) {
    super(instanceSettings);

    const useSchemaMapping = instanceSettings.jsonData.useSchemaMapping ?? false;
    const schemaMapping = instanceSettings.jsonData.schemaMappings ?? [];

    //this.backendSrv = getBackendSrv();
    this.templateSrv = getTemplateSrv();
    //this.url = instanceSettings.url;
    this.schemaMapper = new LogshipSchemaMapper(useSchemaMapping, schemaMapping);
    this.getSchemaMapper = this.getSchemaMapper.bind(this);
  }

  getDefaultQuery(app: CoreApp): Partial<KustoQuery> {
    return {
       query: '',
       queryType: "raw"
    };
  }

  /**
   * Return true if it should execute
   */
  filterQuery(target: KustoQuery): boolean {
    if (target.hide || !target.query || target.query.trim() === '') {
      return false;
    }

    return true;
  }

  applyTemplateVariables(target: KustoQuery, scopedVars: ScopedVar): Record<string, any> {
    const query = interpolateKustoQuery(
      target.query,
      (val: string) => this.templateSrv.replace(val, scopedVars, this.interpolateVariable),
      scopedVars as ScopedVars
    );

    return {
      ...target,
      query,
    };
  }

  async metricFindQuery(query: string, optionalOptions: any): Promise<MetricFindValue[]> {
    const q = this.buildQuery(query, optionalOptions, 'default')
    return this.query({
      targets: [
        {
          ...q,
          querySource: 'variable',
        },
      ],
    } as DataQueryRequest<KustoQuery>).toPromise()
      .then((response) => {
        if (response?.data && response.data.length) {
          return firstFieldToMetricFindValue(response.data[0]);
        }
        return [];
      })
      .catch((err) => {
        console.log('There was an error', err);
        throw err;
      });
  }

  async getResource<T = unknown>(path: string): Promise<any> {
    return super.getResource(path);
  }

  async getSchema(refreshCache = false): Promise<LogshipDatabaseSchema> {
    return await cache<LogshipDatabaseSchema>(
      `${this.id}.schema.overview`,
      () => this.getResource('schema').then(new ResponseParser().parseSchemaResult),
      refreshCache
    );
  }

  async getFunctionSchema(database: string, targetFunction: string): Promise<LogshipColumnSchema[]> {
    const queryParts: string[] = [];
    const take = 'take 50000';

    queryParts.push(targetFunction);
    queryParts.push(take);
    queryParts.push('getschema');

    const query = this.buildQuery(queryParts.join('\n | '), {}, database);
    const response = await this.query({
      targets: [
        {
          ...query,
          querySource: 'schema',
        },
      ],
    } as DataQueryRequest<KustoQuery>).toPromise();

    return functionSchemaParser(response?.data as DataFrame[]);
  }

  getVariables() {
    return this.templateSrv.getVariables().map((v) => `$${v.name}`);
  }

  // Used for annotations and template variables
  private buildQuery(query: string, options: any, database: string): KustoQuery {
    if (!options) {
      options = {};
    }
    if (!options.hasOwnProperty('scopedVars')) {
      options.scopedVars = {};
    }

    const interpolatedQuery = interpolateKustoQuery(
      query,
      (val: string) => this.templateSrv.replace(val, options.scopedVars, this.interpolateVariable),
      options.scopedVars
    );

    return {
      ...defaultQuery,
      refId: `logship-${interpolatedQuery}`,
      resultFormat: 'table',
      query: interpolatedQuery,
    };
  }

  interpolateVariable(value: any, variable) {
    if (typeof value === 'string') {
      if (variable.multi || variable.includeAll) {
        return "'" + value + "'";
      } else {
        return value;
      }
    }

    if (typeof value === 'number') {
      return value;
    }

    const quotedValues = map(value, (val) => {
      if (typeof value === 'number') {
        return value;
      }

      return "'" + escapeSpecial(val) + "'";
    });
    return quotedValues.filter((v) => v !== "''").join(',');
  }

  getSchemaMapper(): LogshipSchemaMapper {
    return this.schemaMapper;
  }
}

const functionSchemaParser = (frames: DataFrame[]): LogshipColumnSchema[] => {
  const result: LogshipColumnSchema[] = [];
  const fields = frames[0].fields;

  if (!fields) {
    return result;
  }

  const nameIndex = fields.findIndex((f) => f.name === 'Name');
  const typeIndex = fields.findIndex((f) => f.name === 'Type');

  if (nameIndex < 0 || typeIndex < 0) {
    return result;
  }

  for (const frame of frames) {
    for (let index = 0; index < frame.length; index++) {
      result.push({
        name: frame.fields[nameIndex].values.get(index),
        type: frame.fields[typeIndex].values.get(index),
      });
    }
  }

  return result;
};

const recordSchemaArray = (name: string, types: LogshipSchemaDefinition[], result: LogshipColumnSchema[]) => {
  // If a field can have different types (e.g. long and double)
  // we select double if it exists as it's the one with more precision, otherwise we take the first
  const defaultType = types.find((t) => typeof t === 'string' && (t === 'double' || t === 'real')) || types[0];
  if (
    types.length > 1 &&
    !types.every((t) => typeof t === 'string' && toPropertyType(t) === QueryEditorPropertyType.Number)
  ) {
    // If there is more than one type and not all types are numbers
    console.warn(`schema ${name} may contain different types, assuming ${defaultType}`);
  }
  if (typeof defaultType === 'object') {
    recordSchema(name, types[0], result);
  } else {
    result.push({ name: name, type: defaultType });
  }
};

const recordSchema = (columnName: string, schema: LogshipSchemaDefinition, result: LogshipColumnSchema[]) => {
  if (!schema) {
    console.log('error with column', columnName);
    return;
  }

  // Case: schema is a single type: e.g. 'long'
  if (typeof schema === 'string') {
    result.push({
      name: columnName,
      type: schema,
    });
    return;
  }

  // Case: schema is a multiple type: e.g. ['long', 'double']
  if (Array.isArray(schema)) {
    recordSchemaArray(columnName, schema, result);
    return;
  }

  // Case: schema is an object: e.g. {"a": "long"}
  for (const name of Object.keys(schema)) {
    // Generate a valid accessor for a dynamic type
    const key = `${columnName}["${name}"]`;
    const subSchema = schema[name];
    recordSchema(key, subSchema, result);
  }
};

export const escapeSpecial = (value: string): string => {
  return value.replace(/\'/gim, "\\'");
};

export const sortStartsWithValuesFirst = (arr: string[], searchText: string) => {
  const text = searchText.toLowerCase();

  arr.sort((a, b) => {
    if (!a && !b) {
      return 0;
    }

    if (!a && b) {
      return -1;
    }

    if (a && !b) {
      return 1;
    }

    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();

    if (aLower.startsWith(text) && bLower.startsWith(text)) {
      return 0;
    }

    if (aLower.startsWith(text) && !bLower.startsWith(text) && bLower.includes(text, 1)) {
      return -1;
    }

    if (aLower.startsWith(text) && !bLower.includes(text, 1)) {
      return -1;
    }

    if (!aLower.startsWith(text) && aLower.includes(text, 1) && bLower.startsWith(text)) {
      return 1;
    }

    if (!aLower.includes(text, 1) && bLower.startsWith(text)) {
      return 1;
    }

    if (aLower.includes(text, 1) && !bLower.includes(text, 1)) {
      return -1;
    }

    if (!aLower.includes(text, 1) && bLower.includes(text, 1)) {
      return 1;
    }

    return 0;
  });

  return arr;
};
