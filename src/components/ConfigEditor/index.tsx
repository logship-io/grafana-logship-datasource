import React, { useCallback } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import ConfigHelp from './ConfigHelp';
import { LogshipDataSourceOptions, LogshipDataSourceSecureOptions } from 'types';
import ConnectionConfig from './ConnectionConfig';
import QueryConfig from './QueryConfig';
import TrackingConfig from './TrackingConfig';

export interface ConfigEditorProps
  extends DataSourcePluginOptionsEditorProps<LogshipDataSourceOptions, LogshipDataSourceSecureOptions> {}

const ConfigEditor: React.FC<ConfigEditorProps> = (props) => {
  const { options, onOptionsChange } = props;
  const { jsonData } = options;

  const updateJsonData = useCallback(
    <T extends keyof LogshipDataSourceOptions>(fieldName: T, value: LogshipDataSourceOptions[T]) => {
      onOptionsChange({
        ...options,
        jsonData: {
          ...jsonData,
          [fieldName]: value,
        },
      });
    },
    [jsonData, onOptionsChange, options]
  );

  return (
    <div data-testid="logship-datasource-config-editor">
      <ConfigHelp />

      <ConnectionConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />

      {/* <h3 className="page-heading">Authentication</h3> */}

      <QueryConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />
      <TrackingConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />
    </div>
  );
};

export default ConfigEditor;
