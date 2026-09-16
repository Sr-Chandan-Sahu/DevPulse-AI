import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProjectStore } from '../../stores/projectStore';
import { api } from '../../lib/api';
import { RequestDetail } from '../../types';
import { Drawer } from '../../components/ui/Drawer';
import { MethodBadge, StatusBadge, LatencyBadge, ServiceBadge } from '../../components/ui/Badge';
import { TraceWaterfall } from '../../components/tracing/TraceWaterfall';
import { JSONViewer } from '../../components/ui/JSONViewer';
import { CodeBlock } from '../../components/ui/CodeBlock';
import { formatDateTime, formatLatency } from '../../lib/utils';
import {
  Globe,
  Clock,
  Database,
  HardDrive,
  GitCommit,
  Terminal,
  ShieldCheck,
  AlertOctagon,
  FileJson,
} from 'lucide-react';

export function RequestDetailPage({
  requestId,
  onClose,
}: {
  requestId: string;
  onClose: () => void;
}) {
  const { activeProject } = useProjectStore();
  const projectId = activeProject?.id;
  const [activeTab, setActiveTab] = useState<'timeline' | 'headers' | 'body' | 'logs'>('timeline');

  const { data, isLoading } = useQuery<RequestDetail>({
    queryKey: ['request-detail', projectId, requestId],
    queryFn: async () => {
      return api.get<RequestDetail>(`/api/v1/projects/${projectId}/requests/${requestId}`);
    },
    enabled: !!projectId && !!requestId,
  });

  return (
    <Drawer
      isOpen={!!requestId}
      onClose={onClose}
      title={
        data ? (
          <div className="flex items-center gap-3">
            <MethodBadge method={data.method} />
            <span className="font-mono text-white text-sm truncate">{data.path}</span>
            <StatusBadge status={data.status_code} />
          </div>
        ) : (
          'Loading Request Detail...'
        )
      }
      subtitle={
        data && (
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-1">
            <span>ID: {data.request_id}</span>
            <span>•</span>
            <span>{formatDateTime(data.timestamp)}</span>
          </div>
        )
      }
      size="xl"
    >
      {isLoading || !data ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          <span className="text-xs font-mono">Fetching full telemetry payload...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Latency Breakdown Bar */}
          <div className="bg-[#151D2F] border border-[#1F2B3F] p-4 rounded-xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Latency Breakdown</span>
              <LatencyBadge ms={data.duration_ms} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#0E1524] rounded-lg border border-[#1F2B3F]">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Clock className="w-3.5 h-3.5 text-brand-400" />
                  <span>Total Duration</span>
                </div>
                <div className="text-base font-bold font-mono text-white">
                  {formatLatency(data.duration_ms)}
                </div>
              </div>

              <div className="p-3 bg-[#0E1524] rounded-lg border border-[#1F2B3F]">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Database className="w-3.5 h-3.5 text-amber-400" />
                  <span>Database</span>
                </div>
                <div className="text-base font-bold font-mono text-amber-300">
                  {formatLatency(data.database_duration_ms)}
                </div>
              </div>

              <div className="p-3 bg-[#0E1524] rounded-lg border border-[#1F2B3F]">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                  <span>Cache (Redis)</span>
                </div>
                <div className="text-base font-bold font-mono text-purple-300">
                  {formatLatency(data.cache_duration_ms)}
                </div>
              </div>

              <div className="p-3 bg-[#0E1524] rounded-lg border border-[#1F2B3F]">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  <span>External APIs</span>
                </div>
                <div className="text-base font-bold font-mono text-sky-300">
                  {formatLatency(data.external_duration_ms)}
                </div>
              </div>
            </div>
          </div>

          {/* Error Banner if Present */}
          {data.error_message && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                <span>Execution Exception: {data.error_type || 'Error'}</span>
              </div>
              <p className="text-xs font-mono">{data.error_message}</p>
              {data.stack_trace && <CodeBlock code={data.stack_trace} language="python" maxHeight="max-h-48" />}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center border-b border-[#1F2B3F] gap-6 text-xs font-semibold">
            {[
              { id: 'timeline', label: `Trace Waterfall (${data.spans.length})` },
              { id: 'headers', label: 'HTTP Headers (Redacted)' },
              { id: 'body', label: 'Payload Body' },
              { id: 'logs', label: `Execution Logs (${data.logs.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2.5 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-brand-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Trace Waterfall */}
          {activeTab === 'timeline' && (
            <div>
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-semibold text-slate-300">Distributed Spans</span>
                <span className="font-mono text-slate-500">Trace ID: {data.trace_id}</span>
              </div>
              <TraceWaterfall spans={data.spans} totalDurationMs={data.duration_ms} />
            </div>
          )}

          {/* Tab 2: Headers */}
          {activeTab === 'headers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Request Headers (PII Masked)
                </h4>
                <JSONViewer data={data.request_headers || {}} />
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Response Headers
                </h4>
                <JSONViewer data={data.response_headers || {}} />
              </div>
            </div>
          )}

          {/* Tab 3: Body Payloads */}
          {activeTab === 'body' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Request Payload (Sanitized)
                </h4>
                {data.request_body ? (
                  <CodeBlock code={data.request_body} language="json" />
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500 bg-[#0E1524] rounded-lg border border-[#1F2B3F]">
                    No request body sent for this {data.method} request.
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Response Payload
                </h4>
                {data.response_body ? (
                  <CodeBlock code={data.response_body} language="json" />
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500 bg-[#0E1524] rounded-lg border border-[#1F2B3F]">
                    No response body payload recorded.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Logs */}
          {activeTab === 'logs' && (
            <div>
              {data.logs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-[#0E1524] rounded-lg border border-[#1F2B3F]">
                  No structured logs attached to this trace execution.
                </div>
              ) : (
                <div className="divide-y divide-[#1F2B3F] bg-[#0E1524] border border-[#1F2B3F] rounded-xl overflow-hidden">
                  {data.logs.map((log, idx) => (
                    <div key={idx} className="p-3 text-xs font-mono flex items-start gap-3">
                      <span className="text-slate-500 shrink-0">{formatDateTime(log.timestamp)}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-semibold text-[10px] shrink-0 ${
                          log.level === 'ERROR' || log.level === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-slate-700/40 text-slate-300'
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-slate-200">{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
