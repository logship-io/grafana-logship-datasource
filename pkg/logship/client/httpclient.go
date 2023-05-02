package client

import (
	"fmt"
	"net/http"

	"github.com/logsink/grafana-logship-datasource/pkg/logship/models"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
)

func newHttpClient(instanceSettings *backend.DataSourceInstanceSettings, dsSettings *models.DatasourceSettings) (*http.Client, error) {
	// authOpts := azhttpclient.NewAuthOptions(azureSettings)

	// TODO: #555 configure on-behalf-of authentication if enabled in AzureSettings
	// authOpts.AddTokenProvider(azcredentials.AzureAuthClientSecretObo, logshipauth.NewOnBehalfOfAccessTokenProvider)

	// scopes, err := getLogshipScopes(azureSettings, credentials, dsSettings.ClusterURL)
	// if err != nil {
	// 	return nil, err
	// }
	// authOpts.Scopes(scopes)

	clientOpts, err := instanceSettings.HTTPClientOptions()
	if err != nil {
		return nil, fmt.Errorf("error creating http client: %w", err)
	}
	clientOpts.Timeouts.Timeout = dsSettings.QueryTimeout

	// azhttpclient.AddAzureAuthentication(&clientOpts, authOpts, credentials)

	httpClient, err := httpclient.NewProvider().New(clientOpts)
	if err != nil {
		return nil, fmt.Errorf("error creating http client: %w", err)
	}

	return httpClient, nil
}