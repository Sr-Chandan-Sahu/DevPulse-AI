import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  Zap,
  Clock,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  Sparkles,
  Server,
  ShieldAlert,
} from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { api } from '../../lib/api';
import { OverviewDashboardData } from '../../types';
import { MetricCard } from '../../components/ui/MetricCard';
import { ChartCard } from '../../components/ui/ChartCard';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { MethodBadge, LatencyBadge } from '../../components/ui/Badge';
import { formatLatency, formatNumber, formatPercent } from '../../lib/utils';
import { Link } from 'react-router-dom';

export function OverviewDashboard() {
  const { activeProject, timeRange, selectedEnvironment, selectedService } = useProjectStore();
  const projectId = activeProject?.id;

  const { data, isLoading, error } = useQuery<OverviewDashboardData>({
    queryKey: ['metrics-overview', projectId, timeRange, selectedEnvironment, selectedService],
    queryFn: async () => {
      if (!projectId) return null as any;
      return api.get<OverviewDashboardData>(
        `/api/v1/projects/${projectId}/metrics/overview?time_range=${timeRange}&environment=${selectedEnvironment}&service=${selectedService}`
      );
    },
    enabled: !!projectId,
    refetchInterval: 5000,
  });

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const { summary, series, slowest_endpoints, top_error_endpoints, service_health } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner if Active Anomalies */}
      {summary.active_anomalies_count > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-rose-500/20 via-amber-500/15 to-transparent border border-rose-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                {summary.active_anomalies_count} Active AI Anomaly Detected
              </div>
              <div className="text-xs text-slate-400">
                Google Gemini has isolated root cause evidence across your microservices.
              </div>
            </div>
          </div>
          <Link
            to={`/projects/${projectId}/anomalies`}
            className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Investigate Root Cause</span>
          </Link>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Throughput"
          value={`${summary.requests_per_second.toFixed(1)} req/s`}
          subtitle={`${formatNumber(summary.total_requests)} total requests`}
          icon={Activity}
          accentColor="text-brand-400"
          trend={{ value: '+4.2%', isPositive: true, label: 'vs previous' }}
        />

        <MetricCard
          title="P95 Latency"
          value={formatLatency(summary.p95_latency_ms)}
          subtitle={`P50: ${formatLatency(summary.p50_latency_ms)} • P99: ${formatLatency(summary.p99_latency_ms)}`}
          icon={Clock}
          accentColor="text-amber-400"
          trend={{
            value: summary.p95_latency_ms > 500 ? '+18%' : '-2.1%',
            isPositive: summary.p95_latency_ms <= 500,
            label: 'latency SLA',
          }}
        />

        <MetricCard
          title="Error Rate"
          value={formatPercent(summary.error_rate)}
          subtitle={`Avg Latency: ${formatLatency(summary.avg_latency_ms)}`}
          icon={AlertTriangle}
          accentColor={summary.error_rate > 0.05 ? 'text-rose-400' : 'text-emerald-400'}
          trend={{
            value: summary.error_rate > 0.05 ? '+2.4%' : '-0.5%',
            isPositive: summary.error_rate <= 0.05,
            label: 'error budget',
          }}
        />

        <MetricCard
          title="AI Anomalies"
          value={summary.active_anomalies_count}
          subtitle="Real-time 3-sigma & Rule Flags"
          icon={Sparkles}
          accentColor="text-indigo-400"
        />
      </div>

      {/* Primary Telemetry Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Throughput Series */}
        <ChartCard
          title="Traffic & Request Rate (RPS)"
          subtitle="Real-time requests processed across services"
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="rpsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2B3F" vertical={false} />
              <XAxis dataKey="timestamp" stroke="#64748B" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0E1524', borderColor: '#1F2B3F', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94A3B8' }}
              />
              <Area type="monotone" dataKey="rps" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#rpsGradient)" name="RPS" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Latency Percentiles Series */}
        <ChartCard
          title="Latency Percentiles (P50, P95, P99)"
          subtitle="Response time breakdown in milliseconds"
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2B3F" vertical={false} />
              <XAxis dataKey="timestamp" stroke="#64748B" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0E1524', borderColor: '#1F2B3F', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94A3B8' }}
              />
              <Line type="monotone" dataKey="p50_latency" stroke="#10B981" strokeWidth={1.5} dot={false} name="P50 Latency" />
              <Line type="monotone" dataKey="p95_latency" stroke="#F59E0B" strokeWidth={2} dot={false} name="P95 Latency" />
              <Line type="monotone" dataKey="p99_latency" stroke="#F43F5E" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="P99 Latency" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bottlenecks & Failure Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Slowest Endpoints */}
        <div className="bg-[#151D2F] border border-[#1F2B3F] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Slowest Endpoints</h3>
              <p className="text-xs text-slate-400">Endpoints with highest latency impact</p>
            </div>
            <Link
              to={`/projects/${projectId}/requests`}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#1F2B3F]/50">
            {slowest_endpoints.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No requests recorded yet.</div>
            ) : (
              slowest_endpoints.map((ep, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <MethodBadge method={ep.method} />
                    <span className="font-mono text-slate-200 truncate">{ep.path}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#111827] text-slate-400">
                      {ep.service}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-400 text-[11px]">{ep.call_count} calls</span>
                    <LatencyBadge ms={ep.p95_latency_ms} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Failing Endpoints */}
        <div className="bg-[#151D2F] border border-[#1F2B3F] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Top Error Endpoints</h3>
              <p className="text-xs text-slate-400">Endpoints producing 4xx and 5xx failures</p>
            </div>
            <Link
              to={`/projects/${projectId}/errors`}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              <span>View errors</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#1F2B3F]/50">
            {top_error_endpoints.length === 0 ? (
              <div className="py-8 text-center text-xs text-emerald-400/80 font-medium">
                Zero errors detected in this time range!
              </div>
            ) : (
              top_error_endpoints.map((ep, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <MethodBadge method={ep.method} />
                    <span className="font-mono text-slate-200 truncate">{ep.path}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-rose-400 font-mono font-bold">
                      {formatPercent(ep.error_rate)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                      {ep.error_count} errors
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Service Health Grid */}
      <div className="bg-[#151D2F] border border-[#1F2B3F] rounded-xl p-5 shadow-lg">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Server className="w-4 h-4 text-brand-400" />
          Microservice Topology & Health
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(service_health).map(([srv, health]) => (
            <div
              key={srv}
              className="p-3 rounded-lg bg-[#0E1524] border border-[#1F2B3F] flex items-center justify-between"
            >
              <span className="text-xs font-medium text-slate-300">{srv}</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                  health === 'HEALTHY'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
                }`}
              >
                {health}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
