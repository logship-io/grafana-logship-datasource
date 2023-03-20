import { QueryEditorPropertyDefinition, QueryEditorPropertyType } from './types';
import { LogshipDatabaseSchema, SchemaMapping, SchemaMappingType } from '../types';

// Mappings in the jsonData are partials - they might have undefined fields. We want to ignore them.
const validMapping = (mapping: Partial<SchemaMapping>): mapping is SchemaMapping => {
  return (
    Object.values(mapping).every((v) => v !== undefined) &&
    !!mapping.database &&
    !!mapping.displayName &&
    !!mapping.name &&
    !!mapping.type &&
    !!mapping.value
  );
};

export class LogshipSchemaMapper {
  private mappingsByDatabase: Record<string, SchemaMapping[]> = {};
  private displayNameToMapping: Record<string, SchemaMapping> = {};
  private nameToMapping: Record<string, SchemaMapping> = {};
  private valueToMapping: Record<string, SchemaMapping> = {};

  constructor(private enabled = false, mappings: Array<Partial<SchemaMapping>> = []) {
    for (const mapping of mappings) {
      // Skip mappings with empty values
      if (!validMapping(mapping)) {
        continue;
      }

      if (!Array.isArray(this.mappingsByDatabase[mapping.database])) {
        this.mappingsByDatabase[mapping.database] = [];
      }
      this.mappingsByDatabase[mapping.database].push(mapping);
      this.displayNameToMapping[mapping.displayName] = mapping;
      this.nameToMapping[mapping.name] = mapping;
      this.valueToMapping[mapping.value] = mapping;
    }
  }

  getMappingByValue(value?: string): SchemaMapping | undefined {
    if (!this.enabled || !value) {
      return;
    }
    return this.valueToMapping[value];
  }

  getTableOptions(database: LogshipDatabaseSchema): QueryEditorPropertyDefinition[] {
    if (!database || !database.Tables) {
      return [];
    }

    const mappings = this.mappingsByDatabase["Default"];
    return filterAndMapToDefinition(database, mappings);
  }
}

const filterAndMapToDefinition = (
  database: LogshipDatabaseSchema,
  mappings: SchemaMapping[] = []
): QueryEditorPropertyDefinition[] => {
  return mappings.reduce((all: QueryEditorPropertyDefinition[], mapping) => {
    if (mapping.type === SchemaMappingType.table) {
      if (database.Tables[mapping.name]) {
        console.log('if (database.Tables[mapping.name])', mapping);
        all.push(mappingToDefinition(mapping));
        return all;
      }
    }

    return all;
  }, []);
};

const mappingToDefinition = (mapping: SchemaMapping): QueryEditorPropertyDefinition => {
  return {
    type: QueryEditorPropertyType.String,
    label: mapping.displayName,
    value: mapping.value,
  };
};
