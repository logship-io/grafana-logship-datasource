package logship

import (
	"fmt"
	"math/rand"
	"net/http"
	"sort"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
	"github.com/grafana/grafana-plugin-sdk-go/data"

	"github.com/logsink/grafana-logship-datasource/pkg/logship/client"
	"github.com/logsink/grafana-logship-datasource/pkg/logship/models"

	// 100% compatible drop-in replacement of "encoding/json"
	json "github.com/json-iterator/go"
	"golang.org/x/net/context"
)

// LogshipBackend stores reference to plugin and logger
type LogshipBackend struct {
	backend.CallResourceHandler
	client   client.LogshipClient
	settings *models.DatasourceSettings
}

func NewDatasource(instanceSettings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	logship := &LogshipBackend{}

	var jsonData map[string]interface{}
	err := json.Unmarshal(instanceSettings.JSONData, &jsonData)
	if err != nil {
		return nil, fmt.Errorf("unable to get jsonData from instanceSettings: %w", err)
	}

	datasourceSettings := &models.DatasourceSettings{}
	err = datasourceSettings.Load(instanceSettings)
	if err != nil {
		return nil, err
	}
	logship.settings = datasourceSettings

	// azureSettings, err := azsettings.ReadFromEnv()
	// if err != nil {
	// 	backend.Logger.Error("failed to read Logship settings from Grafana", "error", err.Error())
	// 	return nil, err
	// }

	// credentials, err := logshipcredentials.FromDatasourceData(jsonData, instanceSettings.DecryptedSecureJSONData)
	// if err != nil {
	// 	return nil, err
	// } else if credentials == nil {
	// 	credentials = logshipcredentials.GetDefaultCredentials(azureSettings)
	// }

	logshipClient, err := client.New(&instanceSettings, datasourceSettings)
	if err != nil {
		backend.Logger.Error("failed to create Logship client", "error", err.Error())
		return nil, err
	}
	logship.client = logshipClient

	mux := http.NewServeMux()
	logship.registerRoutes(mux)
	logship.CallResourceHandler = httpadapter.New(mux)
	backend.Logger.Info("New Logship Datasource")
	return logship, nil
}

// QueryData is the primary method called by grafana-server
func (logship *LogshipBackend) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	//ctx = azusercontext.WithUserFromQueryReq(ctx, req)
	backend.Logger.Info("Query", "datasource", req.PluginContext.DataSourceInstanceSettings.Name)

	res := backend.NewQueryDataResponse()

	for _, q := range req.Queries {
		res.Responses[q.RefID] = logship.handleQuery(ctx, q, req.PluginContext.User)
	}

	return res, nil
}

func (logship *LogshipBackend) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	return logship.CallResourceHandler.CallResource(ctx /*azusercontext.WithUserFromResourceReq(ctx, req) */, req, sender)
}

// CheckHealth handles health checks
func (logship *LogshipBackend) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	// ctx = azusercontext.WithUserFromHealthCheckReq(ctx, req)
	headers := map[string]string{}
	err := logship.client.TestRequest(ctx, logship.settings, models.NewConnectionProperties(logship.settings, nil), headers)
	if err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: err.Error(),
		}, nil
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Success",
	}, nil
}

func (logship *LogshipBackend) handleQuery(ctx context.Context, q backend.DataQuery, user *backend.User) backend.DataResponse {
	var qm models.QueryModel
	err := json.Unmarshal(q.JSON, &qm)
	if err != nil {
		return backend.DataResponse{Error: fmt.Errorf("malformed request query: %w", err)}
	}

	cs := models.NewCacheSettings(logship.settings, &q, &qm)
	qm.MacroData = models.NewMacroData(cs.TimeRange, q.Interval.Milliseconds())
	if err := qm.Interpolate(); err != nil {
		return backend.DataResponse{Error: err}
	}
	props := models.NewConnectionProperties(logship.settings, cs)

	resp, err := logship.modelQuery(ctx, qm, props, user)
	if err != nil {
		resp.Frames = append(resp.Frames, &data.Frame{
			RefID: q.RefID,
			Meta:  &data.FrameMeta{ExecutedQueryString: qm.Query},
		})
		resp.Error = err
	}
	return resp
}

func (logship *LogshipBackend) modelQuery(ctx context.Context, q models.QueryModel, props *models.Properties, user *backend.User) (backend.DataResponse, error) {
	headers := map[string]string{}
	msClientRequestIDHeader := fmt.Sprintf("KGC.%s;%x", q.QuerySource, rand.Uint64())
	if logship.settings.EnableUserTracking {
		if user != nil {
			msClientRequestIDHeader += fmt.Sprintf(";%v", user.Login)
			headers["x-ms-user-id"] = user.Login
		}
	}
	headers["x-ms-client-request-id"] = msClientRequestIDHeader

	tableRes, err := logship.client.KustoRequest(ctx, logship.settings.ClusterURL, models.RequestPayload{
		Query:       q.Query,
		DB:          q.Database,
		Properties:  props,
		QuerySource: q.QuerySource,
	}, headers)
	if err != nil {
		backend.Logger.Debug("error building kusto request", "error", err.Error())
		return backend.DataResponse{}, err
	}

	if q.Format == "" {
		q.Format = "table"
	}

	var resp backend.DataResponse
	switch q.Format {
	case "table":
		resp.Frames, err = tableRes.ToDataFrames(q.Query)
		if err != nil {
			backend.Logger.Debug("error converting response to data frames", "error", err.Error())
			return resp, fmt.Errorf("error converting response to data frames: %w", err)
		}
	case "time_series":
		index := -1
		for i, t := range tableRes.Columns {
			if t.Type == "DateTime" {
				index = i
				break
			}
		}

		if index >= 0 {
			name := tableRes.Columns[index].Name
			sort.SliceStable(tableRes.Results, func(i, j int) bool {
				a := tableRes.Results[i][name]
				b := tableRes.Results[j][name]
				return a.(string) < b.(string)
			})
		}

		frames, err := tableRes.ToDataFrames(q.Query)
		if err != nil {
			return resp, err
		}

		missing := data.FillMissing{
			Mode:  data.FillModeNull,
			Value: 0.0,
		}

		for _, f := range frames {
			r, err := data.LongToWide(f, &missing)
			if err != nil {
				f.AppendNotices(data.Notice{
					Severity: data.NoticeSeverityWarning,
					Text:     fmt.Sprintf("Returned frame is not a time series, returning table format instead. The response must have at least one datetime field and one numeric field. Error: %e", err),
				})
			}
			resp.Frames = append(resp.Frames, r)
		}

	default:
		resp.Error = fmt.Errorf("unsupported query type: '%v'", q.Format)
	}

	return resp, nil
}
