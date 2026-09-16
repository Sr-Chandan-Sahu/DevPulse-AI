import React from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { IncidentChat } from '../../components/ai/IncidentChat';
import { MessageSquare, Sparkles } from 'lucide-react';

export function IncidentAssistantPage() {
  const { activeProject } = useProjectStore();
  const projectId = activeProject?.id || 'demo';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            AI Incident Assistant
          </h2>
          <p className="text-xs text-slate-400">
            Interactive troubleshooting chatbot grounded in your system's live metrics & telemetry
          </p>
        </div>
      </div>

      <IncidentChat projectId={projectId} />
    </div>
  );
}
