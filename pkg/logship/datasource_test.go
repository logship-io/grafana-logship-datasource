package logship

import (
	"context"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/logsink/grafana-logship-datasource/pkg/logship/models"
	"github.com/stretchr/testify/require"
)

var (
	kustoRequestMock func(url string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, error)
	table            = &models.TableResponse{
		Headers: []string{},
		Columns: []struct {
			Name string "json:\"Name\""
			Type string "json:\"Type\""
		}{},
		Results: []map[string]interface{}{},
	}
)

func TestDatasource(t *testing.T) {
	var logship LogshipBackend
	const UserLogin string = "user-login"
	const ClusterURL string = "base-url"

	t.Run("When running a query the right args should be passed to KustoRequest", func(t *testing.T) {
		logship = LogshipBackend{}
		logship.client = &fakeClient{}
		logship.settings = &models.DatasourceSettings{EnableUserTracking: true, ClusterURL: ClusterURL}
		query := backend.DataQuery{
			RefID:         "",
			QueryType:     "",
			MaxDataPoints: 0,
			Interval:      0,
			TimeRange:     backend.TimeRange{},
			JSON:          []byte(`{"resultFormat": "table","querySource": "schema"}`),
		}
		kustoRequestMock = func(url string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, error) {
			require.Equal(t, ClusterURL+"/v1/rest/query", url)
			require.Contains(t, additionalHeaders, "x-ms-user-id")
			require.Equal(t, UserLogin, additionalHeaders["x-ms-user-id"])
			require.Contains(t, additionalHeaders["x-ms-client-request-id"], UserLogin)
			return table, nil
		}
		res := logship.handleQuery(context.Background(), query, &backend.User{Login: UserLogin})
		require.NoError(t, res.Error)
	})
}

type fakeClient struct{}

// SchemaRequest implements client.LogshipClient
func (*fakeClient) SchemaRequest(ctx context.Context, url string, additionalHeaders map[string]string) ([]models.TableSchema, error) {
	panic("unimplemented")
}

func (c *fakeClient) TestRequest(_ context.Context, _ *models.DatasourceSettings, _ *models.Properties, _ map[string]string) error {
	panic("not implemented")
}

func (c *fakeClient) KustoRequest(_ context.Context, url string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, error) {
	return kustoRequestMock(url, payload, additionalHeaders)
}
