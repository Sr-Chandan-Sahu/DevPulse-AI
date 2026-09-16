import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProjectStore } from '../../stores/projectStore';
import { api } from '../../lib/api';
import { PaginatedRequestsResponse, RequestSummary, Span } from '../../types';
import { TraceWaterfall } from '../../components/tracing/TraceWaterfall';
import { FlameGraph } from '../../components/tracing/FlameGraph';
import { MethodBadge, StatusBadge, LatencyBadge, ServiceBadge } from '../../components/ui/Badge';
import { FilterBar } from '../../components/ui/FilterBar';
import { formatDateTime, formatLatency } from '../../lib/utils';
import { GitCommit, Flame, List, Clock, Database, Globe } from 'lucide-react';

export function TraceExplorerPage() {
  const { activeProject } = useProjectStore();
  const projectId = activeProject?.id;

  const [search, setSearch] = useState('');
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'waterfall' | 'flamegraph'>('waterfall');

  // Fetch recent traces
  const { data: requestsData, isLoading: reqsLoading } = useQuery<PaginatedRequestsResponse>({
    queryKey: ['traces-list', projectId, search],
    queryFn: async () => {
      if (!projectId) return { items: [], total: 0, page: 1, page_size: 25, total_pages: 1 };
      let url = `/api/v1/projects/${projectId}/requests?page=1&page_size=25`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      return api.get<PaginatedRequestsResponse>(url);
    },
    enabled: !!projectId,
  });

  // Default to first trace if none selected
  React.useEffect(() => {
    if (!selectedTraceId && requestsData?.items && requestsData.items.length > 0) {
      setSelectedTraceId(requestsData.items[0].trace_id);
    }
  }, [requestsData, selectedTraceId]);

  // Fetch spans for selected trace
  const { data: traceDetail, isLoading: traceLoading } = useQuery<{
    trace_id: string;
    total_duration_ms: number;
    spans: Span[];
  }>({
    queryKey: ['trace-spans', projectId, selectedTraceId],
    queryFn: async () => {
      if (!projectId || !selectedTraceId) return null as any;
      return api.get(`/api/v1/projects/${projectId}/traces/${selectedTraceId}`);
    },
    enabled: !!projectId && !!selectedTraceId,
  });

  const tracesList = requestsData?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-brand-400" />
            Distributed Trace Explorer
          </h2>
          <p className="text-xs text-slate-400">
            End-to-end distributed transaction waterfalls and interactive flame graphs
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center p-1 bg-[#151D2F] border border-[#1F2B3F] rounded-lg text-xs">
          <button
            onClick={() => setViewMode('waterfall')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
              viewMode === 'waterfall' ? 'bg-brand-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Waterfall</span>
          </button>
          <button
            onClick={() => setViewMode('flamegraph')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
              viewMode === 'flamegraph' ? 'bg-brand-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Flame Graph</span>
          </button>
        </div>
      </div>

      <FilterBar
        searchQuery={search}
        onSearchChange={(q) => setSearch(q)}
        searchPlaceholder="Search by trace ID, endpoint, or service..."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Traces List */}
        <div className="lg:col-span-4 bg-[#111827] border border-[#1F2B3F] rounded-xl overflow-hidden shadow-lg flex flex-col h-[650px]">
          <div className="p-3 bg-[#0E1524] border-b border-[#1F2B3F] text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Recent Traces ({tracesList.length})
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#1F2B3F]/50">
            {reqsLoading ? (
              <div className="p-6 text-center text-xs text-slate-500">Loading traces...</div>
            ) : tracesList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No traces match query.</div>
            ) : (
              tracesList.map((req) => {
                const isSelected = selectedTraceId === req.trace_id;
                return (
                  <div
                    key={req.trace_id}
                    onClick={() => setSelectedTraceId(req.trace_id)}
                    className={`p-3.5 cursor-pointer transition-colors text-xs space-y-1.5 ${
                      isSelected ? 'bg-brand-600/15 border-l-4 border-brand-500' : 'hover:bg-[#151D2F]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <MethodBadge method={req.method} />
                        <span className="font-mono text-slate-200 font-medium truncate">{req.path}</span>
                      </div>
                      <StatusBadge status={req.status_code} />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{formatDateTime(req.timestamp)}</span>
                      <LatencyBadge ms={req.duration_ms} />
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                      <ServiceBadge service={req.service} />
                      <span className="font-mono truncate max-w-[120px]">{req.trace_id}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Trace Waterfall / Flame Graph Inspector */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {traceLoading || !traceDetail ? (
            <div className="h-[650px] bg-[#111827] border border-[#1F2B3F] rounded-xl flex items-center justify-center text-slate-500 text-xs font-mono">
              Loading trace visualization...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Trace Header Banner */}
              <div className="bg-[#151D2F] border border-[#1F2B3F] p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-mono">Trace ID: {traceDetail.trace_id}</div>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    {traceDetail.spans.length} spans recorded across microservices
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Total Latency</div>
                    <div className="text-sm font-bold font-mono text-emerald-400">
                      {formatLatency(traceDetail.total_duration_ms)}
                    </div>
                  </div>
                </div>
              </div>

              {/* View Component */}
              {viewMode === 'waterfall' ? (
                <TraceWaterfall
                  spans={traceDetail.spans}
                  totalDurationMs={traceDetail.total_duration_ms}
                />
              ) : (
                <FlameGraph
                  spans={traceDetail.spans}
                  totalDurationMs={traceDetail.total_duration_ms}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
