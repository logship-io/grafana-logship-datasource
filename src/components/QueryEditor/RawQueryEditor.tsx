import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { CodeEditor, Monaco, MonacoEditor } from '@grafana/ui';
import { LogshipDataSource } from 'datasource';
import React, { useEffect, useState } from 'react';
import { selectors } from 'test/selectors';
import { LogshipDataSourceOptions, KustoQuery, LogshipDatabaseSchema } from 'types';
import { cloneDeep } from 'lodash';

import { getSignatureHelp } from './Suggestions';

type Props = QueryEditorProps<LogshipDataSource, KustoQuery, LogshipDataSourceOptions>;

interface RawQueryEditorProps extends Props {
  schema?: LogshipDatabaseSchema;
  database: string;
  templateVariableOptions: SelectableValue<string>;
  setDirty: () => void;
}

interface Worker {
  setSchemaFromShowSchema: (schema: LogshipDatabaseSchema, url: string, database: string) => void;
}

export const RawQueryEditor: React.FC<RawQueryEditorProps> = (props) => {
  const { query, schema } = props;
  const [worker, setWorker] = useState<Worker>();
  const [variables] = useState(getTemplateSrv().getVariables());
  const [stateSchema, setStateSchema] = useState(cloneDeep(schema));

  const onRawQueryChange = (kql: string) => {
    if (kql !== props.query.query) {
      props.setDirty();
      props.onChange({
        ...props.query,
        query: kql,
      });
      console.log("query change: " + kql)
    }
  };

  useEffect(() => {
    if (schema && !stateSchema) {
      setStateSchema(cloneDeep(schema));
    }
  }, [schema, stateSchema]);

  const handleEditorMount = (editor: MonacoEditor, monaco: Monaco) => {
    monaco.languages.registerSignatureHelpProvider('kusto', {
      signatureHelpTriggerCharacters: ['(', ')'],
      provideSignatureHelp: getSignatureHelp,
    });
    monaco.languages['kusto']
      .getKustoWorker()
      .then((kusto) => {
        const model = editor.getModel();
        return model && kusto(model.uri);
      })
      .then((worker) => {
        setWorker(worker);
      });
  };

  useEffect(() => {
    if (worker && stateSchema) {
      // worker.setSchemaFromShowSchema(stateSchema, 'https://help.kusto.windows.net', props.database);
    }
  }, [worker, stateSchema, variables, props.database]);

  if (!stateSchema) {
    return null;
  }

  return (
    <div>
      <div data-testid={selectors.components.queryEditor.codeEditor.container}>
        <CodeEditor
          language="kusto"
          value={query.query}
          onBlur={onRawQueryChange}
          onChange={onRawQueryChange}
          showMiniMap={false}
          showLineNumbers={true}
          height="240px"
          onEditorDidMount={handleEditorMount}
        />
      </div>
    </div>
  );
};
