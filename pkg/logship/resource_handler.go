package logship

import (
	"encoding/json"
	"net/http"

	"github.com/logsink/grafana-logship-datasource/pkg/logship/models"
)

func (logship *LogshipBackend) registerRoutes(mux *http.ServeMux) {
	// mux.HandleFunc("/databases", logship.getDatabases)
	mux.HandleFunc("/schema", logship.getSchema)
}

func (logship *LogshipBackend) getSchema(rw http.ResponseWriter, req *http.Request) {
	if req.Method != "GET" {
		respondWithError(rw, http.StatusMethodNotAllowed, "Invalid method", nil)
		return
	}

	headers := map[string]string{}

	tables, err := logship.client.SchemaRequest(req.Context(), logship.settings.ClusterURL, headers)
	if err != nil {
		respondWithError(rw, http.StatusInternalServerError, "Schema query unsuccessful", err)
		return
	}

	result := models.DatabaseSchemaResponse{
		Name:   "Default",
		Tables: tables,
	}
	
	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(result)
	if err != nil {
		respondWithError(rw, http.StatusInternalServerError, "Internal server error", err)
		// rw.WriteHeader(http.StatusInternalServerError)
	}

}

func (logship *LogshipBackend) getDatabases(rw http.ResponseWriter, req *http.Request) {
	if req.Method != "GET" {
		respondWithError(rw, http.StatusMethodNotAllowed, "Invalid method", nil)
		return
	}

	payload := models.RequestPayload{
		Query: ".show databases",
	}

	headers := map[string]string{}
	response, err := logship.client.KustoRequest(req.Context(), logship.settings.ClusterURL+"/LS-Search-Query/api/kusto", payload, headers)
	if err != nil {
		respondWithError(rw, http.StatusInternalServerError, "Kusto query unsuccessful", err)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(response)
	if err != nil {
		rw.WriteHeader(http.StatusInternalServerError)
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
