import { DataSourcePlugin } from '@grafana/data';
import { LogshipDataSource } from './datasource';
import { QueryEditor } from './components/QueryEditor';
import { KustoQuery, LogshipDataSourceOptions, LogshipDataSourceSecureOptions } from './types';
import ConfigEditor from 'components/ConfigEditor';
import EditorHelp from 'components/QueryEditor/EditorHelp';

export const plugin = new DataSourcePlugin<LogshipDataSource, KustoQuery, LogshipDataSourceOptions, LogshipDataSourceSecureOptions>(
  LogshipDataSource
)
  .setConfigEditor(ConfigEditor)
  .setQueryEditorHelp(EditorHelp)
  .setQueryEditor(QueryEditor);
