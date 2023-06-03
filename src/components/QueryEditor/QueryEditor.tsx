import { QueryEditorProps } from '@grafana/data';
import { Alert } from '@grafana/ui';
import { get } from 'lodash';
import React, { useMemo, useState } from 'react';
import { useAsync, useEffectOnce } from 'react-use';
import { LogshipDataSourceOptions as LogshipDataSourceOptions, KustoQuery } from 'types';
import { LogshipDataSource } from '../../datasource';
import { QueryHeader } from './QueryHeader';
import { RawQueryEditor } from './RawQueryEditor';
import { useLocation } from 'react-router-dom';

type Props = QueryEditorProps<LogshipDataSource, KustoQuery, LogshipDataSourceOptions>;

export const QueryEditor: React.FC<Props> = (props) => {
  const { onChange, onRunQuery, query, datasource } = props;
  const schema = useAsync(() => datasource.getSchema(true), [datasource.id]);
  const templateVariables = useTemplateVariables(datasource);
  const [dirty, setDirty] = useState(false);
  const isExplore = useLocation().pathname?.startsWith('/explore');
  useEffectOnce(() => {
    onRunQuery();
  });

  return (
    <>
      { schema.error && <Alert title="Could not load datasource schema">{parseSchemaError(schema.error)}</Alert> }
        <QueryHeader
          query={query}
          onChange={onChange}
          isExplore={isExplore}
          schema={schema}
          datasource={datasource}
          dirty={dirty}
          setDirty={setDirty}
          onRunQuery={onRunQuery}
        />
        <RawQueryEditor
            {...props}
            schema={schema}
            templateVariableOptions={templateVariables}
            setDirty={() => !dirty && setDirty(true)}
          />
    </>
  );
};

function parseSchemaError(error?: Error) {
  if (error === undefined) {
    error = Error("Invalid error output. Error undefined");
  }
  // error may be an object with a message
  return get(error, 'data.Message', String(error));
}

const useTemplateVariables = (datasource: LogshipDataSource) => {
  const variables = datasource.getVariables();

  return useMemo(() => {
    return {
      label: 'Template Variables',
      expanded: false,
      options: variables.map((variable) => {
        return { label: variable, value: variable };
      }),
    };
  }, [variables]);
};
