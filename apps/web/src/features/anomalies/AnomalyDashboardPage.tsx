import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProjectStore } from '../../stores/projectStore';
import { api } from '../../lib/api';
import { Anomaly } from '../../types';
import { Sparkles, ShieldAlert, CheckCircle2, Clock, ArrowRight, Eye, RefreshCw } from 'lucide-react';
import { SeverityBadge, ServiceBadge } from '../../components/ui/Badge';
import { AIInsightCard } from '../../components/ai/AIInsightCard';
import { formatDateTime } from '../../lib/utils';

export function AnomalyDashboardPage() {
  const { activeProject } = useProjectStore();
  const projectId = activeProject?.id;
  const queryClient = useQueryClient();

  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);

  const { data: anomalies = [], isLoading, refetch, isRefetching } = useQuery<Anomaly[]>({
    queryKey: ['anomalies', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return api.get<Anomaly[]>(`/api/v1/projects/${projectId}/anomalies`);
    },
    enabled: !!projectId,
    refetchInterval: 8000,
  });

  const analyzeMutation = useMutation({
    mutationFn: async (anomalyId: string) => {
      return api.post<any>(`/api/v1/projects/${projectId}/anomalies/${anomalyId}/analyze`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['anomalies', projectId] });
      if (selectedAnomaly) {
        setSelectedAnomaly((prev) => (prev ? { ...prev, ai_analysis: data } : null));
      }
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (anomalyId: string) => {
      return api.post(`/api/v1/projects/${projectId}/anomalies/${anomalyId}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies', projectId] });
      setSelectedAnomaly(null);
    },
  });

  const handleAnalyze = (anom: Anomaly) => {
    setSelectedAnomaly(anom);
    if (!anom.ai_analysis) {
      analyzeMutation.mutate(anom.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            AI Anomaly & Root Cause Investigation Center
          </h2>
          <p className="text-xs text-slate-400">
            Real-time multi-signal deviation detection investigated by Google Gemini
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 rounded-lg bg-[#151D2F] border border-[#1F2B3F] hover:bg-[#1A2438] text-slate-300"
          title="Refresh Anomalies"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-brand-400' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-xs text-slate-500 font-mono">Loading anomaly telemetry...</div>
      ) : anomalies.length === 0 ? (
        <div className="p-16 text-center bg-[#151D2F]/50 border border-emerald-500/20 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No Active Anomalies Detected</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            All services are operating within baseline thresholds. Use the Topbar "Simulate Incident" tool to test real-time AI investigations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left List of Anomalies */}
          <div className="lg:col-span-5 space-y-3">
            {anomalies.map((anom) => {
              const isSelected = selectedAnomaly?.id === anom.id;
              return (
                <div
                  key={anom.id}
                  onClick={() => setSelectedAnomaly(anom)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : 'bg-[#111827] border-[#1F2B3F] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={anom.severity} />
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1F2B3F] text-slate-300">
                        {anom.anomaly_type}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {formatDateTime(anom.detected_at)}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-white">{anom.title}</h4>
                    <div className="flex items-center gap-2 mt-1 font-mono text-[11px] text-slate-400">
                      <ServiceBadge service={anom.service} />
                      <span className="truncate">{anom.endpoint}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#1F2B3F]/60 text-xs">
                    <div className="font-mono text-[11px] text-rose-400 font-semibold">
                      +{anom.deviation_percent.toFixed(0)}% deviation
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyze(anom);
                      }}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{anom.ai_analysis ? 'View RCA' : 'Analyze with Gemini'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Detail Pane */}
          <div className="lg:col-span-7">
            {selectedAnomaly ? (
              <div className="space-y-4">
                {/* Actions Header */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#151D2F] border border-[#1F2B3F]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Status:</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {selectedAnomaly.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!selectedAnomaly.ai_analysis && (
                      <button
                        onClick={() => analyzeMutation.mutate(selectedAnomaly.id)}
                        disabled={analyzeMutation.isPending}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-md"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{analyzeMutation.isPending ? 'Analyzing with Gemini...' : 'Run Root Cause Analysis'}</span>
                      </button>
                    )}

                    {selectedAnomaly.status === 'ACTIVE' && (
                      <button
                        onClick={() => resolveMutation.mutate(selectedAnomaly.id)}
                        disabled={resolveMutation.isPending}
                        className="px-3 py-1.5 rounded-lg bg-[#0E1524] border border-[#1F2B3F] hover:bg-[#1A2438] text-slate-300 text-xs font-semibold transition-colors"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>

                {/* AI Root Cause Analysis Card */}
                {selectedAnomaly.ai_analysis ? (
                  <AIInsightCard analysis={selectedAnomaly.ai_analysis} />
                ) : (
                  <div className="p-12 text-center bg-[#111827] border border-[#1F2B3F] rounded-2xl space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">Root Cause Analysis Not Yet Generated</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Click the button above to run deep diagnostic inference over the collected telemetry with Google Gemini.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-96 flex flex-col items-center justify-center bg-[#111827] border border-[#1F2B3F] rounded-2xl text-slate-500 text-xs">
                Select an anomaly from the left panel to inspect signals and AI diagnostics.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
