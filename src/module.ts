import { DataSourcePlugin, DashboardLoadedEvent } from '@grafana/data';
import ConfigEditor from 'components/ConfigEditor';
import { getAppEvents, getDataSourceSrv } from '@grafana/runtime';
import pluginJson from './plugin.json';

import { LogshipDataSource } from './datasource';
import { QueryEditor } from './components/QueryEditor';
import { LogshipDataSourceOptions, LogshipDataSourceSecureOptions, KustoQuery } from './types';
import EditorHelp from 'components/QueryEditor/EditorHelp';
import { analyzeQueries, trackLogshipMonitorDashboardLoaded } from 'tracking';

export const plugin = new DataSourcePlugin<LogshipDataSource, KustoQuery, LogshipDataSourceOptions, LogshipDataSourceSecureOptions>(
  LogshipDataSource
)
  .setConfigEditor(ConfigEditor)
  .setQueryEditorHelp(EditorHelp)
  .setQueryEditor(QueryEditor);

// Track dashboard loads to RudderStack
getAppEvents().subscribe<DashboardLoadedEvent<KustoQuery>>(
  DashboardLoadedEvent,
  ({ payload: { dashboardId, orgId, grafanaVersion, queries } }) => {
    const logshipQueries = queries[pluginJson.id]?.filter((q) => !q.hide);
    if (!logshipQueries?.length) {
      return;
    }

    trackLogshipMonitorDashboardLoaded({
      logship_plugin_version: plugin.meta.info.version,
      grafana_version: grafanaVersion,
      dashboard_id: dashboardId,
      org_id: orgId,
      ...analyzeQueries(logshipQueries, getDataSourceSrv()),
    });
  }
);
