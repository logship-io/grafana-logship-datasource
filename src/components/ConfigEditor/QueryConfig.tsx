import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { FieldSet, InlineField, InlineSwitch, Input, Select } from '@grafana/ui';
import React, { useEffect } from 'react';
import { LogshipDataSourceOptions, LogshipDataSourceSecureOptions, EditorMode } from 'types';

interface QueryConfigProps
  extends DataSourcePluginOptionsEditorProps<LogshipDataSourceOptions, LogshipDataSourceSecureOptions> {
  updateJsonData: <T extends keyof LogshipDataSourceOptions>(fieldName: T, value: LogshipDataSourceOptions[T]) => void;
}

const dataConsistencyOptions: Array<{ value: string; label: string }> = [
  { value: 'strongconsistency', label: 'Strong' },
  { value: 'weakconsistency', label: 'Weak' },
];

const editorModeOptions: Array<{ value: EditorMode; label: string }> = [
  { value: EditorMode.Visual, label: 'Visual' },
  { value: EditorMode.Raw, label: 'Raw' },
];

const LABEL_WIDTH = 21;

const QueryConfig: React.FC<QueryConfigProps> = ({ options, updateJsonData }) => {
  const { jsonData } = options;

  // Set some default values
  useEffect(() => {
    if (!jsonData.dataConsistency) {
      updateJsonData('dataConsistency', dataConsistencyOptions[0].value);
    }
    if (!jsonData.defaultEditorMode) {
      updateJsonData('defaultEditorMode', editorModeOptions[0].value);
    }
  }, [jsonData.dataConsistency, jsonData.defaultEditorMode, updateJsonData]);

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

      <InlineField label="Data consistency" labelWidth={LABEL_WIDTH} tooltip="Defaults to Strong">
        <Select
          options={dataConsistencyOptions}
          value={dataConsistencyOptions.find((v) => v.value === jsonData.dataConsistency)}
          onChange={(change: SelectableValue<string>) =>
            updateJsonData('dataConsistency', change.value ? change.value : dataConsistencyOptions[0].value)
          }
          isClearable={false}
          width={18}
        />
      </InlineField>

      <InlineField label="Default editor mode" labelWidth={LABEL_WIDTH} tooltip="Defaults to Visual">
        <Select
          options={editorModeOptions}
          value={editorModeOptions.find((v) => v.value === jsonData.defaultEditorMode)}
          onChange={(change: SelectableValue<EditorMode>) =>
            updateJsonData('defaultEditorMode', change.value || EditorMode.Visual)
          }
          width={18}
        />
      </InlineField>
    </FieldSet>
  );
};

export default QueryConfig;
