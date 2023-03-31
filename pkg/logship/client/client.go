package client

import (
	"bytes"
	"context"
	"fmt"
	"net/http"

	"github.com/grafana/grafana-plugin-sdk-go/backend"

	// 100% compatible drop-in replacement of "encoding/json"
	json "github.com/json-iterator/go"

	"github.com/logsink/grafana-logship-datasource/pkg/logship/models"
)

type LogshipClient interface {
	TestRequest(ctx context.Context, datasourceSettings *models.DatasourceSettings, properties *models.Properties, additionalHeaders map[string]string) error
	KustoRequest(ctx context.Context, url string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, error)
	SchemaRequest(ctx context.Context, url string, additionalHeaders map[string]string) ([]models.TableSchema, error)
}

var _ LogshipClient = new(Client) // validates interface conformance

// Client is an http.Client used for API requests.
type Client struct {
	httpClient *http.Client
}

// NewClient creates a Grafana Plugin SDK Go Http Client
func New(instanceSettings *backend.DataSourceInstanceSettings, dsSettings *models.DatasourceSettings) (*Client, error) {
	httpClient, err := newHttpClient(instanceSettings, dsSettings)
	if err != nil {
		return nil, err
	}
	return &Client{httpClient: httpClient}, nil
}

// TestRequest handles a data source test request in Grafana's Datasource configuration UI.
func (c *Client) TestRequest(ctx context.Context, datasourceSettings *models.DatasourceSettings, properties *models.Properties, additionalHeaders map[string]string) error {
	_, err := c.SchemaRequest(ctx, datasourceSettings.ClusterURL, additionalHeaders)
	return err
}

func (c *Client) SchemaRequest(ctx context.Context, url string, additionalHeaders map[string]string) ([]models.TableSchema, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url+"/LS-Search-Query/api/tables/00000000-0000-0000-0000-000000000000", http.NoBody)
	if err != nil {
		return nil, fmt.Errorf("no request instance: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	// req.Header.Set("x-ms-app", "Grafana-Logship")
	for key, value := range additionalHeaders {
		req.Header.Set(key, value)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()
	backend.Logger.Error("Response %s      - - %s", resp.Request.URL, resp.StatusCode)
	switch {
	case resp.StatusCode == http.StatusUnauthorized:
		// HTTP 401 has no error body
		return nil, fmt.Errorf("HTTP %q", resp.Status)

	case resp.StatusCode/100 != 2:
		var r models.ErrorResponse
		err := json.NewDecoder(resp.Body).Decode(&r)
		if err != nil {
			return nil, fmt.Errorf("HTTP %q with malformed error response: %s", resp.Status, err)
		}
		return nil, fmt.Errorf("HTTP %q: %q", resp.Status, r.Error.Message)
	}

	return models.SchemaFromJSON(resp.Body)
}

// KustoRequest executes a Kusto Query language
// and returns a TableResponse. If there is a query syntax error, the error message inside
// the API's JSON error response is returned as well (if available).
func (c *Client) KustoRequest(ctx context.Context, url string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, error) {
	buf, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url+"/LS-Search-Query/api/kusto", bytes.NewReader(buf))
	if err != nil {
		return nil, fmt.Errorf("no request instance: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	if payload.QuerySource == "" {
		payload.QuerySource = "unspecified"
	}
	for key, value := range additionalHeaders {
		req.Header.Set(key, value)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	switch {
	case resp.StatusCode == http.StatusUnauthorized:
		// HTTP 401 has no error body
		return nil, fmt.Errorf("HTTP %q", resp.Status)

	case resp.StatusCode/100 != 2:
		var r models.ErrorResponse
		err := json.NewDecoder(resp.Body).Decode(&r)
		if err != nil {
			return nil, fmt.Errorf("HTTP %q with malformed error response: %s", resp.Status, err)
		}
		return nil, fmt.Errorf("HTTP %q: %q", resp.Status, r.Error.Message)
	}

	return models.TableFromJSON(resp.Body)
}
