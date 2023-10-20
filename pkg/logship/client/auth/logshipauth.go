package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/logsink/grafana-logship-datasource/pkg/logship/models"
)

type LogshipAuth interface {
	AuthenticateRequest(ctx context.Context, client *http.Client, req *http.Request) error
	WithUserContextFromQueryRequest(ctx context.Context, req *backend.QueryDataRequest) (context.Context, error)
	WithUserContextFromResourceRequest(ctx context.Context, req *backend.CallResourceRequest) (context.Context, error)
	WithUserContextFromHealthCheck(ctx context.Context, req *backend.CheckHealthRequest) (context.Context, error)
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
	case "oboOAuth":
		{
			return NewOAuthOnBehalfOfAuth(settings, datasource)
		}
	}

	return nil, fmt.Errorf("unknown auth format: %s", datasource.AuthType)
}

func logNoopSetUserContext(ctx context.Context, name string, source string) context.Context {
	backend.Logger.Debug(fmt.Sprintf("Setting [%s] [%s] user context.", name, source))
	return ctx
}

func NewEmptyAuth(_settings backend.DataSourceInstanceSettings) LogshipAuth {
	return &LogshipEmptyAuth{}
}

func (a *LogshipEmptyAuth) AuthenticateRequest(ctx context.Context, client *http.Client, req *http.Request) error {
	backend.Logger.Debug("[NoAuth] Authenticating request.")
	return nil
}

func (a *LogshipEmptyAuth) ClearCache() {
	backend.Logger.Debug("Clearing [NoAuth] token cache.")
}

func (a *LogshipEmptyAuth) WithUserContextFromQueryRequest(ctx context.Context, req *backend.QueryDataRequest) (context.Context, error) {
	return logNoopSetUserContext(ctx, "NoAuth", "query"), nil
}

func (*LogshipEmptyAuth) WithUserContextFromResourceRequest(ctx context.Context, req *backend.CallResourceRequest) (context.Context, error) {
	return logNoopSetUserContext(ctx, "NoAuth", "resource"), nil
}

func (*LogshipEmptyAuth) WithUserContextFromHealthCheck(ctx context.Context, req *backend.CheckHealthRequest) (context.Context, error) {
	return logNoopSetUserContext(ctx, "NoAuth", "health"), nil
}

var _ LogshipAuth = new(LogshipJwtAuth) // validates interface conformance
type LogshipJwtAuth struct {
	token string
	user  string
	pass  string
	host  string
}

func (*LogshipJwtAuth) WithUserContextFromQueryRequest(ctx context.Context, req *backend.QueryDataRequest) (context.Context, error) {
	return logNoopSetUserContext(ctx, "JWT", "query"), nil
}

func (*LogshipJwtAuth) WithUserContextFromResourceRequest(ctx context.Context, req *backend.CallResourceRequest) (context.Context, error) {
	return logNoopSetUserContext(ctx, "JWT", "resource"), nil
}

func (*LogshipJwtAuth) WithUserContextFromHealthCheck(ctx context.Context, req *backend.CheckHealthRequest) (context.Context, error) {
	return logNoopSetUserContext(ctx, "JWT", "health"), nil
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
		err := a.authenticateJwt(client)
		if err != nil {
			return fmt.Errorf("failed to authenticate JWT token: %w", err)
		}
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", a.token))
	return nil
}

func (a *LogshipJwtAuth) ClearCache() {
	a.token = ""
}

func (a *LogshipJwtAuth) authenticateJwt(client *http.Client) error {
	body := models.JwtTokenRequest{
		Username: a.user,
		Password: a.pass,
	}

	buf, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to serialize JWT auth request: %w", err)
	}

	req, err := http.NewRequest("POST", fmt.Sprintf("%s/auth/token", a.host), bytes.NewReader(buf))
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

var _ LogshipAuth = new(LogshipOAuthOnBehalfOfAuth) // validates interface conformance
type LogshipOAuthOnBehalfOfAuth struct {
	tokenEndpoint string
	clientId      string
	clientSecret  string
	scope         string
	tokens        map[string]accessToken
	host          string
}

// WithUserContext implements LogshipAuth.
func (*LogshipOAuthOnBehalfOfAuth) WithUserContextFromQueryRequest(ctx context.Context, req *backend.QueryDataRequest) (context.Context, error) {
	backend.Logger.Debug("[OAuth] [query] Setting user context.")
	token := strings.Fields(req.GetHTTPHeader(backend.OAuthIdentityTokenHeaderName))
	idToken := req.GetHTTPHeader(backend.OAuthIdentityIDTokenHeaderName) // present if user's token includes an ID token
	return withContextFromOAuthToken(ctx, token, idToken)
}

