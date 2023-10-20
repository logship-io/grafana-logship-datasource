import { DataSourcePluginOptionsEditorProps, PluginType } from '@grafana/data';

import { LogshipDataSource } from '../../datasource';
import { LogshipDataSourceOptions, LogshipDataSourceSecureOptions, KustoQuery } from '../../types';

export const mockDatasourceOptions: DataSourcePluginOptionsEditorProps<
  LogshipDataSourceOptions,
  LogshipDataSourceSecureOptions
> = {
  options: {
    id: 1,
    uid: 'logship-id',
    orgId: 1,
    name: 'Logship Data source',
    typeLogoUrl: '',
    type: '',
    typeName: '',
    access: '',
    url: '',
    user: '',
    basicAuth: false,
    basicAuthUser: '',
    database: '',
    isDefault: false,
    jsonData: {
      defaultDatabase: 'default',
      minimalCache: 1,
      queryTimeout: '',
      cacheMaxAge: '',
      dynamicCaching: false,
      useSchemaMapping: false,
      enableUserTracking: false,
      clusterUrl: '',
      authType: '',
      username: '',
      clientId: '',
      tokenEndpoint: '',
    },
    secureJsonFields: {},
    readOnly: false,
    withCredentials: false,
  },
  onOptionsChange: jest.fn(),
};

export const mockDatasource = () =>
  new LogshipDataSource({
    id: 1,
    uid: 'logship-id',
    type: 'logship-datasource',
    name: 'Logship Data Source',
    access: 'proxy',
    jsonData: mockDatasourceOptions.options.jsonData,
    meta: {
      id: 'logship-datasource',
      name: 'Logship Data Source',
      type: PluginType.datasource,
      module: '',
      baseUrl: '',
      info: {
        description: '',
        screenshots: [],
        updated: '',
        version: '',
        logos: {
          small: '',
          large: '',
        },
        author: {
          name: '',
        },
        links: [],
      },
    },
    readOnly: false,
  });

export const mockQuery: KustoQuery = {
  refId: 'A',
  query: '',
  resultFormat: 'table',
  querySource: 'raw',
  pluginVersion: '1',
};
