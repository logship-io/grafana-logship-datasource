import {
  LogshipColumnSchema,
  LogshipDatabaseSchema,
  LogshipTableSchema,
  SchemaMapping,
} from '../types';
import { LogshipDataSource } from '../datasource';
import { cache } from './cache';

const schemaKey = 'LogshipSchemaResolver';

export class LogshipSchemaResolver {
  constructor(private datasource: LogshipDataSource) {}

  private createCacheKey(addition: string): string {
    return `${schemaKey}.${this.datasource.id}.${addition}`;
  }

  async getDatabases(): Promise<LogshipDatabaseSchema> {
    const schema = await this.datasource.getSchema();
    return schema;
  }

  async getTablesForDatabase(): Promise<LogshipTableSchema[]> {
    const database = await this.getDatabases();
    if (!database) {
      return [];
    }
    return Object.keys(database.tables).map((key) => database.tables[key]);
  }

  async getColumnsForTable(tableName: string): Promise<LogshipColumnSchema[]> {
    const cacheKey = this.createCacheKey(`db.Default.${tableName}`);
    const mapper = this.datasource.getSchemaMapper();

    return cache(cacheKey, async () => {
      const mapping = mapper.getMappingByValue(tableName);
      const schema = await this.findSchema(tableName, mapping);

      if (!schema) {
        return [];
      }

      const dynamicColumns = schema.columns.filter((column) => column.type === 'dynamic').map(
        (column) => column.name
      );

      const schemaByColumn = await this.datasource.getDynamicSchema(
        "Default",
        mapping?.name ?? tableName,
        dynamicColumns
      );

      return schema.columns.reduce((columns: LogshipColumnSchema[], column) => {
        const schemaForDynamicColumn = schemaByColumn[column.name];

        if (!Array.isArray(schemaForDynamicColumn)) {
          columns.push(column);
          return columns;
        }

        // Handling dynamic columns
        Array.prototype.push.apply(columns, schemaForDynamicColumn);
        return columns;
      }, []);
    });
  }

  private async findSchema(
    tableName: string,
    mapping?: SchemaMapping
  ): Promise<LogshipTableSchema | undefined> {
    const [tables] = await Promise.all([
      this.getTablesForDatabase(),
    ]);

    const name = mapping?.name ?? tableName;

    const table = tables.find((t) => t.name === name);
    if (table) {
      return table;
    }
    return;
  }
}
