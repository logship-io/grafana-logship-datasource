import React, { useState, useEffect } from 'react';
import { Button, ConfirmModal, RadioButtonGroup } from '@grafana/ui';
import { EditorHeader, FlexItem, InlineSelect } from '@grafana/experimental';

import { EditorMode, FormatOptions, KustoQuery, LogshipDatabaseSchema } from '../../types';
import { AsyncState } from 'react-use/lib/useAsyncFn';
import { LogshipDataSource } from 'datasource';
import { SelectableValue } from '@grafana/data';
import { selectors } from 'test/selectors';

export interface QueryEditorHeaderProps {
  datasource: LogshipDataSource;
  query: KustoQuery;
  schema: AsyncState<LogshipDatabaseSchema>;
  dirty: boolean;
  setDirty: (b: boolean) => void;
  onChange: (value: KustoQuery) => void;
  onRunQuery: () => void;
}

const EDITOR_MODES = [
  { label: 'KQL', value: EditorMode.Raw },
  { label: 'Builder', value: EditorMode.Visual },
];

const EDITOR_FORMATS: Array<SelectableValue<string>> = [
  { label: 'Table', value: FormatOptions.table },
  { label: 'Time series', value: FormatOptions.timeSeries },
];

const logshipTimeFormat: SelectableValue<string> = {
  label: 'Logship Time series',
  value: FormatOptions.logshipTimeSeries,
};

export const QueryHeader = (props: QueryEditorHeaderProps) => {
  const { query, onChange, dirty, setDirty, onRunQuery } = props;
  const { rawMode } = query;
  const [formats, setFormats] = useState(EDITOR_FORMATS);
  const [showWarning, setShowWarning] = useState(false);

  const changeEditorMode = (value: EditorMode) => {
    if (value === EditorMode.Visual && dirty) {
      setShowWarning(true);
    } else {
      onChange({ ...query, rawMode: value === EditorMode.Raw });
    }
  };

  useEffect(() => {
    if (rawMode) {
      setFormats(EDITOR_FORMATS.concat(logshipTimeFormat));
    } else {
      setFormats(EDITOR_FORMATS);
    }
  }, [rawMode]);

  useEffect(() => {
    if (!query.resultFormat) {
      onChange({ ...query, resultFormat: 'table' });
    }
    if (query.resultFormat === logshipTimeFormat.value && !rawMode) {
      // Fallback to Time Series since time_series_logship_series is not available when not in rawMode
      onChange({ ...query, resultFormat: 'time_series' });
    }
  }, [query, formats, onChange, rawMode]);

  return (
    <EditorHeader>
      <ConfirmModal
        isOpen={showWarning}
        title="Are you sure?"
        body="You will lose manual changes done to the query if you go back to the visual builder."
        confirmText="Confirm"
        onConfirm={() => {
          setShowWarning(false);
          onChange({ ...query, rawMode: false });
          setDirty(false);
        }}
        onDismiss={() => {
          setShowWarning(false);
        }}
      ></ConfirmModal>
      <InlineSelect
        label="Format as"
        options={formats}
        value={query.resultFormat}
        onChange={({ value }) => {
          onChange({ ...query, resultFormat: value! });
        }}
      />
      <FlexItem grow={1} />
      <Button
        variant="primary"
        icon="play"
        size="sm"
        onClick={onRunQuery}
        data-testid={selectors.components.queryEditor.runQuery.button}
      >
        Run query
      </Button>
      <RadioButtonGroup
        size="sm"
        options={EDITOR_MODES}
        value={query.rawMode ? EditorMode.Raw : EditorMode.Visual}
        onChange={changeEditorMode}
      />
    </EditorHeader>
  );
};
