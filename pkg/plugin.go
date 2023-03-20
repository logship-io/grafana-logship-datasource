package main

import (
	"os"

	logship "github.com/grafana/grafana-logship-datasource/pkg/logship"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
)

func main() {
	backend.SetupPluginEnvironment("grafana-grafana-logship-datasource")

	if err := datasource.Manage("azure-data-explorer", logship.NewDatasource, datasource.ManageOpts{}); err != nil {
		log.DefaultLogger.Error(err.Error())
		os.Exit(1)
	}
}
