import React, { ChangeEvent, useMemo, useState } from 'react';
import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { LogshipDataSourceOptions, LogshipDataSourceSecureOptions } from 'types';
import { Button, Icon, InlineField, Input, Select } from '@grafana/ui';

interface Props extends DataSourcePluginOptionsEditorProps<LogshipDataSourceOptions, LogshipDataSourceSecureOptions> {
  updateJsonData: <T extends keyof LogshipDataSourceOptions>(fieldName: T, value: LogshipDataSourceOptions[T]) => void;
  userIdentityEnabled: boolean;
}

const AuthenticationConfig: React.FC<Props> = (props) => {
  const { options, onOptionsChange } = props;
  const [lock, setLock] = useState(true);

  const authTypeOptions = useMemo<Array<SelectableValue<string>>>(() => {
    let opts: Array<SelectableValue<string>> = [
      {
        value: 'jwt',
        label: 'JWT Authentication',
      },
      // {
      //   value: 'none',
      //   label: 'Unauthenticated',
      // }
    ];
    
    // if (props.userIdentityEnabled) {
    //   opts.unshift({
    //     value: 'currentuser',
    //     label: 'Current User',
    //   });
    // }
  
    return opts;
  }, []);
  
  const onAuthTypeChange = (selected: SelectableValue<string>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        authType: selected.value ?? 'jwt',
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

  const onPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        ...options.secureJsonData,
        pass: event.target.value,
      },
    });
    setLock(true);
  };

  const onPasswordReset = () => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        ...options.secureJsonData,
        pass: '',
      },
      secureJsonFields: {
        ...options.secureJsonFields,
        pass: false,
      }
    });
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
            value={authTypeOptions.find((opt) => opt.value === options.jsonData?.authType)}
            options={authTypeOptions}
            onChange={onAuthTypeChange}
          />
        </InlineField>
      )}
      {/* {options.jsonData?.authType === 'currentuser' && (
        <>
          <Alert title="Current user authentication is experimental" severity="warning">
            Certain Grafana features (e.g. alerting) may not work as expected.
          </Alert>
        </>
      )}
      {options.jsonData?.authType === 'none' && (
        <>
          <Alert title="Insecure Authentication" severity="warning">
            Using no authentication method is insecure, anyone who can connect to your DB can access your data.
          </Alert>
        </>
      )} */}
      
        <InlineField label="Username" labelWidth={18} htmlFor="ls-username">
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
        </InlineField>
        {options.secureJsonFields.pass ? (
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
        )}
    </div>
  );
};

export default AuthenticationConfig;
