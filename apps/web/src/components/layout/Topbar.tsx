import React, { useState } from 'react';
import {
  FolderKanban,
  ChevronDown,
  Search,
  Zap,
  Radio,
  LogOut,
  User as UserIcon,
  Shield,
  Play,
  Flame,
  AlertOctagon,
  Database,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useProjectStore } from '../../stores/projectStore';
import { useTelemetryStreamStore } from '../../stores/telemetryStreamStore';
import { DateRangePicker } from '../ui/DateRangePicker';
import { cn } from '../../lib/utils';

export function Topbar({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const { user, logout } = useAuthStore();
  const { projects, activeProject, setActiveProject, selectedEnvironment, setSelectedEnvironment } = useProjectStore();
  const { isConnected, isStreaming, toggleStreaming, triggerSimulatedIncident, triggerSimulatedTraffic } = useTelemetryStreamStore();
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showIncidentMenu, setShowIncidentMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulateIncident = async (scenario: string) => {
    if (!activeProject) return;
    setIsSimulating(true);
    setShowIncidentMenu(false);
    await triggerSimulatedIncident(activeProject.id, scenario);
    setIsSimulating(false);
  };

  const handleInjectTraffic = async () => {
    if (!activeProject) return;
    setIsSimulating(true);
    await triggerSimulatedTraffic(activeProject.id, 20);
    setIsSimulating(false);
  };

  return (
    <header className="h-16 bg-[#0E1524] border-b border-[#1F2B3F] px-6 flex items-center justify-between shrink-0 select-none z-20">
      {/* Left: Project Selector & Environment */}
      <div className="flex items-center gap-4">
        {/* Project Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#151D2F] border border-[#1F2B3F] hover:border-brand-500/50 text-xs font-semibold text-white transition-all shadow-sm"
          >
            <FolderKanban className="w-4 h-4 text-brand-400" />
            <span>{activeProject?.name || 'Select Project'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProjectMenu && (
            <div className="absolute left-0 mt-2 w-64 bg-[#111827] border border-[#1F2B3F] rounded-xl shadow-2xl py-1.5 z-30 divide-y divide-[#1F2B3F]/40">
              <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                Active Projects
              </div>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveProject(p);
                    setShowProjectMenu(false);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#1A2438] transition-colors',
                    activeProject?.id === p.id ? 'text-brand-400 font-semibold bg-brand-500/10' : 'text-slate-300'
                  )}
                >
                  <span className="truncate">{p.name}</span>
                  {activeProject?.id === p.id && <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Environment Selector */}
        <div className="flex items-center p-0.5 bg-[#111827] border border-[#1F2B3F] rounded-lg text-xs font-mono">
          {['all', 'production', 'staging'].map((env) => (
            <button
              key={env}
              onClick={() => setSelectedEnvironment(env)}
              className={cn(
                'px-2.5 py-1 rounded-md capitalize transition-colors',
                selectedEnvironment === env
                  ? 'bg-[#1F2B3F] text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {env}
            </button>
          ))}
        </div>
      </div>

      {/* Center: Global Search / Command Palette shortcut */}
      <div className="hidden md:flex items-center">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-3 px-4 py-1.5 bg-[#111827] border border-[#1F2B3F] hover:border-slate-600 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-all shadow-inner w-72 justify-between"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span>Search or command...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-[#1F2B3F] border border-[#2A3A55] rounded text-slate-300 font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Simulator Controls, Time Picker, Live Pulse & User Profile */}
      <div className="flex items-center gap-3">
        {/* Incident Simulator Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowIncidentMenu(!showIncidentMenu)}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-all shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-rose-400" />
            <span>Simulate Incident</span>
            <ChevronDown className="w-3 h-3 text-rose-400" />
          </button>

          {showIncidentMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-[#111827] border border-[#1F2B3F] rounded-xl shadow-2xl p-1.5 z-30 space-y-1">
              <div className="px-2.5 py-1 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                Inject Simulated Incidents
              </div>
              <button
                onClick={() => handleSimulateIncident('checkout_latency')}
                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[#1A2438] text-slate-200 flex items-start gap-2.5"
              >
                <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Checkout Latency Spike</div>
                  <div className="text-[10px] text-slate-400">Database lock on orders table (&gt;1200ms)</div>
                </div>
              </button>

              <button
                onClick={() => handleSimulateIncident('error_surge')}
                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[#1A2438] text-slate-200 flex items-start gap-2.5"
              >
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Payment 502 Bad Gateway Wave</div>
                  <div className="text-[10px] text-slate-400">Downstream gateway connection timeout</div>
                </div>
              </button>

              <button
                onClick={() => handleSimulateIncident('db_slowdown')}
                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[#1A2438] text-slate-200 flex items-start gap-2.5"
              >
                <Database className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Unindexed User Search Query</div>
                  <div className="text-[10px] text-slate-400">Full table scan on users table</div>
                </div>
              </button>

              <div className="pt-1 border-t border-[#1F2B3F]">
                <button
                  onClick={handleInjectTraffic}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 flex items-center gap-2 font-medium"
                >
                  <Play className="w-3.5 h-3.5 text-brand-400" />
                  <span>Send 20 Normal Traffic Requests</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Time Range Selector */}
        <DateRangePicker />

        {/* Live Pulse Stream Toggle */}
        <button
          onClick={toggleStreaming}
          className={cn(
            'flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all',
            isStreaming
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-800/40 border-slate-700 text-slate-400'
          )}
          title={isStreaming ? 'Live Stream Active (Click to Pause)' : 'Live Stream Paused'}
        >
          <span className={cn('w-2 h-2 rounded-full', isStreaming ? 'bg-emerald-400 animate-ping' : 'bg-slate-500')} />
          <span>{isStreaming ? 'LIVE' : 'PAUSED'}</span>
        </button>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-8 h-8 rounded-full bg-brand-600 border border-brand-400/30 text-white flex items-center justify-center font-bold text-xs shadow-md"
          >
            {user?.full_name?.charAt(0) || 'A'}
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#111827] border border-[#1F2B3F] rounded-xl shadow-2xl p-2 z-30 divide-y divide-[#1F2B3F]/40">
              <div className="px-3 py-2">
                <div className="text-xs font-semibold text-white truncate">{user?.full_name}</div>
                <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
                <div className="text-[10px] text-brand-400 font-mono mt-1">Lead Architect</div>
              </div>
              <div className="py-1">
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
