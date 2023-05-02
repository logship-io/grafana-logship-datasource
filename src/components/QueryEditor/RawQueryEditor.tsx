import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { CodeEditor, Monaco, MonacoEditor, Spinner, useTheme2 } from '@grafana/ui';
import { LogshipDataSource } from 'datasource';
import React, { useEffect, useRef, useState } from 'react';
import { AsyncState } from 'react-use/lib/useAsyncFn';
import { LogshipDataSourceOptions, KustoQuery, LogshipDatabaseSchema } from 'types';
import { cloneDeep } from 'lodash';
import { getSignatureHelp } from './Suggestions';
import { TableList } from './TableList';

type Props = QueryEditorProps<LogshipDataSource, KustoQuery, LogshipDataSourceOptions>;

interface RawQueryEditorProps extends Props {
  schema: AsyncState<LogshipDatabaseSchema>;
  database: string;
  templateVariableOptions: SelectableValue<string>;
  setDirty: () => void;
}

interface Worker {
  // setSchemaFromShowSchema: (schema: LogshipDatabaseSchema, url: string, database: string) => void;
  setSchema: (schema: any) => void;
}

export const RawQueryEditor: React.FC<RawQueryEditorProps> = (props) => {
  const { query, schema, onChange } = props;
  const [worker, setWorker] = useState<Worker>();
  const [variables] = useState(getTemplateSrv().getVariables());
  const [stateSchema, setStateSchema] = useState<LogshipDatabaseSchema | undefined>(undefined);
  const minWidth = 50;
  const theme = useTheme2();
  const [widths, setWidths] = useState({
    left: '20%',
    right: '79%',
  });

  const [schemaLoaded, setSchemaLoaded] = useState(false);
  useEffect(() => {
    if (schema.value && !schemaLoaded) {
      setSchemaLoaded(true);
    }
  }, [schema.value, schemaLoaded]);

  const paneRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const [paneState, setPaneState] = useState({
    isDragging: false,
    xPosition: 0
  });
  

  const onMouseDown = (e) => {
    if (paneRef.current && dividerRef.current && e.target.className === dividerRef.current.className) {
      const containerLeft = paneRef.current.getBoundingClientRect().left;
      setPaneState({
        xPosition: containerLeft,
        isDragging: true,
      });
    }
  };

  const onMouseUp = () => {
    if (paneRef.current) {
      const containerLeft = paneRef.current.getBoundingClientRect().left;
      setPaneState({
        xPosition: containerLeft,
        isDragging: false,
      });
    }
  };

  const onMouseHoldMove = (e: { clientX: number; }) => {
    if (!paneState.isDragging) {
      return;
    }

    if (paneRef.current) {
      let left = e.clientX - paneState.xPosition;
      const maxWidth = paneRef.current.clientWidth;
      if (left <= minWidth) {
        left = minWidth;
      } else if (left >= (maxWidth - minWidth)) {
        left = maxWidth - minWidth;
      }

      const right = maxWidth - left - (dividerRef.current?.clientWidth ?? 10) - 5;
      setWidths({
        left: `${left}px`,
        right: `${right}px`,
      })
    }
  };

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
    if (schema.value && stateSchema === undefined) {
      setStateSchema(cloneDeep(schema.value));
    }

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
    };
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
      .then((worker: React.SetStateAction<Worker | undefined>) => {
        setWorker(worker);
      });
  };

  useEffect(() => {
    if (worker && stateSchema !== undefined) {
      const dotnetTypeToKustoType = {
        'SByte': 'bool',
        'Byte': 'uint8',
        'Int16': 'int16',
        'UInt16': 'uint16',
        'Int32': 'int',
        'UInt32': 'uint',
        'Int64': 'long',
        'UInt64': 'ulong',
        'String': 'string',
        'Single': 'float',
        'Double': 'real',
        'DateTime': 'datetime',
        'DateTimeOffset': 'datetime',
        'TimeSpan': 'timespan',
        'Guid': 'guid',
        'Boolean': 'bool',
      };
      
      const tables = Array.from(stateSchema.tables.map((t) => { return {
        "name": t.name,
        "entityType": 'Table',
        "columns": t.columns.map((c) => { return {
          "name": c.name,
          "type": dotnetTypeToKustoType[c.type] ?? 'dynamic',
          "entityType": "Column"
        }}),
      }}));
      const db = {
        "name": stateSchema.name,
        "majorVersion": 5,
        "minorVersion": 0,
        "tables": tables,
        "functions": [],
      };
      const kustoSchema = {
        "clusterType":"Engine",
        "cluster":{
          "connectionString": "logship.ai",
          "databases": [ db ]
        },      
        "database": db
      };

      worker.setSchema(kustoSchema);
    }
  }, [worker, stateSchema, variables, props.database]);

  if (!stateSchema) {
    return null;
  }

  const backgroundColor = theme.colors.background.primary;
  const textColor = theme.colors.text.primary;

  return (
    <div>
      <div className="query-editor-split-pane"
        onMouseMove={onMouseHoldMove}
        onMouseUp={onMouseUp}
        onMouseDown={onMouseDown}
        ref={paneRef}
        style={{ display: "block", alignItems: 'center', width: '100%', maxWidth: '100%' }}
        >
        <div className="query-editor-split-pane-left" style={{ display: "inline-block", width: widths.left, minWidth: minWidth, height: "240px", overflowX: 'hidden', overflowY: 'scroll' }}> 
          { schema.loading && <span><Spinner inline={true} /> Loading Schema...</span> }
          { schema.value && <TableList {...props} schema={schema.value} onChange={onChange} /> }
        </div>
        <div
          className="query-editor-split-pane-divider"
          ref={dividerRef}
          style={{
            display: "inline-block",
            background: `linear-gradient(to right, ${backgroundColor}, ${textColor})`,
            width: "10px",
            marginLeft: "1px",
            marginRight: "1px",
            height: '240px',
            cursor: "ew-resize",
            zIndex: 1000,
          }} />
        <div className="query-editor-split-pane-right" style={{ display: "inline-block", width: widths.right, }}>
          <CodeEditor
            language="kusto"
            value={query.query}
            onBlur={onRawQueryChange}
            onChange={onRawQueryChange}
            showMiniMap={false}
            showLineNumbers={true}
            height="240px"
            onEditorDidMount={handleEditorMount} />
        </div>
      </div>
    </div>
  );
};
