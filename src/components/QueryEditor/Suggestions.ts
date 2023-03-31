import { VariableModel } from '@grafana/data'; 
import { monacoTypes } from '@grafana/ui';
import { LogshipFunctionSchema } from 'types';

const defaultTimeField = 'TimeGenerated';

export function getFunctions(variables: VariableModel[]): Record<string, LogshipFunctionSchema> {
  const functions = {
    "$__timeFilter": {
      Name: '$__timeFilter',
      Body: '{ true }',
      FunctionKind: 'Unknown',
      InputParameters: [
        {
          name: 'timeColumn',
          type: 'string',
          CslDefaultValue: '""',
        },
      ],
      OutputColumns: [],
      DocString:
        '##### Macro that uses the selected timerange in Grafana to filter the query.\n\n' +
        '- `$__timeFilter()` -> Uses the ' +
        defaultTimeField +
        ' column\n\n' +
        '- `$__timeFilter(datetimeColumn)` ->  Uses the specified datetime column to build the query.',
    },
    "$__from": {
      Name: '$__from',
      Body: '{ datetime(2018-06-05T18:09:58.907Z) }',
      FunctionKind: 'Unknown',
      DocString:
        'Built-in variable that returns the from value of the selected timerange in Grafana.\n\n' +
        'Example: `where ' +
        defaultTimeField +
        ' > $__from` ',
      InputParameters: [],
      OutputColumns: [],
    },
    "$__to": {
      Name: '$__to',
      Body: '{ datetime(2018-06-05T18:09:58.907Z) }',
      FunctionKind: 'Unknown',
      DocString:
        'Built-in variable that returns the to value of the selected timerange in Grafana.\n\n' +
        'Example: `where ' +
        defaultTimeField +
        ' < $__to` ',
      InputParameters: [],
      OutputColumns: [],
    },
    "$__timeInterval": {
      Name: '$__timeInterval',
      Body: '{ 1s }',
      FunctionKind: 'Unknown',
      DocString:
        '##### Built-in variable that returns an automatic time grain suitable for the current timerange.\n\n' +
        'Used with the bin() function - `bin(' +
        defaultTimeField +
        ', $__timeInterval)` \n\n' +
        '[Grafana docs](http://docs.grafana.org/reference/templating/#the-interval-variable)',
      InputParameters: [],
      OutputColumns: [],
    },
    "$__contains": {
      Name: '$__contains',
      Body: `{ colName in ('value1','value2') }`,
      FunctionKind: 'Unknown',
      DocString:
        '##### Used with multi-value template variables.\n\n' +
        'If `$myVar` has the value `value1`,`value2`, it expands to: `colName in (value1,value2)`.' +
        'If using the `All` option, then check the `Include All Option` checkbox and in the `Custom all value` field type in the value `all`. If `$myVar` has value `all` then the macro will instead expand to `1 == 1`.' +
        'For template variables with a lot of options, this will increase the query performance by not building a large "where..in" clause.' +
        '[Grafana docs](https://grafana.com/grafana/plugins/grafana-grafana-logship-datasource/)',
      InputParameters: [
        {
          name: 'colName',
          type: 'string',
          CslDefaultValue: 'colName',
        },
        {
          name: '$myVar',
          type: 'string',
          CslDefaultValue: '$myVar',
        },
      ],
      OutputColumns: [],
    },
  };

  // Add template variables
  variables.forEach((v) => {
    functions[`$${v.name}`] = {
      Name: `$${v.name}`,
      Body: '{}',
      FunctionKind: 'Unknown',
      InputParameters: [],
      OutputColumns: [],
    };
  });

  return functions;
}

export function getSignatureHelp(
  model: monacoTypes.editor.ITextModel, position: monacoTypes.Position, token: monacoTypes.CancellationToken, context: monacoTypes.languages.SignatureHelpContext
): monacoTypes.languages.ProviderResult<monacoTypes.languages.SignatureHelpResult> {
  // The current position is the position of the parenthesis `(`
  // So we need to get the function name using the previous character
  const funcPosition = position.delta(0, -1);
  const { word } = model.getWordUntilPosition(funcPosition);
  if (word !== '__timeFilter') {
    return { value: { activeParameter: 0, activeSignature: 0, signatures: [] }, dispose: () => {} };
  }

  const signature: monacoTypes.languages.SignatureHelp = {
    activeParameter: 0,
    activeSignature: 0,
    signatures: [
      {
        label: '$__timeFilter(timeColumn)',
        parameters: [
          {
            label: 'timeColumn',
            documentation:
              'Default is ' +
              defaultTimeField +
              ' column. Datetime column to filter data using the selected date range. ',
          },
        ],
      },
    ],
  };

  return { value: signature, dispose: () => {} };
}
