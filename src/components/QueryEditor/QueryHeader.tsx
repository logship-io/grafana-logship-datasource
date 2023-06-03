import React, { useState, useEffect } from 'react';
import { Button, } from '@grafana/ui';
import { EditorHeader, FlexItem, InlineSelect } from '@grafana/experimental';

import { FormatOptions, KustoQuery, LogshipDatabaseSchema } from '../../types';
import { AsyncState } from 'react-use/lib/useAsyncFn';
import { LogshipDataSource } from 'datasource';
import { SelectableValue } from '@grafana/data';
import { selectors } from 'test/selectors';
import InlineTableSelect from './InlineTableSelect';

export interface QueryEditorHeaderProps {
  datasource: LogshipDataSource;
  query: KustoQuery;
  schema: AsyncState<LogshipDatabaseSchema>;
  dirty: boolean;
  isExplore: boolean;
  setDirty: (b: boolean) => void;
  onChange: (value: KustoQuery) => void;
  onRunQuery: () => void;
}

const EDITOR_FORMATS: Array<SelectableValue<string>> = [
  { label: 'Table', value: FormatOptions.table },
  { label: 'Time Series', value: FormatOptions.timeSeries },
];

export const QueryHeader = (props: QueryEditorHeaderProps) => {
  const { query, schema, onChange, isExplore, setDirty, onRunQuery } = props;
  const formats = EDITOR_FORMATS;
  const defaultFormat = isExplore
    ? FormatOptions.table
    : FormatOptions.timeSeries;
  const [schemaLoaded, setSchemaLoaded] = useState(false);

  useEffect(() => {
    if (schema.value && !schemaLoaded) {
      setSchemaLoaded(true);
    }
  }, [schema.value, schemaLoaded]);

  useEffect(() => {
    if (!query.resultFormat) {
      onChange({ ...query, resultFormat: 'table' });
      setDirty(false);
    }
  }, [query, onChange, setDirty]);
  return (
    <EditorHeader>
      <InlineTableSelect
        query={query}
        schema={schema}
        schemaLoaded={schemaLoaded}
        onChange={onChange}
        onRunQuery={onRunQuery}
       />
      <InlineSelect
        label="Format as"
        options={formats}
        value={query.resultFormat}
        defaultValue={defaultFormat}
        onChange={({ value }) => {
          if (value === FormatOptions.timeSeries) {
            onChange({ ...query, resultFormat: 'time_series' });
          } else {
            onChange({ ...query, resultFormat: 'table' });
          }
          
        }}
      />
      <FlexItem grow={1} />
      <Button
        variant="primary"
        icon="play"
        size="sm"
        onClick={onRunQuery}
        data-testid={selectors.components.queryEditor.runQuery.button}
      >
        Run query
      </Button>
    </EditorHeader>
  );
};
