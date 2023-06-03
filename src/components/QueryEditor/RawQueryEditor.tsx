import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { CodeEditor, Monaco, MonacoEditor } from '@grafana/ui';
import { LogshipDataSource } from 'datasource';
import React, { useEffect, useState } from 'react';
import { AsyncState } from 'react-use/lib/useAsyncFn';
import { LogshipDataSourceOptions, KustoQuery, LogshipDatabaseSchema } from 'types';
import { cloneDeep } from 'lodash';
import { LogshipInlineCompletionsProvider, LogshipSignatureHelpProvider } from 'monaco/LogshipLanguageProviders';
import { LogshipKustoGrammar } from 'monaco/LogshipKustoGrammar';

type Props = QueryEditorProps<LogshipDataSource, KustoQuery, LogshipDataSourceOptions>;

interface RawQueryEditorProps extends Props {
  schema: AsyncState<LogshipDatabaseSchema>;
  templateVariableOptions: SelectableValue<string>;
  setDirty: (b: boolean) => void;
}

interface Worker {
  // setSchemaFromShowSchema: (schema: LogshipDatabaseSchema, url: string, database: string) => void;
  setSchema: (schema: any) => void;
}

export const RawQueryEditor: React.FC<RawQueryEditorProps> = (props) => {
  const { query, schema } = props;
  const [_worker, _setWorker] = useState<Worker>();
  const [_variables] = useState(getTemplateSrv().getVariables());
  const [stateSchema, setStateSchema] = useState<LogshipDatabaseSchema | undefined>(undefined);

  const [schemaLoaded, setSchemaLoaded] = useState(false);
  useEffect(() => {
    if (schema.value && !schemaLoaded) {
      setSchemaLoaded(true);
    }
  }, [schema.value, schemaLoaded]);

  const onRawQueryChange = (kql: string) => {
    if (kql !== props.query.query) {
      props.setDirty(true);
      props.onChange({
        ...props.query,
        query: kql,
      });
    }
  };

  useEffect(() => {
    if (schema.value && stateSchema === undefined) {
      setStateSchema(cloneDeep(schema.value));
    }
  }, [schema, stateSchema]);

  const handleEditorMount = (editor: MonacoEditor, monaco: Monaco) => {
    monaco.languages.registerSignatureHelpProvider('ls-kusto', new LogshipSignatureHelpProvider());
    monaco.languages.registerInlineCompletionsProvider('ls-kusto', new LogshipInlineCompletionsProvider());
    monaco.languages.register({ id: 'ls-kusto' });
    monaco.languages.setMonarchTokensProvider('ls-kusto', LogshipKustoGrammar);
  };

  return (
    <div>
      <CodeEditor
        language="ls-kusto"
        value={query.query}
        onBlur={onRawQueryChange}
        onChange={onRawQueryChange}
        showMiniMap={false}
        showLineNumbers={true}
        height="240px"
        onEditorDidMount={handleEditorMount} />
    </div>
  );
};
