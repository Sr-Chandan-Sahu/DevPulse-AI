import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Users, Shield, Mail, CheckCircle2 } from 'lucide-react';

export function TeamSettingsPage() {
  const { user } = useAuthStore();
  const orgName = user?.organizations?.[0]?.organization_name || 'Acme Global Inc';

  const members = [
    { name: user?.full_name || 'Alex Mercer', email: user?.email || 'admin@devpulse.ai', role: 'OWNER', status: 'Active' },
    { name: 'Sarah Connor', email: 'sconnor@devpulse.ai', role: 'ADMIN', status: 'Active' },
    { name: 'David Chen', email: 'dchen@devpulse.ai', role: 'MEMBER', status: 'Active' },
    { name: 'Elena Rostova', email: 'erostova@devpulse.ai', role: 'VIEWER', status: 'Active' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-400" />
            Team Members & Organization Access
          </h2>
          <p className="text-xs text-slate-400">
            Role-Based Access Control (RBAC) permissions for {orgName}
          </p>
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1F2B3F] rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#0E1524] border-b border-[#1F2B3F] flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active Members ({members.length})
          </h3>
        </div>

        <div className="divide-y divide-[#1F2B3F]/50">
          {members.map((m, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between hover:bg-[#151D2F] transition-colors text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-600/20 text-brand-400 border border-brand-500/30 flex items-center justify-center font-bold">
                  {m.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-white">{m.name}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    <span>{m.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-brand-500/10 text-brand-300 border border-brand-500/20">
                  {m.role}
                </span>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{m.status}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
