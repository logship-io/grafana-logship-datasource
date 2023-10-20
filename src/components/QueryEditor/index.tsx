import { QueryEditorProps } from '@grafana/data';
import { QueryEditor as NewQueryEditor } from './QueryEditor';
import { LogshipDataSource } from 'datasource';
import React from 'react';
import { LogshipDataSourceOptions, KustoQuery } from 'types';
import { config } from '@grafana/runtime';

type Props = QueryEditorProps<LogshipDataSource, KustoQuery, LogshipDataSourceOptions>;

export const QueryEditor: React.FC<Props> = (props) => {
  console.log(config.bootData.user);

  return <NewQueryEditor {...props} />;
};
