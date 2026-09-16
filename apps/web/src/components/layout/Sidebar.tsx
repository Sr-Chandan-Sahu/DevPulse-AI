import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  Zap,
  GitCommit,
  Flame,
  Terminal,
  AlertTriangle,
  Database,
  HardDrive,
  Sparkles,
  MessageSquare,
  FileCode,
  Bell,
  Key,
  Users,
  Settings,
  Shield,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useProjectStore } from '../../stores/projectStore';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

export function Sidebar() {
  const { activeProject } = useProjectStore();
  const projectId = activeProject?.id || 'demo';

  const telemetryNav: NavItem[] = [
    { label: 'Overview', path: `/projects/${projectId}`, icon: Activity },
    { label: 'Live Requests', path: `/projects/${projectId}/requests`, icon: Zap, badge: 'Live', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
    { label: 'Distributed Traces', path: `/projects/${projectId}/traces`, icon: GitCommit },
    { label: 'Interactive Flame Graph', path: `/projects/${projectId}/flamegraph`, icon: Flame },
    { label: 'Logs Explorer', path: `/projects/${projectId}/logs`, icon: Terminal },
    { label: 'Error Analytics', path: `/projects/${projectId}/errors`, icon: AlertTriangle },
  ];

  const infrastructureNav: NavItem[] = [
    { label: 'Database Analytics', path: `/projects/${projectId}/database`, icon: Database },
    { label: 'Redis Telemetry', path: `/projects/${projectId}/redis`, icon: HardDrive },
  ];

  const aiNav: NavItem[] = [
    { label: 'AI Anomaly Center', path: `/projects/${projectId}/anomalies`, icon: Sparkles, badge: 'Gemini', badgeColor: 'bg-indigo-500/20 text-indigo-300' },
    { label: 'Incident Assistant', path: `/projects/${projectId}/ai`, icon: MessageSquare },
  ];

  const developerNav: NavItem[] = [
    { label: 'OpenAPI & Swagger', path: `/projects/${projectId}/api-docs`, icon: FileCode },
    { label: 'Alert Rules', path: `/projects/${projectId}/alerts`, icon: Bell },
  ];

  const settingsNav: NavItem[] = [
    { label: 'API Keys', path: `/settings/api-keys`, icon: Key },
    { label: 'Team Members', path: `/settings/team`, icon: Users },
  ];

  return (
    <aside className="w-64 bg-[#0E1524] border-r border-[#1F2B3F] flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-[#1F2B3F] gap-3 bg-[#0B0F17]">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white font-bold">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
            DEV PULSE <span className="text-[10px] px-1.5 py-0.2 bg-brand-500/20 text-brand-400 rounded font-mono">AI</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Observability Platform</div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Observability */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Observability & Tracing
          </div>
          <div className="space-y-0.5">
            {telemetryNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === `/projects/${projectId}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group',
                      isActive
                        ? 'bg-brand-600/20 text-white border border-brand-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#151D2F]'
                    )
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-brand-400 transition-colors" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={cn('text-[9px] px-1.5 py-0.2 rounded font-mono', item.badgeColor)}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Storage Telemetry */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Storage & Cache
          </div>
          <div className="space-y-0.5">
            {infrastructureNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group',
                      isActive
                        ? 'bg-brand-600/20 text-white border border-brand-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#151D2F]'
                    )
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-brand-400 transition-colors" />
                    <span>{item.label}</span>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* AI & Diagnostics */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            AI Intelligence
          </div>
          <div className="space-y-0.5">
            {aiNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group',
                      isActive
                        ? 'bg-indigo-600/20 text-white border border-indigo-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#151D2F]'
                    )
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={cn('text-[9px] px-1.5 py-0.2 rounded font-mono', item.badgeColor)}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* API & Alerts */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Developer Tools
          </div>
          <div className="space-y-0.5">
            {developerNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group',
                      isActive
                        ? 'bg-brand-600/20 text-white border border-brand-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#151D2F]'
                    )
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-brand-400 transition-colors" />
                    <span>{item.label}</span>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Settings */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Settings & Access
          </div>
          <div className="space-y-0.5">
            {settingsNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group',
                      isActive
                        ? 'bg-brand-600/20 text-white border border-brand-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#151D2F]'
                    )
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-brand-400 transition-colors" />
                    <span>{item.label}</span>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer / System Status */}
      <div className="p-3 border-t border-[#1F2B3F] bg-[#0B0F17] flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono">Ingest Pipeline: Active</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">v1.0.0</span>
      </div>
    </aside>
  );
}
