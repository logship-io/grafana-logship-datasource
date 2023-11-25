package logship

import (
	"encoding/json"
	"net/http"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/logsink/grafana-logship-datasource/pkg/logship/models"
)

func (logship *LogshipBackend) registerRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/schema", logship.getSchema)
}

func (logship *LogshipBackend) getSchema(rw http.ResponseWriter, req *http.Request) {
	if req.Method != "GET" {
		respondWithError(rw, http.StatusMethodNotAllowed, "Invalid method", nil)
		return
	}

	headers := map[string]string{}
	resp, err := logship.client.KustoRequest(req.Context(), logship.settings.ClusterURL, models.RequestPayload{
		Query:       "schema.tables.schema",
		QuerySource: "grafana-schema",
	}, headers)

	if err != nil {
		respondWithError(rw, http.StatusInternalServerError, "Schema query unsuccessful", err)
		return
	}

	tables := map[string]models.TableSchema{}
	for _, t := range resp.Results {
		tableName, _ := t["TableName"].(string)
		columnName, _ := t["ColumnName"].(string)
		columnType, _ := t["ColumnType"].(string)

		c := models.ColumnSchema{
			Name: columnName,
			Type: columnType,
		}

		val, ok := tables[tableName]
		if ok {
			val.Columns = append(val.Columns, c)
			tables[tableName] = val
		} else {
			tables[tableName] = models.TableSchema{
				Name:    tableName,
				Columns: []models.ColumnSchema{c},
			}
		}
	}

	backend.Logger.Info("done {%w}", tables)
	txs := make([]models.TableSchema, 0, len(tables))
	for _, tx := range tables {
		txs = append(txs, tx)
	}

	result := models.DatabaseSchemaResponse{
		Name:   "Default",
		Tables: txs,
	}

	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(result)
	if err != nil {
		respondWithError(rw, http.StatusInternalServerError, "Internal server error", err)
	}

}

func respondWithError(rw http.ResponseWriter, code int, message string, err error) {
	httpError := models.NewHttpError(message, code, err)
	response, err := json.Marshal(httpError)
	if err != nil {
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}
	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(code)
	_, err = rw.Write(response)
	if err != nil {
		rw.WriteHeader(http.StatusInternalServerError)
	}
}
