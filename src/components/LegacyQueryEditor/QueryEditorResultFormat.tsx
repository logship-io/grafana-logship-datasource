import { css } from '@emotion/css';
import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { InlineFormLabel, Select, useStyles2 } from '@grafana/ui';
import React, { useCallback } from 'react';

interface Props {
  format: string;
  onChangeFormat: (format: string) => void;
  includeLogshipTimeFormat: boolean;
}

const formats: Array<SelectableValue<string>> = [
  { label: 'Table', value: 'table' },
  { label: 'Time series', value: 'time_series' },
];

const logshipTimeFormat: SelectableValue<string> = {
  label: 'Logship Time series',
  value: 'time_series_logship_series',
};

export const QueryEditorResultFormat: React.FC<Props> = (props) => {
  const { onChangeFormat } = props;
  const onFormatChange = useCallback(
    (selectable: SelectableValue<string>) => {
      if (!selectable || !selectable.value) {
        return;
      }
      onChangeFormat(selectable.value);
    },
    [onChangeFormat]
  );

  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container}>
      <InlineFormLabel className="query-keyword" width={6}>
        Format as
      </InlineFormLabel>
      <Select
        options={props.includeLogshipTimeFormat ? [...formats, logshipTimeFormat] : formats}
        value={props.format}
        onChange={onFormatChange}
        menuShouldPortal
      />
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    display: flex;
    flex-direction: row;
    margin-right: 4px;
  `,
});

export const selectResultFormat = (format?: string, includeLogshipFormat?: boolean): string => {
  const selected = formats.find((f) => f.value === format);

  if (includeLogshipFormat && logshipTimeFormat.value) {
    if (logshipTimeFormat.value === format) {
      return logshipTimeFormat.value;
    }
  }

  if (selected && selected.value) {
    return selected.value;
  }

  if (formats.length > 0 && formats[0].value) {
    return formats[0].value;
  }

  return 'time_series';
};
