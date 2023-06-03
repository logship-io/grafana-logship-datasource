package client

import (
	"fmt"
	"net/http"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
	"github.com/logsink/grafana-logship-datasource/pkg/logship/models"
)

func newHttpClient(instanceSettings *backend.DataSourceInstanceSettings, dsSettings *models.DatasourceSettings) (*http.Client, error) {
	clientOpts, err := instanceSettings.HTTPClientOptions()
	if err != nil {
		return nil, fmt.Errorf("error creating http client: %w", err)
	}
	clientOpts.Timeouts.Timeout = dsSettings.QueryTimeout

	httpClient, err := httpclient.NewProvider().New(clientOpts)
	if err != nil {
		return nil, fmt.Errorf("error creating http client: %w", err)
	}

	return httpClient, nil
}
