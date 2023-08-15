import React, { useCallback } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import ConfigHelp from './ConfigHelp';
import { LogshipDataSourceOptions, LogshipDataSourceSecureOptions } from 'types';
import ConnectionConfig from './ConnectionConfig';
// import QueryConfig from './QueryConfig';
import TrackingConfig from './TrackingConfig';
import AuthenticationConfig from './AuthenticationConfig';

export interface ConfigEditorProps
  extends DataSourcePluginOptionsEditorProps<LogshipDataSourceOptions, LogshipDataSourceSecureOptions> {}

const ConfigEditor: React.FC<ConfigEditorProps> = (props) => {
  const { options, onOptionsChange } = props;  
  props.options.jsonData.authType = 'jwt'
  const jsonData = props.options.jsonData;

  const updateJsonData = useCallback(
    <T extends keyof LogshipDataSourceOptions>(fieldName: T, value: LogshipDataSourceOptions[T]) => {
      onOptionsChange({
        ...options,
        jsonData: {
          ...options.jsonData,
          ...jsonData,
          [fieldName]: value,
        },
      });
    },
    [jsonData, onOptionsChange, options]
  );

  return (
    <>
      <ConfigHelp />
      <ConnectionConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />
      <AuthenticationConfig options={options} userIdentityEnabled={false} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />
      {/* <QueryConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} /> */}
      <TrackingConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />
    </>
  );
};

export default ConfigEditor;
