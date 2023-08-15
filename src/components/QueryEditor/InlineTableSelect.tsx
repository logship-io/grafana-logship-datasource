import React, { useState, useEffect } from 'react';
import { AsyncState } from 'react-use/lib/useAsyncFn';
import { Button, InlineFormLabel, Spinner, getSelectStyles, useStyles2 } from '@grafana/ui';
import { InlineSelect } from '@grafana/experimental';
import { KustoQuery, LogshipColumnSchema, LogshipDatabaseSchema, LogshipTableSchema, QueryResultFormat } from 'types';
import { SelectableValue } from '@grafana/data';

export interface InlineTableSelectProps {
  query: KustoQuery;
  schema: AsyncState<LogshipDatabaseSchema>;
  schemaLoaded: boolean,
  isExplore: boolean,
  onChange: (value: KustoQuery) => void;
  onRunQuery: () => void;
}

const EDITOR_FORMATS: Array<SelectableValue<QueryResultFormat>> = [
  { label: 'Table', value: 'table' },
  { label: 'Time Series', value: 'time_series' },
];

const InlineTableSelect = (props: InlineTableSelectProps) => {
  const { query, schema, schemaLoaded, onChange, onRunQuery, isExplore } = props;
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<LogshipTableSchema | undefined>(undefined)
  const [lastPreviewFormat, setLastPreviewFormat] = useState<QueryResultFormat | undefined>(undefined);
  
  const [options, setOptions] = useState<LogshipTableSchema[]>([]);
  const styles = useStyles2(getSelectStyles);
  
  const formats = EDITOR_FORMATS;
  const defaultFormat = isExplore
    ? 'table'
    : 'time_series';
  
  const tableDefaultQuery = (t: LogshipTableSchema) => {
    let cols: LogshipColumnSchema[] = [];
    let timestamp = t.columns.find(c => c.type === 'DateTime');
    if (timestamp !== undefined) {
        let temp = [timestamp];
        t.columns.forEach(ct => {
            if (timestamp!.name !== ct.name) {
                temp.push(ct)
            }
        });
        cols = temp;
    } else {
        cols = t.columns;
    }

    let s = t.name + '\n';
    if (timestamp !== undefined) {
      s += '| where timestamp > $__timeFrom() and timestamp < $__timeTo()\n'
    }

    return s 
        + '| project ' +  cols.map(c => c.name).join(', ') + '\n'
        + '| limit 100\n';
  };

  const onProjectTable = () => {
    if (selectedTable) {
      const q = tableDefaultQuery(selectedTable)
      if (query.query === q && lastPreviewFormat === query.resultFormat) {
        return;
      }

      setLastPreviewFormat(query.resultFormat);
      onChange({...query, query: q, resultFormat: query.resultFormat })
      onRunQuery();
    }
  };

  useEffect(() => {
    if (loading && schemaLoaded && schema.value) {
      setOptions(schema.value!.tables)
      setLoading(false);
    }
  }, [schema.value, schemaLoaded, loading]);

  return loading ? (
    <div className={styles.valueContainer}>
      <InlineFormLabel>Loading Tables... <Spinner /></InlineFormLabel>
    </div>
  ) : (
  <div className={styles.valueContainerMulti}>
    <InlineSelect
      label="Tables"
      isSearchable={true}
      options={options.map((option) => ({
        label: option.name,
        value: option,
      }))}
      onChange={(s) => { setSelectedTable(s.value) }}
    />
    <InlineSelect
        label="Format as"
        options={formats}
        value={query.resultFormat}
        defaultValue={defaultFormat}
        onChange={({ value }) => {
          onChange({ ...query, resultFormat: value || 'table' });
        }}
      />
    <Button
      variant="secondary"
      icon="table"
      disabled={selectedTable === undefined}
      size='xs'
      onClick={onProjectTable}
      tooltip='Project all columns for the selected table with a limited result set.'
      >
        Preview
    </Button>
  </div>
)
};

export default InlineTableSelect;
