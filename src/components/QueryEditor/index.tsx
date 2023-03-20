import { QueryEditorProps } from '@grafana/data';
import { QueryEditor as NewQueryEditor } from './QueryEditor';
import { LogshipDataSource } from 'datasource';
import React from 'react';
import { LogshipDataSourceOptions, KustoQuery } from 'types';

type Props = QueryEditorProps<LogshipDataSource, KustoQuery, LogshipDataSourceOptions>;

export const QueryEditor: React.FC<Props> = (props) => {
  return <NewQueryEditor {...props} />;
};
