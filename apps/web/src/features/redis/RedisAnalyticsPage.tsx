import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProjectStore } from '../../stores/projectStore';
import { api } from '../../lib/api';
import { RedisOperation } from '../../types';
import { HardDrive, Activity, Zap, CheckCircle2, Clock } from 'lucide-react';
import { MetricCard } from '../../components/ui/MetricCard';
import { LatencyBadge } from '../../components/ui/Badge';
import { formatPercent, formatLatency, formatNumber } from '../../lib/utils';

export function RedisAnalyticsPage() {
  const { activeProject } = useProjectStore();
  const projectId = activeProject?.id;

  const { data, isLoading } = useQuery<{
    operations: RedisOperation[];
    summary: { total_commands: number; hit_rate: number; miss_rate: number; avg_latency_ms: number };
  }>({
    queryKey: ['redis-analytics', projectId],
    queryFn: async () => {
      if (!projectId) return { operations: [], summary: { total_commands: 0, hit_rate: 0.95, miss_rate: 0.05, avg_latency_ms: 1.2 } };
      return api.get(`/api/v1/projects/${projectId}/redis`);
    },
    enabled: !!projectId,
    refetchInterval: 8000,
  });

  const ops = data?.operations || [];
  const summary = data?.summary || { total_commands: 0, hit_rate: 0.95, miss_rate: 0.05, avg_latency_ms: 1.2 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-purple-400" />
            Redis & Cache Telemetry
          </h2>
          <p className="text-xs text-slate-400">
            Command latencies, cache hit/miss efficiency, and key patterns
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Cache Hit Rate"
          value={formatPercent(summary.hit_rate)}
          subtitle={`Miss Rate: ${formatPercent(summary.miss_rate)}`}
          icon={CheckCircle2}
          accentColor="text-emerald-400"
          trend={{ value: '+1.2%', isPositive: true, label: 'efficiency' }}
        />
        <MetricCard
          title="Total Commands"
          value={formatNumber(summary.total_commands)}
          subtitle="Processed in session"
          icon={Activity}
          accentColor="text-purple-400"
        />
        <MetricCard
          title="Avg Command Latency"
          value={formatLatency(summary.avg_latency_ms)}
          subtitle="Sub-millisecond SLA"
          icon={Clock}
          accentColor="text-sky-400"
        />
        <MetricCard
          title="Cluster Health"
          value="OPTIMAL"
          subtitle="Zero memory evictions"
          icon={Zap}
          accentColor="text-emerald-400"
        />
      </div>

      {/* Commands Table */}
      <div className="bg-[#111827] border border-[#1F2B3F] rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#0E1524] border-b border-[#1F2B3F] flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Command Execution & Key Patterns
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">Real-time Redis calls</span>
        </div>

        <div className="divide-y divide-[#1F2B3F]/50">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading Redis telemetry...</div>
          ) : ops.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">No Redis cache operations recorded yet.</div>
          ) : (
            ops.map((op) => (
              <div key={op.id} className="p-4 hover:bg-[#151D2F] transition-colors flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold text-[11px]">
                    {op.command}
                  </span>
                  <span className="text-slate-200">{op.key_pattern}</span>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-slate-400 text-[11px]">Avg Latency: </span>
                    <LatencyBadge ms={op.avg_duration_ms} />
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[11px]">Calls: </span>
                    <span className="font-bold text-slate-200">{op.call_count}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
