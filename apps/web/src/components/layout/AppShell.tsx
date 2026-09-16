import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useParams } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from '../ui/CommandPalette';
import { useAuthStore } from '../../stores/authStore';
import { useProjectStore } from '../../stores/projectStore';
import { useTelemetryWebSocket } from '../../hooks/useTelemetryWebSocket';

export function AppShell() {
  const { user, token, isLoading: authLoading, fetchMe } = useAuthStore();
  const { projects, activeProject, fetchProjects } = useProjectStore();
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (token) {
      fetchProjects();
    }
  }, [token, fetchProjects]);

  // Connect WebSocket to active project
  useTelemetryWebSocket(activeProject?.id);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          <span className="text-xs font-mono">Initializing DevPulse AI Console...</span>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-[#0B0F17] overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onOpenCommandPalette={() => setShowCommandPalette(true)} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0B0F17]">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
    </div>
  );
}
