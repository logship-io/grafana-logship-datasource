package client

import (
	"bytes"
	"context"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/grafana/grafana-plugin-sdk-go/backend"

	// 100% compatible drop-in replacement of "encoding/json"
	json "github.com/json-iterator/go"

	"github.com/logsink/grafana-logship-datasource/pkg/logship/client/auth"
	"github.com/logsink/grafana-logship-datasource/pkg/logship/models"
)

type LogshipClient interface {
	WithUserContextFromQuery(ctx context.Context, req *backend.QueryDataRequest) (context.Context, error)
	WithUserContextFromResource(ctx context.Context, req *backend.CallResourceRequest) (context.Context, error)
	WithUserContextFromHealthCheck(ctx context.Context, req *backend.CheckHealthRequest) (context.Context, error)
	TestRequest(ctx context.Context, datasourceSettings *models.DatasourceSettings, properties *models.Properties, additionalHeaders map[string]string) error
	KustoRequest(ctx context.Context, url string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, error)
	SchemaRequest(ctx context.Context, url string, additionalHeaders map[string]string) ([]models.TableSchema, error)
}

var _ LogshipClient = new(Client) // validates interface conformance

// Client is an http.Client used for API requests.
type Client struct {
	userId     uuid.UUID
	auth       auth.LogshipAuth
	httpClient *http.Client
}

// NewClient creates a Grafana Plugin SDK Go Http Client
func New(instanceSettings *backend.DataSourceInstanceSettings, dsSettings *models.DatasourceSettings) (*Client, error) {
	httpClient, err := newHttpClient(instanceSettings, dsSettings)
	if err != nil {
		return nil, err
	}

	auth, err := auth.New(instanceSettings, dsSettings)
	if err != nil {
		return nil, err
	}

	return &Client{
		httpClient: httpClient,
		userId:     uuid.Nil,
		auth:       auth,
	}, nil
}

func (c *Client) WithUserContextFromQuery(ctx context.Context, req *backend.QueryDataRequest) (context.Context, error) {
	return c.auth.WithUserContextFromQueryRequest(ctx, req)
}

func (c *Client) WithUserContextFromResource(ctx context.Context, req *backend.CallResourceRequest) (context.Context, error) {
	return c.auth.WithUserContextFromResourceRequest(ctx, req)
}

func (c *Client) WithUserContextFromHealthCheck(ctx context.Context, req *backend.CheckHealthRequest) (context.Context, error) {
	return c.auth.WithUserContextFromHealthCheck(ctx, req)
}

// TestRequest handles a data source test request in Grafana's Datasource configuration UI.
func (c *Client) TestRequest(ctx context.Context, datasourceSettings *models.DatasourceSettings, properties *models.Properties, additionalHeaders map[string]string) error {
	backend.Logger.Warn("Starting Logship test request:")
	user, err := c.WhoAmIRequest(ctx, datasourceSettings.ClusterURL, additionalHeaders)
	if err != nil {
		backend.Logger.Error("failed to make whoami request: %w", err)
		return err
	}

	backend.Logger.Info("WhoAmI results user: %s", user.UserID)
	s, err := c.SchemaRequest(ctx, datasourceSettings.ClusterURL, additionalHeaders)
	if err != nil {
		backend.Logger.Error("failed to make schema request. %w", err)
	}

	backend.Logger.Info("Schema results : %s", len(s))
	return err
}

func (c *Client) WhoAmIRequest(ctx context.Context, url string, additionalHeaders map[string]string) (*models.WhoAmIResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url+"/whoami", http.NoBody)
	if err != nil {
		return nil, fmt.Errorf("no request instance: %w", err)
	}

	err = c.auth.AuthenticateRequest(ctx, c.httpClient, req)
	if err != nil {
		return nil, fmt.Errorf("failed to authenticate: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	for key, value := range additionalHeaders {
		req.Header.Set(key, value)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()
	err = c.responseAsError(resp)
	if err != nil {
		return nil, err
	}

	var user models.WhoAmIResponse
	err = json.NewDecoder(resp.Body).Decode(&user)
	if err != nil {
		return nil, fmt.Errorf("HTTP %q with malformed whoami response: %s", resp.Status, err)
	}
	return &user, nil
}

func (c *Client) SchemaRequest(ctx context.Context, url string, additionalHeaders map[string]string) ([]models.TableSchema, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf("%s/search/%s/schemas", url, c.userId), http.NoBody)
	if err != nil {
		return nil, fmt.Errorf("no request instance: %w", err)
	}

	err = c.auth.AuthenticateRequest(ctx, c.httpClient, req)
	if err != nil {
		return nil, fmt.Errorf("failed to authenticate: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	for key, value := range additionalHeaders {
		req.Header.Set(key, value)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()
	err = c.responseAsError(resp)
	if err != nil {
		return nil, err
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

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("%s/search/%s/kusto", url, c.userId), bytes.NewReader(buf))
	if err != nil {
		return nil, fmt.Errorf("no request instance: %w", err)
	}

	err = c.auth.AuthenticateRequest(ctx, c.httpClient, req)
	if err != nil {
		return nil, fmt.Errorf("failed to authenticate request to %s: %w", req.URL, err)
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

	err = c.responseAsError(resp)
	if err != nil {
		return nil, err
	}

	return models.TableFromJSON(resp.Body)
}

func (c *Client) responseAsError(resp *http.Response) error {
	switch {
	case resp.StatusCode == http.StatusUnauthorized:
		backend.Logger.Error("HTTP 401 Unauthorized response.", resp.Request.URL)
		c.auth.ClearCache() // Try a re-auth
		return fmt.Errorf("HTTP %q", resp.Status)

	case resp.StatusCode/100 != 2:
		var r models.ErrorResponse
		err := json.NewDecoder(resp.Body).Decode(&r)
		if err != nil {
			backend.Logger.Error("Malformed error response.", resp.StatusCode, resp.Request.URL)
			return fmt.Errorf("HTTP %q with malformed error response: %s", resp.Status, err)
		}

		if len(r.StackTrace) > 0 {
			// backend.Logger.Error("HTTP error response with stack.", resp.StatusCode, resp.Request.URL, r.Message, r.StackTrace)
			return fmt.Errorf("HTTP %q with error message: %q. \nStack: %q", resp.Status, r.Message, r.StackTrace)
		}

		// backend.Logger.Error("HTTP error response.", resp.StatusCode, resp.Request.URL, r.Message)
		return fmt.Errorf("HTTP %q with error message: %q", resp.Status, r.Message)
	}

	return nil
}
