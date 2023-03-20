import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { FieldSet, InlineField, InlineSwitch } from '@grafana/ui';
import React from 'react';
import { LogshipDataSourceOptions, LogshipDataSourceSecureOptions } from 'types';

interface TrackingConfigProps
  extends DataSourcePluginOptionsEditorProps<LogshipDataSourceOptions, LogshipDataSourceSecureOptions> {
  updateJsonData: <T extends keyof LogshipDataSourceOptions>(fieldName: T, value: LogshipDataSourceOptions[T]) => void;
}

const LABEL_WIDTH = 28;

const TrackingConfig: React.FC<TrackingConfigProps> = ({ options, updateJsonData }) => {
  const { jsonData } = options;

  return (
    <FieldSet label="Tracking">
      <InlineField
        label="Send username header to host"
        labelWidth={LABEL_WIDTH}
        tooltip={
          <p>
            With this feature enabled, Grafana will pass the logged in user&#39;s username in the{' '}
            <code>x-ms-user-id</code> header and in the <code>x-ms-client-request-id</code> header when sending requests
            to Logship. Can be useful when tracking needs to be done in Logship.{' '}
          </p>
        }
      >
        <InlineSwitch
          id="logship-username-header"
          value={jsonData.enableUserTracking}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
            updateJsonData('enableUserTracking', ev.target.checked)
          }
        />
      </InlineField>
    </FieldSet>
  );
};

export default TrackingConfig;
