import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProjectStore } from '../../stores/projectStore';
import { api } from '../../lib/api';
import { ApiKey } from '../../types';
import { Key, Plus, Copy, Check, ShieldCheck, Terminal } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { CodeBlock } from '../../components/ui/CodeBlock';
import { formatDateTime } from '../../lib/utils';

export function ApiKeysPage() {
  const { activeProject } = useProjectStore();
  const projectId = activeProject?.id;
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [environment, setEnvironment] = useState('production');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const { data: keys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ['api-keys', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return api.get<ApiKey[]>(`/api/v1/projects/${projectId}/api-keys`);
    },
    enabled: !!projectId,
  });

  const createKeyMutation = useMutation({
    mutationFn: async () => {
      return api.post<ApiKey>(`/api/v1/projects/${projectId}/api-keys`, {
        name: keyName,
        environment,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', projectId] });
      setNewlyCreatedKey(data.raw_key || null);
      setKeyName('');
    },
  });

  const sdkCodeExample = `from fastapi import FastAPI
from devpulse_sdk import DevPulseMiddleware

app = FastAPI()

app.add_middleware(
    DevPulseMiddleware,
    api_key="${keys[0]?.key_prefix || 'dp_live_...'}",
    environment="production",
    service_name="api-service"
)`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Key className="w-5 h-5 text-brand-400" />
            API Keys & Ingestion Credentials
          </h2>
          <p className="text-xs text-slate-400">
            Cryptographic authentication keys for instrumenting SDK middleware
          </p>
        </div>

        <button
          onClick={() => {
            setNewlyCreatedKey(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Generate New Key</span>
        </button>
      </div>

      {/* Keys Table */}
      <div className="bg-[#111827] border border-[#1F2B3F] rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#0E1524] border-b border-[#1F2B3F] flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active Keys ({keys.length})
          </h3>
        </div>

        <div className="divide-y divide-[#1F2B3F]/50">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading API keys...</div>
          ) : keys.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No active keys found.</div>
          ) : (
            keys.map((k) => (
              <div key={k.id} className="p-4 flex items-center justify-between hover:bg-[#151D2F] transition-colors text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{k.name}</span>
                    <span className="font-mono text-slate-400 bg-[#0E1524] px-2 py-0.5 rounded border border-[#1F2B3F]">
                      {k.key_prefix}••••••••••••••••••••••••
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono">
                    <span>Env: <strong className="text-slate-200 capitalize">{k.environment}</strong></span>
                    <span>•</span>
                    <span>Created: {formatDateTime(k.created_at)}</span>
                  </div>
                </div>

                <div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">
                    ACTIVE
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SDK Integration Quickstart */}
      <div className="bg-[#111827] border border-[#1F2B3F] rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-brand-400" />
          Python SDK Quickstart
        </h3>
        <p className="text-xs text-slate-400">
          Add the <code className="text-brand-300 font-mono">DevPulseMiddleware</code> to your FastAPI, Starlette, or ASGI application:
        </p>
        <CodeBlock code={sdkCodeExample} language="python" />
      </div>

      {/* Create Key Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Generate Ingestion API Key"
        description="Creates a new key with SHA-256 validation"
      >
        {newlyCreatedKey ? (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                API Key Generated Successfully
              </div>
              <p className="text-[11px] text-slate-300">
                Please copy your raw API key now. For security purposes, it will never be displayed again.
              </p>
              <div className="font-mono bg-[#090D14] p-3 rounded-lg border border-[#1F2B3F] select-all text-white break-all">
                {newlyCreatedKey}
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold"
            >
              Done
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createKeyMutation.mutate();
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block text-slate-300 font-medium mb-1">Key Name</label>
              <input
                type="text"
                required
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. Production Ingestion Gateway"
                className="w-full px-3 py-2 bg-[#0E1524] border border-[#1F2B3F] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full px-3 py-2 bg-[#0E1524] border border-[#1F2B3F] rounded-lg text-slate-100 focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
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
                disabled={createKeyMutation.isPending}
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold disabled:opacity-50"
              >
                {createKeyMutation.isPending ? 'Generating...' : 'Generate Key'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
