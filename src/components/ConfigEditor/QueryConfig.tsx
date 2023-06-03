import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { FieldSet, InlineField, InlineSwitch, Input } from '@grafana/ui';
import React from 'react';
import { LogshipDataSourceOptions, LogshipDataSourceSecureOptions } from 'types';

interface QueryConfigProps
  extends DataSourcePluginOptionsEditorProps<LogshipDataSourceOptions, LogshipDataSourceSecureOptions> {
  updateJsonData: <T extends keyof LogshipDataSourceOptions>(fieldName: T, value: LogshipDataSourceOptions[T]) => void;
}

const LABEL_WIDTH = 21;

const QueryConfig: React.FC<QueryConfigProps> = ({ options, updateJsonData }) => {
  const { jsonData } = options;
  return (
    <FieldSet label="Query Optimizations">
      <InlineField
        label="Query timeout"
        labelWidth={LABEL_WIDTH}
        tooltip="This value controls the client query timeout."
      >
        <Input
          value={jsonData.queryTimeout}
          id="logship-query-timeout"
          placeholder="30s"
          width={18}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('queryTimeout', ev.target.value)}
        />
      </InlineField>

      <InlineField
        label="Use dynamic caching"
        labelWidth={LABEL_WIDTH}
        tooltip="By enabling this feature Grafana will dynamically apply cache settings on a per query basis and the default cache max age will be ignored.<br /><br />For time series queries we will use the bin size to widen the time range but also as cache max age."
      >
        <InlineSwitch
          value={jsonData.dynamicCaching}
          id="logship-caching"
          transparent={false}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('dynamicCaching', ev.target.checked)}
        />
      </InlineField>

      <InlineField
        label="Cache max age"
        labelWidth={LABEL_WIDTH}
        tooltip="By default the cache is disabled. If you want to enable the query caching please specify a max timespan for the cache to live."
      >
        <Input
          value={jsonData.cacheMaxAge}
          id="logship-cache-age"
          placeholder="0m"
          width={18}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('cacheMaxAge', ev.target.value)}
        />
      </InlineField>
    </FieldSet>
  );
};

export default QueryConfig;
