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
  //{ label: 'Builder', value: EditorMode.Visual },
];

const EDITOR_FORMATS: Array<SelectableValue<string>> = [
  { label: 'Table', value: FormatOptions.table },
  { label: 'Time series', value: FormatOptions.timeSeries },
];


export const QueryHeader = (props: QueryEditorHeaderProps) => {
  const { query, schema, onChange, setDirty, onRunQuery } = props;
  const [formats, _setFormats] = useState(EDITOR_FORMATS);
  const [showWarning, setShowWarning] = useState(false);
  const [schemaLoaded, setSchemaLoaded] = useState(false);

  const changeEditorMode = (value: EditorMode) => {
      onChange({ ...query, });
  };
  useEffect(() => {
    if (schema.value && !schemaLoaded) {
      setSchemaLoaded(true);
    }
  }, [schema.value, schemaLoaded]);

  useEffect(() => {
    if (!query.resultFormat) {
      onChange({ ...query, resultFormat: FormatOptions.timeSeries });
    }
    
  }, [query, formats, onChange]);
  return (
    <EditorHeader>
      <ConfirmModal
        isOpen={showWarning}
        title="Are you sure?"
        body="You will lose manual changes done to the query if you go back to the visual builder."
        confirmText="Confirm"
        onConfirm={() => {
          setShowWarning(false);
          onChange({ ...query, });
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
        value={EditorMode.Raw}
        onChange={changeEditorMode}
      />
    </EditorHeader>
  );
};
