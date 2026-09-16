import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProjectStore } from '../../stores/projectStore';
import { api } from '../../lib/api';
import { AlertRule, AlertEvent } from '../../types';
import { Bell, Plus, AlertTriangle, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { formatDateTime } from '../../lib/utils';

export function AlertsPage() {
  const { activeProject } = useProjectStore();
  const projectId = activeProject?.id;
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [metricType, setMetricType] = useState('LATENCY_P95');
  const [threshold, setThreshold] = useState('800');
  const [durationWindow, setDurationWindow] = useState('5');
  const [serviceFilter, setServiceFilter] = useState('all');

  const { data: rules = [], isLoading: rulesLoading } = useQuery<AlertRule[]>({
    queryKey: ['alert-rules', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return api.get<AlertRule[]>(`/api/v1/projects/${projectId}/alerts`);
    },
    enabled: !!projectId,
  });

  const { data: events = [] } = useQuery<AlertEvent[]>({
    queryKey: ['alert-events', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return api.get<AlertEvent[]>(`/api/v1/projects/${projectId}/alerts/events`);
    },
    enabled: !!projectId,
    refetchInterval: 8000,
  });

  const createRuleMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/api/v1/projects/${projectId}/alerts`, {
        name: ruleName,
        metric_type: metricType,
        operator: '>',
        threshold_value: parseFloat(threshold),
        duration_window_minutes: parseFloat(durationWindow),
        service_filter: serviceFilter,
        endpoint_filter: '',
        notification_channel: 'in_app',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules', projectId] });
      setShowCreateModal(false);
      setRuleName('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRuleMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            Alert Rules & Triggered Events
          </h2>
          <p className="text-xs text-slate-400">
            Automated threshold evaluation, anomaly notifications, and incident triggers
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Alert Rule</span>
        </button>
      </div>

      {/* Rules Section */}
      <div className="bg-[#111827] border border-[#1F2B3F] rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#0E1524] border-b border-[#1F2B3F] flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active Alert Rules ({rules.length})
          </h3>
        </div>

        <div className="divide-y divide-[#1F2B3F]/50">
          {rulesLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading alert rules...</div>
          ) : rules.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No alert rules configured yet.</div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="p-4 flex items-center justify-between hover:bg-[#151D2F] transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-semibold text-white">{rule.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#1F2B3F] font-mono text-slate-300">
                      {rule.metric_type} {rule.operator} {rule.threshold_value}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span>Window: {rule.duration_window_minutes}m</span>
                    <span>•</span>
                    <span>Service: {rule.service_filter}</span>
                    <span>•</span>
                    <span>Channel: {rule.notification_channel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ENABLED
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Triggered Events History */}
      <div className="bg-[#111827] border border-[#1F2B3F] rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#0E1524] border-b border-[#1F2B3F] flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Triggered Event History
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">Live evaluations</span>
        </div>

        <div className="divide-y divide-[#1F2B3F]/50">
          {events.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">Zero active alert events fired.</div>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="p-4 flex items-center justify-between hover:bg-[#151D2F] transition-colors text-xs">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-white">{ev.message}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Triggered at: {formatDateTime(ev.triggered_at)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono">
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px] font-bold">
                    {ev.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Rule Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Alert Rule"
        description="Configure automated anomaly thresholds and notifications"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Rule Name</label>
            <input
              type="text"
              required
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="e.g. Checkout P95 Latency Breach"
              className="w-full px-3 py-2 bg-[#0E1524] border border-[#1F2B3F] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Metric</label>
              <select
                value={metricType}
                onChange={(e) => setMetricType(e.target.value)}
                className="w-full px-3 py-2 bg-[#0E1524] border border-[#1F2B3F] rounded-lg text-slate-100 focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="LATENCY_P95">P95 Latency (ms)</option>
                <option value="ERROR_RATE">Error Rate (%)</option>
                <option value="5XX_COUNT">5xx Error Count</option>
                <option value="DB_SLOW_QUERY">Slow Query Count</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Threshold Value</label>
              <input
                type="number"
                required
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full px-3 py-2 bg-[#0E1524] border border-[#1F2B3F] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Duration Window</label>
              <select
                value={durationWindow}
                onChange={(e) => setDurationWindow(e.target.value)}
                className="w-full px-3 py-2 bg-[#0E1524] border border-[#1F2B3F] rounded-lg text-slate-100 focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="1">1 Minute</option>
                <option value="5">5 Minutes</option>
                <option value="15">15 Minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Service Filter</label>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[#0E1524] border border-[#1F2B3F] rounded-lg text-slate-100 focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="all">All Services</option>
                <option value="api-gateway">api-gateway</option>
                <option value="order-service">order-service</option>
                <option value="payment-service">payment-service</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 rounded-lg bg-[#151D2F] border border-[#1F2B3F] text-slate-300 font-medium hover:bg-[#1A2438]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createRuleMutation.isPending}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold disabled:opacity-50"
            >
              {createRuleMutation.isPending ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
