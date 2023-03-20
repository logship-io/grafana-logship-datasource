import React from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { FieldSet, InlineField, Input } from '@grafana/ui';
import { LogshipDataSourceOptions, LogshipDataSourceSecureOptions } from 'types';
import { selectors } from 'test/selectors';

interface ConnectionConfigProps
  extends DataSourcePluginOptionsEditorProps<LogshipDataSourceOptions, LogshipDataSourceSecureOptions> {
  updateJsonData: <T extends keyof LogshipDataSourceOptions>(fieldName: T, value: LogshipDataSourceOptions[T]) => void;
}

const LABEL_WIDTH = 18;

const ConnectionConfig: React.FC<ConnectionConfigProps> = ({ options, updateJsonData }) => {
  const { jsonData } = options;

  return (
    <FieldSet label="Connection Details">
      <InlineField
        label="Cluster URL"
        labelWidth={LABEL_WIDTH}
        tooltip="The cluster url for your Azure Data Explorer database."
      >
        <Input
          data-testid={selectors.components.configEditor.clusterURL.input}
          value={jsonData.clusterUrl}
          id="logship-cluster-url"
          placeholder="https://try.logship.ai"
          width={60}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('clusterUrl', ev.target.value)}
        />
      </InlineField>
    </FieldSet>
  );
};

export default ConnectionConfig;
