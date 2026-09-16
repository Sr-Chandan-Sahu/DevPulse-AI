import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProjectStore } from '../../stores/projectStore';
import { api } from '../../lib/api';
import { ErrorCluster } from '../../types';
import { AlertTriangle, ChevronDown, ChevronRight, GitCommit, Clock, ArrowRight } from 'lucide-react';
import { ServiceBadge } from '../../components/ui/Badge';
import { CodeBlock } from '../../components/ui/CodeBlock';
import { formatDateTime } from '../../lib/utils';
import { Link } from 'react-router-dom';

export function ErrorAnalyticsPage() {
  const { activeProject } = useProjectStore();
  const projectId = activeProject?.id;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: errors = [], isLoading } = useQuery<ErrorCluster[]>({
    queryKey: ['errors-clusters', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return api.get<ErrorCluster[]>(`/api/v1/projects/${projectId}/errors`);
    },
    enabled: !!projectId,
    refetchInterval: 8000,
  });

  const totalErrors = errors.reduce((acc, e) => acc + e.occurrence_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            Error Analytics & Exception Fingerprints
          </h2>
          <p className="text-xs text-slate-400">
            Automated grouping of recurring 4xx and 5xx exceptions across services
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-[#151D2F] border border-[#1F2B3F] rounded-lg text-xs">
            <span className="text-slate-400">Unique Fingerprints:</span>{' '}
            <span className="font-bold text-white">{errors.length}</span>
          </div>
          <div className="px-3.5 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs">
            <span className="text-rose-300">Total Failures:</span>{' '}
            <span className="font-bold font-mono text-rose-400">{totalErrors}</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 text-xs">Loading error clusters...</div>
      ) : errors.length === 0 ? (
        <div className="p-16 text-center bg-[#151D2F]/50 border border-emerald-500/20 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            ✓
          </div>
          <h3 className="text-sm font-semibold text-white">Zero Active Error Clusters</h3>
          <p className="text-xs text-slate-400 mt-1">All microservice requests are completing successfully.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {errors.map((err) => {
            const isExpanded = expandedId === err.id;
            return (
              <div
                key={err.id}
                className="bg-[#111827] border border-[#1F2B3F] hover:border-[#2A3B55] rounded-xl overflow-hidden shadow-lg transition-all"
              >
                {/* Error Header Bar */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : err.id)}
                  className="p-4 flex items-center justify-between cursor-pointer bg-[#151D2F]/50 hover:bg-[#151D2F] transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                    <button className="text-slate-400 hover:text-white">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-rose-400 truncate">
                          {err.error_type}
                        </span>
                        <ServiceBadge service={err.service} />
                        {err.endpoint && (
                          <span className="text-[11px] font-mono text-slate-400 truncate">
                            {err.endpoint}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-300 font-sans mt-0.5 truncate max-w-2xl">
                        {err.error_message}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0 text-xs font-mono">
                    <div className="text-right">
                      <div className="text-rose-400 font-bold text-sm">{err.occurrence_count}</div>
                      <div className="text-[10px] text-slate-500 font-sans">events</div>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 hidden sm:block">
                      <div>Last: {formatDateTime(err.last_seen)}</div>
                      <div className="text-slate-500">First: {formatDateTime(err.first_seen)}</div>
                    </div>
                  </div>
                </div>

                {/* Expanded Stack Trace & Sample Trace */}
                {isExpanded && (
                  <div className="p-5 border-t border-[#1F2B3F] bg-[#090D14] space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-mono text-slate-400">
                        <span>Fingerprint: <strong className="text-slate-200">{err.fingerprint}</strong></span>
                      </div>
                      {err.sample_trace_id && (
                        <Link
                          to={`/projects/${projectId}/traces`}
                          className="flex items-center gap-1.5 px-3 py-1 rounded bg-brand-600/20 text-brand-300 border border-brand-500/30 hover:bg-brand-600/30 text-xs font-medium"
                        >
                          <GitCommit className="w-3.5 h-3.5" />
                          <span>Inspect Sample Trace ({err.sample_trace_id.slice(0, 8)}...)</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Stack Trace
                      </h4>
                      {err.sample_stack_trace ? (
                        <CodeBlock code={err.sample_stack_trace} language="python" />
                      ) : (
                        <div className="p-4 rounded-lg bg-[#111827] text-xs font-mono text-slate-400 border border-[#1F2B3F]">
                          {err.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
