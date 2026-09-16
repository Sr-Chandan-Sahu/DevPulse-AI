import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useProjectStore } from '../../stores/projectStore';
import { api } from '../../lib/api';
import { DatabaseQuery } from '../../types';
import { Database, Sparkles, AlertTriangle, Clock, CheckCircle2, Copy, Check } from 'lucide-react';
import { LatencyBadge } from '../../components/ui/Badge';
import { MetricCard } from '../../components/ui/MetricCard';
import { Modal } from '../../components/ui/Modal';
import { CodeBlock } from '../../components/ui/CodeBlock';
import { formatLatency } from '../../lib/utils';

export function DatabaseAnalyticsPage() {
  const { activeProject } = useProjectStore();
  const projectId = activeProject?.id;

  const [selectedQueryForAI, setSelectedQueryForAI] = useState<DatabaseQuery | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);

  const { data, isLoading } = useQuery<{
    queries: DatabaseQuery[];
    summary: { total_queries_tracked: number; total_slow_queries: number; avg_db_duration_ms: number };
  }>({
    queryKey: ['database-analytics', projectId],
    queryFn: async () => {
      if (!projectId) return { queries: [], summary: { total_queries_tracked: 0, total_slow_queries: 0, avg_db_duration_ms: 0 } };
      return api.get(`/api/v1/projects/${projectId}/database`);
    },
    enabled: !!projectId,
    refetchInterval: 8000,
  });

  const explainMutation = useMutation({
    mutationFn: async (query: DatabaseQuery) => {
      return api.post(`/api/v1/projects/${projectId}/database/explain`, {
        statement: query.statement,
        table_name: query.table_name,
        avg_duration_ms: query.avg_duration_ms,
      });
    },
    onSuccess: (data) => {
      setAiResult(data);
    },
  });

  const handleExplain = (query: DatabaseQuery) => {
    setSelectedQueryForAI(query);
    setAiResult(null);
    explainMutation.mutate(query);
  };

  const queries = data?.queries || [];
  const summary = data?.summary || { total_queries_tracked: 0, total_slow_queries: 0, avg_db_duration_ms: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-400" />
            Database Query Performance
          </h2>
          <p className="text-xs text-slate-400">
            SQL execution durations, table scans, slow queries, and AI index recommendations
          </p>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Queries Tracked"
          value={summary.total_queries_tracked}
          subtitle="Across PostgreSQL / MySQL"
          icon={Database}
          accentColor="text-amber-400"
        />
        <MetricCard
          title="Slow Queries (&gt; 200ms)"
          value={summary.total_slow_queries}
          subtitle="Triggering latency deviations"
          icon={AlertTriangle}
          accentColor={summary.total_slow_queries > 0 ? 'text-rose-400' : 'text-emerald-400'}
        />
        <MetricCard
          title="Average Query Latency"
          value={formatLatency(summary.avg_db_duration_ms)}
          subtitle="Aggregated across all operations"
          icon={Clock}
          accentColor="text-sky-400"
        />
      </div>

      {/* Queries Table */}
      <div className="bg-[#111827] border border-[#1F2B3F] rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#0E1524] border-b border-[#1F2B3F] flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Slowest Database Queries
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">Ranked by avg duration</span>
        </div>

        <div className="divide-y divide-[#1F2B3F]/50">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">Analyzing database query telemetry...</div>
          ) : queries.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">No database queries recorded yet.</div>
          ) : (
            queries.map((q) => (
              <div key={q.id} className="p-4 hover:bg-[#151D2F] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {q.operation}
                    </span>
                    <span className="text-xs font-mono text-slate-400">Table: <strong className="text-slate-200">{q.table_name}</strong></span>
                    {q.slow_count > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-mono">
                        {q.slow_count} slow calls
                      </span>
                    )}
                  </div>
                  <pre className="text-xs font-mono text-slate-200 bg-[#090D14] p-2.5 rounded-lg border border-[#1F2B3F] overflow-x-auto">
                    <code>{q.statement}</code>
                  </pre>
                </div>

                <div className="flex items-center gap-6 shrink-0 md:justify-end">
                  <div className="text-right font-mono text-xs">
                    <div className="text-slate-400 text-[11px]">Avg Latency</div>
                    <LatencyBadge ms={q.avg_duration_ms} />
                  </div>

                  <div className="text-right font-mono text-xs">
                    <div className="text-slate-400 text-[11px]">Max Latency</div>
                    <span className="font-bold text-slate-200">{formatLatency(q.max_duration_ms)}</span>
                  </div>

                  <div className="text-right font-mono text-xs">
                    <div className="text-slate-400 text-[11px]">Calls</div>
                    <span className="font-bold text-slate-200">{q.call_count}</span>
                  </div>

                  <button
                    onClick={() => handleExplain(q)}
                    className="px-3 py-2 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Explain with AI</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI Query Explain Modal */}
      <Modal
        isOpen={!!selectedQueryForAI}
        onClose={() => setSelectedQueryForAI(null)}
        title="Google Gemini Query Optimization Advisor"
        description="Automated SQL index advisory & query execution plan diagnostics"
        maxWidth="lg"
      >
        {explainMutation.isPending ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Sparkles className="w-8 h-8 text-indigo-400 animate-spin" />
            <span className="text-xs font-mono">Analyzing SQL schema and execution metrics with Gemini...</span>
          </div>
        ) : aiResult ? (
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-xl bg-[#0E1524] border border-[#1F2B3F] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-indigo-300 uppercase tracking-wider text-[11px]">
                  Bottleneck Diagnostics
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                  {aiResult.issue_type}
                </span>
              </div>
              <p className="text-slate-200 leading-relaxed">{aiResult.summary}</p>
              <div className="text-slate-400 text-[11px] pt-1">
                <strong>Estimated Impact:</strong> {aiResult.estimated_impact}
              </div>
            </div>

            {/* Recommended Indexes */}
            {aiResult.recommended_indexes && aiResult.recommended_indexes.length > 0 && (
              <div>
                <h4 className="font-semibold uppercase tracking-wider text-emerald-400 text-[11px] mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Recommended DDL Indexes
                </h4>
                <div className="space-y-2">
                  {aiResult.recommended_indexes.map((idxSql: string, i: number) => (
                    <CodeBlock key={i} code={idxSql} language="sql" />
                  ))}
                </div>
              </div>
            )}

            {/* Refactoring Advice */}
            {aiResult.query_refactoring_advice && (
              <div className="p-4 rounded-xl bg-[#0E1524] border border-[#1F2B3F]">
                <div className="font-semibold uppercase tracking-wider text-slate-400 text-[11px] mb-1">
                  Query Refactoring Guidance
                </div>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {aiResult.query_refactoring_advice}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
