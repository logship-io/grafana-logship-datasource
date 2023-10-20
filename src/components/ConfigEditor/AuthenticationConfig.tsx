import React, { ChangeEvent, useMemo, useState } from 'react';
import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { LogshipDataSourceOptions, LogshipDataSourceSecureOptions } from 'types';
import { Alert, Button, Icon, InlineField, Input, Select } from '@grafana/ui';

interface Props extends DataSourcePluginOptionsEditorProps<LogshipDataSourceOptions, LogshipDataSourceSecureOptions> {
  updateJsonData: <T extends keyof LogshipDataSourceOptions>(fieldName: T, value: LogshipDataSourceOptions[T]) => void;
  userIdentityEnabled: boolean;
}

const AuthenticationConfig: React.FC<Props> = (props) => {
  const { options, onOptionsChange } = props;
  const [lock, setLock] = useState(true);
  const [lockClientSecret, setLockClientSecret] = useState(true);

  const authTypeOptions = useMemo<Array<SelectableValue<string>>>(() => {
    let opts: Array<SelectableValue<string>> = [
      {
        value: 'jwt',
        label: 'JWT Authentication',
      },
      {
        value: 'oboOAuth',
        label: 'OAuth2 (On-Behalf-Of)',
      }
    ];

    return opts;
  }, []);
  
  const onAuthTypeChange = (selected: SelectableValue<string>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        oauthPassThru: selected.value === 'oboOAuth',
        authType: selected.value!,
      }
    });
  };

  const onUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        username: event.target.value,
      },
    });
  };

  const onTokenEndpointChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        tokenEndpoint: event.target.value,
      },
    });
  };

  const onClientIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        clientId: event.target.value,
      },
    });
  };

  const onScopeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        scope: event.target.value,
      },
    });
  };

  const onPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        ...options.secureJsonData,
        clientSecret: options?.secureJsonData?.clientSecret ?? '',
        pass: event.target.value,
      },
    });
    setLock(true);
  };

  const onClientSecretChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        ...options.secureJsonData,
        pass: options?.secureJsonData?.pass ?? '',
        clientSecret: event.target.value,
      },
    });
    setLockClientSecret(true);
  };

  const onPasswordReset = () => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        ...options.secureJsonData,
        clientSecret: options?.secureJsonData?.clientSecret ?? '',
        pass: '',
      },
      secureJsonFields: {
        ...options.secureJsonFields,
        pass: false,
      }
    });
  };

  const onClientSecretReset = () => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        ...options.secureJsonData,
        pass: options?.secureJsonData?.pass ?? '',
        clientSecret: '',
      },
      secureJsonFields: {
        ...options.secureJsonFields,
        clientSecret: false,
      }
    });
    setLockClientSecret(false);
  };

  return (
    <div className="gf-form-group">
      <h3>Authentication Config</h3>
      {authTypeOptions.length > 1 && (
        <InlineField
          label="Authentication"
          labelWidth={18}
          tooltip="Choose the type of authentication to the Logship database."
          htmlFor="ls-auth-type"
        >
          <Select
            inputId="ls-auth-type"
            className="width-15"
            value={options.jsonData.authType}
            options={authTypeOptions}
            onChange={onAuthTypeChange}
          />
        </InlineField>
      )}
        {options.jsonData?.authType === 'jwt' && <InlineField label="Username" labelWidth={18} htmlFor="ls-username">
          <div className="width-15">
            <Input
              id="ls-username"
              className="width-30"
              aria-label="Username"
              placeholder="logship"
              value={options.jsonData?.username}
              onChange={onUsernameChange}
            />
          </div>
        </InlineField>}
        { options.jsonData?.authType === 'jwt' && (options.secureJsonFields.pass ? (
          <>
            <InlineField label="Password" labelWidth={18} htmlFor="ls-password-configured">
              <div className="width-30" style={{ display: 'flex', gap: '4px' }}>
                <Input
                  id="ls-password-configured"
                  aria-label="Password"
                  type='password'
                  placeholder={"**********"}
                  value={"**********"}
                  disabled={true}
                />
                <Button variant="secondary"
                  type="button"
                  onClick={onPasswordReset}
                  onMouseEnter={() => setLock(false)}
                  onMouseLeave={() => setLock(true)}
                  >
                  <Icon name={lock ? 'lock' : 'unlock'} />{' Reset'}
                </Button>
              </div>
            </InlineField>
          </>
        ) : (
          <>
            <InlineField label="Password" labelWidth={18} htmlFor="ls-password">
              <div className="width-30" style={{ display: 'flex', gap: '4px' }}>
                <Input
                  id="ls-password"
                  aria-label="Password"
                  type='password'
                  placeholder='password'
                  value={options.secureJsonData?.pass}
                  onChange={onPasswordChange}
                />
              </div>
            </InlineField>
          </>
        ))}

        {options.jsonData?.authType === 'oboOAuth' && <>
          <Alert title="On-behalf-of user authentication is experimental" severity="warning">
            Certain features may not work as expected. Ensure Grafana is configured for OAuth.
          </Alert>
          <InlineField label="Token Endpoint" labelWidth={18} htmlFor="ls-token-endpoint">
            <div className="width-15">
              <Input
                id="ls-token-endpoint"
                className="width-30"
                aria-label="Token Endpoint"
                placeholder="https://example.com/oauth/token"
                value={options.jsonData?.tokenEndpoint}
                onChange={onTokenEndpointChange}
              />
            </div>
          </InlineField>
          <InlineField label="Client ID" labelWidth={18} htmlFor="ls-client-id">
            <div className="width-15">
              <Input
                id="ls-client-id"
                className="width-30"
                aria-label="Client Id"
                placeholder="client id"
                value={options.jsonData?.clientId}
                onChange={onClientIdChange}
              />
            </div>
          </InlineField>
          { options.secureJsonFields.clientSecret ? (
          <>
            <InlineField label="Client Secret" labelWidth={18} htmlFor="ls-client-secret-disabled">
              <div className="width-30" style={{ display: 'flex', gap: '4px' }}>
                <Input
                  id="ls-client-secret-disabled"
                  aria-label="Client Secret"
                  type='password'
                  placeholder={"**********"}
                  value={"**********"}
                  disabled={true}
                />
                <Button variant="secondary"
                  aria-label="Edit Client Secret"
                  type="button"
                  onClick={onClientSecretReset}
                  onMouseEnter={() => setLockClientSecret(false)}
                  onMouseLeave={() => setLockClientSecret(true)}
                  >
                  <Icon name={lockClientSecret ? 'lock' : 'unlock'} />{' Reset'}
                </Button>
              </div>
            </InlineField>
          </>
        ) : (
          <>
            <InlineField label="Client Secret" labelWidth={18} htmlFor="ls-client-secret">
              <div className="width-30" style={{ display: 'flex', gap: '4px' }}>
                <Input
                  id="ls-client-secret"
                  aria-label="Client Secret"
                  type='password'
                  placeholder='client secret'
                  value={options.secureJsonData?.clientSecret}
                  onChange={onClientSecretChange}
                />
              </div>
            </InlineField>
          </>
        )}

            <InlineField label="Scope" labelWidth={18} htmlFor="ls-scope">
              <div className="width-30" style={{ display: 'flex', gap: '4px' }}>
                <Input
                  id="ls-scope"
                  aria-label="Scope"
                  placeholder='scope'
                  value={options.jsonData?.scope}
                  onChange={onScopeChange}
                />
              </div>
            </InlineField>
        </>
        }
        

    </div>
  );
};

export default AuthenticationConfig;
