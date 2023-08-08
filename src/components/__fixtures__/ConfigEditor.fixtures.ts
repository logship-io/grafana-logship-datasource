import { Chance } from 'chance';
import { ConfigEditorProps } from 'components/ConfigEditor';

export const mockConfigEditorProps = (optionsOverrides?: Partial<ConfigEditorProps>): ConfigEditorProps => ({
  options: {
    uid: '',
    id: Chance().integer({ min: 0 }),
    orgId: Chance().integer({ min: 0 }),
    name: Chance().word(),
    typeLogoUrl: Chance().url(),
    type: Chance().word(),
    access: Chance().word(),
    url: Chance().url(),
    user: Chance().name(),
    database: Chance().word(),
    basicAuth: true,
    basicAuthUser: Chance().name(),
    isDefault: true,
    typeName: '',
    jsonData: {
      defaultDatabase: Chance().word(),
      minimalCache: Chance().integer({ min: 0 }),
      queryTimeout: Chance().word(),
      cacheMaxAge: Chance().word(),
      dynamicCaching: true,
      useSchemaMapping: false,
      enableUserTracking: true,
      clusterUrl: Chance().url(),
      authType: 'jwt',
      username: Chance().word(),
    },
    readOnly: true,
    withCredentials: true,
    secureJsonFields: {
      pass: Chance().bool(),
    },
  },
  onOptionsChange: jest.fn(),
  ...optionsOverrides,
});
