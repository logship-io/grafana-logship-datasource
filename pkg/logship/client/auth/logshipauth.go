package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/logsink/grafana-logship-datasource/pkg/logship/models"
)

type LogshipAuth interface {
	AuthenticateRequest(ctx context.Context, client *http.Client, req *http.Request) error
	Authenticate(ctx context.Context, client *http.Client) error
	ClearCache()
}

var _ LogshipAuth = new(LogshipEmptyAuth) // validates interface conformance
type LogshipEmptyAuth struct{}

func New(settings *backend.DataSourceInstanceSettings, datasource *models.DatasourceSettings) (LogshipAuth, error) {
	switch datasource.AuthType {
	case "none":
		{
			return &LogshipEmptyAuth{}, nil
		}
	case "jwt":
		{
			return NewJwtAuth(settings, datasource)
		}
	}

	return nil, fmt.Errorf("unknown auth format: %s", datasource.AuthType)
}

func NewEmptyAuth(_settings backend.DataSourceInstanceSettings) LogshipAuth {
	backend.Logger.Info("Empty Authenticator")
	return &LogshipEmptyAuth{}
}

func (a *LogshipEmptyAuth) AuthenticateRequest(ctx context.Context, client *http.Client, req *http.Request) error {
	// noop
	return nil
}

func (a *LogshipEmptyAuth) Authenticate(ctx context.Context, client *http.Client) error {
	// noop
	return nil
}

func (a *LogshipEmptyAuth) ClearCache() {
	backend.Logger.Info("Clearing auth token cache.")
}

var _ LogshipAuth = new(LogshipJwtAuth) // validates interface conformance
type LogshipJwtAuth struct {
	token string
	user  string
	pass  string
	host  string
}

func NewJwtAuth(settings *backend.DataSourceInstanceSettings, datasource *models.DatasourceSettings) (LogshipAuth, error) {
	user := strings.TrimSpace(datasource.Username)
	pass := strings.TrimSpace(settings.DecryptedSecureJSONData["pass"])

	return &LogshipJwtAuth{
		token: "",
		user:  user,
		pass:  pass,
		host:  datasource.ClusterURL,
	}, nil
}

func (a *LogshipJwtAuth) AuthenticateRequest(ctx context.Context, client *http.Client, req *http.Request) error {
	if len(a.token) == 0 {
		err := a.Authenticate(ctx, client)
		if err != nil {
			return fmt.Errorf("failed to authenticate JWT token: %w", err)
		}
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", a.token))
	return nil
}

func (a *LogshipJwtAuth) Authenticate(ctx context.Context, client *http.Client) error {
	err := a.authenticateJwt(ctx, client)
	if err != nil {
		return fmt.Errorf("failed to retreive JWT token. %w", err)
	}

	return nil
}

func (a *LogshipJwtAuth) ClearCache() {
	a.token = ""
}

func (a *LogshipJwtAuth) authenticateJwt(ctx context.Context, client *http.Client) error {
	body := models.JwtTokenRequest{
		Username: a.user,
		Password: a.pass,
	}

	buf, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to serialize JWT auth request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("%s/auth/token", a.host), bytes.NewReader(buf))
	if err != nil {
		return fmt.Errorf("failed to create JWT auth request. %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to retrieve JWT token. %w", err)
	}

	switch {
	case resp.StatusCode == http.StatusUnauthorized:
		backend.Logger.Error("HTTP 401 Unauthorized response.", resp.Request.URL)
		return fmt.Errorf("HTTP %q", resp.Status)

	case resp.StatusCode/100 != 2:
		var r models.ErrorResponse
		err := json.NewDecoder(resp.Body).Decode(&r)
		if err != nil {
			backend.Logger.Error("Malformed error response.", resp.StatusCode, resp.Request.URL)
			return fmt.Errorf("HTTP %q with malformed error response: %s", resp.Status, err)
		}

		if len(r.StackTrace) > 0 {
			backend.Logger.Error("HTTP error response with stack.", resp.StatusCode, resp.Request.URL, r.Message, r.StackTrace)
			return fmt.Errorf("HTTP %q with error message: %q. \nStack: %q", resp.Status, r.Message, r.StackTrace)
		}

		backend.Logger.Error("HTTP error response.", resp.StatusCode, resp.Request.URL, r.Message)
		return fmt.Errorf("HTTP %q with error message: %q", resp.Status, r.Message)
	}

	var token models.JwtTokenResponse
	err = json.NewDecoder(resp.Body).Decode(&token)
	if err != nil {
		return fmt.Errorf("HTTP %q with malformed JWT authorize response: %s", resp.Status, err)
	}

	backend.Logger.Info("Successful JWT auth for user %v", token.UserId)
	backend.Logger.Info(fmt.Sprintf("Successful JWT token %v", token.Token))
	a.token = token.Token
	return nil
}