func (*LogshipOAuthOnBehalfOfAuth) WithUserContextFromResourceRequest(ctx context.Context, req *backend.CallResourceRequest) (context.Context, error) {
	backend.Logger.Debug("[OAuth] [resource] Setting user context.")
	token := strings.Fields(req.GetHTTPHeader(backend.OAuthIdentityTokenHeaderName))
	idToken := req.GetHTTPHeader(backend.OAuthIdentityIDTokenHeaderName) // present if user's token includes an ID token
	return withContextFromOAuthToken(ctx, token, idToken)
}

func (*LogshipOAuthOnBehalfOfAuth) WithUserContextFromHealthCheck(ctx context.Context, req *backend.CheckHealthRequest) (context.Context, error) {
	backend.Logger.Debug("[OAuth] [health] Setting user context.")
	token := strings.Fields(req.GetHTTPHeader(backend.OAuthIdentityTokenHeaderName))
	idToken := req.GetHTTPHeader(backend.OAuthIdentityIDTokenHeaderName) // present if user's token includes an ID token
	return withContextFromOAuthToken(ctx, token, idToken)
}

func withContextFromOAuthToken(ctx context.Context, accessTokens []string, idToken string) (context.Context, error) {
	ctx = context.WithValue(ctx, oAuthTokenKey{}, accessTokens)
	ctx = context.WithValue(ctx, oAuthIdTokenKey{}, idToken)
	return ctx, nil
}

type oAuthTokenKey struct{}
type oAuthIdTokenKey struct{}

type accessToken struct {
	accessToken  string
	refreshToken string
	expiry       time.Time
}

func NewOAuthOnBehalfOfAuth(settings *backend.DataSourceInstanceSettings, datasource *models.DatasourceSettings) (LogshipAuth, error) {
	clientId := strings.TrimSpace(datasource.ClientId)
	tokenEndpoint := strings.TrimSpace(datasource.TokenEndpoint)
	clientSecret := strings.TrimSpace(settings.DecryptedSecureJSONData["clientSecret"])

	return &LogshipOAuthOnBehalfOfAuth{
		tokenEndpoint: tokenEndpoint,
		clientId:      clientId,
		clientSecret:  clientSecret,
		tokens:        map[string]accessToken{},
		host:          datasource.ClusterURL,
		scope:         datasource.Scope,
	}, nil
}

func (a *LogshipOAuthOnBehalfOfAuth) AuthenticateRequest(ctx context.Context, client *http.Client, req *http.Request) error {
	backend.Logger.Info("[OAuth] Authenticating request")
	token := ctx.Value(oAuthTokenKey{}).([]string)
	var (
		grafanaAccessToken = token[1]
	)

	// backend.Logger.Info("[OAuth] Token %s: %s", tokenType, grafanaAccessToken)
	cached, ok := a.tokens[grafanaAccessToken]
	if !ok || cached.expiry.Before(time.Now()) {
		delete(a.tokens, grafanaAccessToken)
		result, err := a.authenticateOAuth(ctx, client, grafanaAccessToken)
		if err != nil {
			return err
		}

		a.tokens[grafanaAccessToken] = *result
	}

	cached, ok = a.tokens[grafanaAccessToken]
	if !ok {
		return fmt.Errorf("unable to retrieve OAuth access token")
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", cached.accessToken))
	return nil
}

func (a *LogshipOAuthOnBehalfOfAuth) ClearCache() {
	for k := range a.tokens {
		delete(a.tokens, k)
	}
}

func (a *LogshipOAuthOnBehalfOfAuth) authenticateOAuth(ctx context.Context, client *http.Client, token string) (*accessToken, error) {
	assertion := ctx.Value(oAuthTokenKey{}).([]string)[1]
	backend.Logger.Info("[OAuth] Requesting OBO OAuth Token", assertion)

	body := url.Values{}
	body.Set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer")
	body.Set("client_id", a.clientId)
	body.Set("client_secret", a.clientSecret)
	body.Set("assertion", assertion)
	body.Set("scope", a.scope)
	body.Set("requested_token_use", "on_behalf_of")

	req, err := http.NewRequest("POST", a.tokenEndpoint, strings.NewReader(body.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create OAuth token request. %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve OAuth token. %w", err)
	}

	defer resp.Body.Close()

	switch {
	case resp.StatusCode == http.StatusUnauthorized:
		return nil, fmt.Errorf("HTTP %q", resp.Status)

	case resp.StatusCode/100 != 2:
		body, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			fmt.Println("Error reading response body:", err)
			return nil, err
		}

		bodyStr := string(body)
		return nil, fmt.Errorf("HTTP %q with error message: %q", resp.Status, bodyStr)
	}

	var response models.OAuth2OboTokenResponse
	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		return nil, fmt.Errorf("HTTP %q with malformed JWT authorize response: %s", resp.Status, err)
	}

	backend.Logger.Info("Successful OAuth auth for user %v", response.AccessToken)
	return &accessToken{
		accessToken:  response.AccessToken,
		refreshToken: response.RefreshToken,
		expiry:       time.Now().Add(time.Duration(response.ExpiresIn) * time.Second),
	}, nil
}
