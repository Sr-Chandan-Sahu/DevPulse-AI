import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProjectStore } from '../../stores/projectStore';
import { api } from '../../lib/api';
import { PaginatedRequestsResponse, Span } from '../../types';
import { FlameGraph } from '../../components/tracing/FlameGraph';
import { Flame } from 'lucide-react';
import { formatDateTime, formatLatency } from '../../lib/utils';
import { MethodBadge, StatusBadge } from '../../components/ui/Badge';

export function FlameGraphPage() {
  const { activeProject } = useProjectStore();
  const projectId = activeProject?.id;
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  const { data: requestsData } = useQuery<PaginatedRequestsResponse>({
    queryKey: ['traces-list', projectId],
    queryFn: async () => {
      if (!projectId) return { items: [], total: 0, page: 1, page_size: 20, total_pages: 1 };
      return api.get<PaginatedRequestsResponse>(`/api/v1/projects/${projectId}/requests?page=1&page_size=20`);
    },
    enabled: !!projectId,
  });

  React.useEffect(() => {
    if (!selectedTraceId && requestsData?.items && requestsData.items.length > 0) {
      setSelectedTraceId(requestsData.items[0].trace_id);
    }
  }, [requestsData, selectedTraceId]);

  const { data: traceDetail, isLoading } = useQuery<{
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-400" />
            Interactive Flame Graph Visualizer
          </h2>
          <p className="text-xs text-slate-400">
            Hierarchical call stacks with duration scaling, pan/zoom, and search filtering
          </p>
        </div>

        {/* Trace Picker */}
        {requestsData?.items && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Select Trace:</span>
            <select
              value={selectedTraceId || ''}
              onChange={(e) => setSelectedTraceId(e.target.value)}
              className="bg-[#151D2F] border border-[#1F2B3F] rounded-lg text-xs text-slate-200 px-3 py-1.5 focus:outline-none focus:border-brand-500 font-mono"
            >
              {requestsData.items.map((r) => (
                <option key={r.trace_id} value={r.trace_id}>
                  {r.method} {r.path} ({formatLatency(r.duration_ms)})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoading || !traceDetail ? (
        <div className="h-96 bg-[#111827] border border-[#1F2B3F] rounded-xl flex items-center justify-center text-slate-500 text-xs font-mono">
          Loading Flame Graph...
        </div>
      ) : (
        <FlameGraph
          spans={traceDetail.spans}
          totalDurationMs={traceDetail.total_duration_ms}
        />
      )}
    </div>
  );
}
