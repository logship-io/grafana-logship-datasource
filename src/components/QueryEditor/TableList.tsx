import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { Label, List, useTheme2 } from '@grafana/ui';
import React from 'react';
import { LogshipDataSourceOptions as LogshipDataSourceOptions, KustoQuery, LogshipDatabaseSchema, LogshipTableSchema, EditorMode, LogshipColumnSchema } from 'types';
import { LogshipDataSource } from '../../datasource';

type Props = QueryEditorProps<LogshipDataSource, KustoQuery, LogshipDataSourceOptions>;

interface TableListProps extends Props {
  schema?: LogshipDatabaseSchema;
  table?: SelectableValue<string>;
}

export const TableList: React.FC<TableListProps> = ({
    schema,
    query,
    onChange,
  }) => {
  const theme = useTheme2();
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

    return t.name + '\n'
        + '| where timestamp > ago(1h)\n'
        + '| project ' +  cols.map(c => c.name).join(', ') + '\n'
        + '| limit 100\n';
  };

  const tableRenderer = (t: LogshipTableSchema) => {
    const borderColor = theme.colors.text.secondary;
    return <>
        <li style={{
            marginBottom: '5px',
            borderBottom: '1px inset',
            borderColor: borderColor,
            cursor: 'pointer',
        }} onClick={() => {
            query = {
                ...query,
                query: tableDefaultQuery(t),
                rawMode: true,
                querySource: EditorMode.Raw,
            };
            onChange(query);
        }}>{t.name}</li>
    </>;
  };

  if (schema === undefined) {
    return <>
        <Label>No tables loaded. You may need to refresh the page.</Label>
    </>;
  }

  return (
    <>
    { <List items={schema.tables} renderItem={tableRenderer} /> }
    </>
  );
};


