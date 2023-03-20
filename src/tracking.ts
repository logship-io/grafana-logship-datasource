import { DataSourceInstanceSettings } from '@grafana/data';
import { DataSourceSrv, reportInteraction } from '@grafana/runtime';
import { LogshipDataSourceOptions, EditorMode, FormatOptions, KustoQuery } from 'types';
import { AzureAuthType, AzureCredentials } from './components/ConfigEditor/AzureCredentials';

/**
 * Loaded the first time a dashboard containing Logship queries is loaded (not on every render)
 * Note: The queries used here are the ones pre-migration and pre-filterQuery
 *
 * This allows answering questions about:
 * - the adoption of the plugin features
 * - stats about number of Logship dashboards loaded, number of users
 * - stats about the grafana and plugins versions used by our users
 *
 * Dashboard: https://ops.grafana.net/d/Ad0pti0N/data-sources-adoption-tracking?orgId=1
 * Changelog:
 * - 4.1.7: Initial version
 */
export const trackLogshipMonitorDashboardLoaded = (props: LogshipDashboardLoadedProps) => {
  const record: Record<string, unknown> = {
    logship_plugin_version: props.logship_plugin_version,
    grafana_version: props.grafana_version,
    dashboard_id: props.dashboard_id,
    org_id: props.org_id,
  };
  reportInteraction('grafana_ds_logship_dashboard_loaded', record);
};

export type LogshipCounters = {
  /** number of queries using the "Table" format  */
  table_queries: number;
  /** number of queries using the "Time Series" format  */
  time_series_queries: number;
  /** number of queries using the "Logship Time Series" format  */
  logship_time_series_queries: number;
  /** number of queries using the query builder  */
  query_builder_queries: number;
  /** number of queries using the Kusto editor  */
  raw_queries: number;
  /** number of queries using On-Behalf-Of authentication */
  on_behalf_of_queries: number;
  /** number of queries using a timeout different than the default */
  queries_with_custom_timeout: number;
  /** number of queries using Logship dynamic caching */
  dynamic_caching_queries: number;
  /** number of queries using weak data consistency (not default) */
  weak_data_consistency_queries: number;
  /** number of queries using the Kusto editor by default (not default) */
  queries_with_default_raw_editor: number;
  /** number of queries using a custom schema mapping */
  queries_with_managed_schema: number;
};

export interface LogshipDashboardLoadedProps extends LogshipCounters {
  logship_plugin_version?: string;
  grafana_version?: string;
  dashboard_id: string;
  org_id?: number;
}

export const analyzeQueries = (queries: KustoQuery[], datasourceSrv: DataSourceSrv): LogshipCounters => {
  const counters = {
    table_queries: 0,
    time_series_queries: 0,
    logship_time_series_queries: 0,
    query_builder_queries: 0,
    raw_queries: 0,
    on_behalf_of_queries: 0,
    queries_with_custom_timeout: 0,
    dynamic_caching_queries: 0,
    weak_data_consistency_queries: 0,
    queries_with_default_raw_editor: 0,
    queries_with_managed_schema: 0,
  };

  const datasources: { [key: string]: DataSourceInstanceSettings<Partial<LogshipDataSourceOptions>> | undefined } = {};
  queries.forEach((query) => {
    // Query features
    switch (query.resultFormat) {
      case FormatOptions.table:
        counters.table_queries++;
        break;
      case FormatOptions.timeSeries:
        counters.time_series_queries++;
        break;
      case FormatOptions.logshipTimeSeries:
        counters.logship_time_series_queries++;
        break;
    }
    query.rawMode ? counters.raw_queries++ : counters.query_builder_queries++;

    // Data source features
    let dsSettings = datasources[JSON.stringify(query.datasource)];
    if (!dsSettings) {
      dsSettings = datasourceSrv.getInstanceSettings(query.datasource);
      datasources[JSON.stringify(query.datasource)] = dsSettings;
    }
    if (dsSettings) {
      if (getCredentialsAuthType(dsSettings) === 'clientsecret-obo') {
        counters.on_behalf_of_queries++;
      }
      if (dsSettings.jsonData?.queryTimeout) {
        counters.queries_with_custom_timeout++;
      }
      if (dsSettings.jsonData?.dynamicCaching) {
        counters.dynamic_caching_queries++;
      }
      if (dsSettings.jsonData?.dataConsistency === 'weakconsistency') {
        counters.weak_data_consistency_queries++;
      }
      if (dsSettings.jsonData?.defaultEditorMode === EditorMode.Raw) {
        counters.queries_with_default_raw_editor++;
      }
      if (dsSettings.jsonData?.useSchemaMapping) {
        counters.queries_with_managed_schema++;
      }
    }
  });

  return counters;
};

function getCredentialsAuthType(options: DataSourceInstanceSettings<any>): AzureAuthType | undefined {
  if (!options?.jsonData) {
    return undefined;
  }

  const credentials = options.jsonData.azureCredentials as AzureCredentials | undefined;

  if (!credentials) {
    return options.jsonData.onBehalfOf ? 'clientsecret-obo' : 'clientsecret';
  }

  return credentials.authType;
}
