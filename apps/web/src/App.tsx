import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './features/auth/LoginPage';
import { OverviewDashboard } from './features/dashboard/OverviewDashboard';
import { LiveRequestsPage } from './features/requests/LiveRequestsPage';
import { TraceExplorerPage } from './features/traces/TraceExplorerPage';
import { FlameGraphPage } from './features/traces/FlameGraphPage';
import { LogsExplorerPage } from './features/logs/LogsExplorerPage';
import { ErrorAnalyticsPage } from './features/errors/ErrorAnalyticsPage';
import { DatabaseAnalyticsPage } from './features/database/DatabaseAnalyticsPage';
import { RedisAnalyticsPage } from './features/redis/RedisAnalyticsPage';
import { AnomalyDashboardPage } from './features/anomalies/AnomalyDashboardPage';
import { IncidentAssistantPage } from './features/ai/IncidentAssistantPage';
import { ApiDocsPage } from './features/api-docs/ApiDocsPage';
import { AlertsPage } from './features/alerts/AlertsPage';
import { ApiKeysPage } from './features/settings/ApiKeysPage';
import { TeamSettingsPage } from './features/settings/TeamSettingsPage';
import { useProjectStore } from './stores/projectStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

function DashboardRedirect() {
  const { activeProject, projects } = useProjectStore();
  const targetId = activeProject?.id || projects[0]?.id || 'demo';
  return <Navigate to={`/projects/${targetId}`} replace />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardRedirect />} />
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/projects/:projectId" element={<OverviewDashboard />} />
            <Route path="/projects/:projectId/requests" element={<LiveRequestsPage />} />
            <Route path="/projects/:projectId/traces" element={<TraceExplorerPage />} />
            <Route path="/projects/:projectId/flamegraph" element={<FlameGraphPage />} />
            <Route path="/projects/:projectId/logs" element={<LogsExplorerPage />} />
            <Route path="/projects/:projectId/errors" element={<ErrorAnalyticsPage />} />
            <Route path="/projects/:projectId/database" element={<DatabaseAnalyticsPage />} />
            <Route path="/projects/:projectId/redis" element={<RedisAnalyticsPage />} />
            <Route path="/projects/:projectId/anomalies" element={<AnomalyDashboardPage />} />
            <Route path="/projects/:projectId/ai" element={<IncidentAssistantPage />} />
            <Route path="/projects/:projectId/api-docs" element={<ApiDocsPage />} />
            <Route path="/projects/:projectId/alerts" element={<AlertsPage />} />
            <Route path="/settings/api-keys" element={<ApiKeysPage />} />
            <Route path="/settings/team" element={<TeamSettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
