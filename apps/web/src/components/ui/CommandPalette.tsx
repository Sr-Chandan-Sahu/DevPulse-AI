import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Activity, Zap, Database, HardDrive, AlertTriangle, FileCode, Terminal, Sparkles, X } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useTelemetryStreamStore } from '../../stores/telemetryStreamStore';

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { activeProject } = useProjectStore();
  const { triggerSimulatedIncident } = useTelemetryStreamStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // toggle or open
        }
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const projectId = activeProject?.id || 'demo';

  const commands = [
    { label: 'Overview Dashboard', icon: Activity, path: `/projects/${projectId}` },
    { label: 'Live Requests Explorer', icon: Zap, path: `/projects/${projectId}/requests` },
    { label: 'Distributed Traces & Waterfall', icon: Activity, path: `/projects/${projectId}/traces` },
    { label: 'Interactive Flame Graph', icon: Activity, path: `/projects/${projectId}/flamegraph` },
    { label: 'Logs Explorer', icon: Terminal, path: `/projects/${projectId}/logs` },
    { label: 'Error Analytics & Fingerprints', icon: AlertTriangle, path: `/projects/${projectId}/errors` },
    { label: 'Database Query Analytics', icon: Database, path: `/projects/${projectId}/database` },
    { label: 'Redis Cache Telemetry', icon: HardDrive, path: `/projects/${projectId}/redis` },
    { label: 'AI Anomaly Center', icon: Sparkles, path: `/projects/${projectId}/anomalies` },
    { label: 'AI Incident Assistant (Chat)', icon: Sparkles, path: `/projects/${projectId}/ai` },
    { label: 'OpenAPI 3.1 & Swagger Viewer', icon: FileCode, path: `/projects/${projectId}/api-docs` },
    { label: 'Alert Rules & Notifications', icon: AlertTriangle, path: `/projects/${projectId}/alerts` },
  ];

  const actions = [
    { label: 'Trigger Incident: Checkout Latency Spike', action: () => triggerSimulatedIncident(projectId, 'checkout_latency') },
    { label: 'Trigger Incident: 500 Payment Error Surge', action: () => triggerSimulatedIncident(projectId, 'error_surge') },
    { label: 'Trigger Incident: Unindexed Database Lockup', action: () => triggerSimulatedIncident(projectId, 'db_slowdown') },
    { label: 'Trigger Incident: Redis Cache Miss Surge', action: () => triggerSimulatedIncident(projectId, 'cache_drop') },
  ];

  const filteredCommands = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );
  const filteredActions = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#111827] border border-[#1F2B3F] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col">
        <div className="flex items-center px-4 py-3 border-b border-[#1F2B3F] bg-[#151D2F]">
          <Search className="w-4 h-4 text-slate-400 mr-2.5" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, route, or incident action..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-[#1F2B3F]/40">
          <div className="py-1">
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Navigation
            </div>
            {filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    navigate(cmd.path);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-[#1A2438] hover:text-white transition-colors text-left"
                >
                  <Icon className="w-4 h-4 text-brand-400" />
                  <span>{cmd.label}</span>
                </button>
              );
            })}
          </div>

          <div className="py-1">
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Simulated Incident Triggers
            </div>
            {filteredActions.map((act, idx) => (
              <button
                key={idx}
                onClick={() => {
                  act.action();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition-colors text-left font-medium"
              >
                <Zap className="w-4 h-4 text-rose-400" />
                <span>{act.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
