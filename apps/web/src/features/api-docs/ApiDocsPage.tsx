import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProjectStore } from '../../stores/projectStore';
import { api } from '../../lib/api';
import { ApiEndpoint } from '../../types';
import { FileCode, Download, Eye, CheckCircle2, ChevronDown, ChevronRight, Copy, Check, Sparkles } from 'lucide-react';
import { MethodBadge, ServiceBadge } from '../../components/ui/Badge';
import { JSONViewer } from '../../components/ui/JSONViewer';
import { CodeBlock } from '../../components/ui/CodeBlock';

export function ApiDocsPage() {
  const { activeProject } = useProjectStore();
  const projectId = activeProject?.id;
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [viewFormat, setViewFormat] = useState<'interactive' | 'openapi_json'>('interactive');

  const { data: endpoints = [], isLoading } = useQuery<ApiEndpoint[]>({
    queryKey: ['inferred-endpoints', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return api.get<ApiEndpoint[]>(`/api/v1/projects/${projectId}/api-docs/endpoints`);
    },
    enabled: !!projectId,
  });

  const { data: openApiJson } = useQuery<any>({
    queryKey: ['openapi-spec-json', projectId],
    queryFn: async () => {
      if (!projectId) return {};
      return api.get(`/api/v1/projects/${projectId}/api-docs/openapi.json`);
    },
    enabled: !!projectId && viewFormat === 'openapi_json',
  });

  const handleDownloadYaml = () => {
    window.open(`http://localhost:8000/api/v1/projects/${projectId}/api-docs/openapi.yaml`, '_blank');
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(openApiJson, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${activeProject?.slug || 'api'}-openapi.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <FileCode className="w-5 h-5 text-brand-400" />
            Automated OpenAPI & Swagger Generator
          </h2>
          <p className="text-xs text-slate-400">
            Synthesized OpenAPI 3.1 documentation inferred from runtime API traffic
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-[#151D2F] border border-[#1F2B3F] rounded-lg text-xs">
            <button
              onClick={() => setViewFormat('interactive')}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewFormat === 'interactive' ? 'bg-brand-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Interactive Endpoints
            </button>
            <button
              onClick={() => setViewFormat('openapi_json')}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewFormat === 'openapi_json' ? 'bg-brand-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              OpenAPI JSON
            </button>
          </div>

          <button
            onClick={handleDownloadYaml}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151D2F] hover:bg-[#1A2438] border border-[#1F2B3F] text-slate-200 text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-brand-400" />
            <span>Export YAML</span>
          </button>
        </div>
      </div>

      {viewFormat === 'openapi_json' ? (
        <div className="bg-[#111827] border border-[#1F2B3F] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              OpenAPI 3.1.0 Specification
            </span>
            <button
              onClick={handleDownloadJson}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </button>
          </div>
          <CodeBlock code={JSON.stringify(openApiJson, null, 2)} language="json" maxHeight="max-h-[600px]" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-brand-600/10 border border-brand-500/20 rounded-xl text-xs text-brand-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span>
                All schemas below are continuously synthesized from live requests and responses. Inferred fields are flagged.
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">{endpoints.length} Endpoints Discovered</span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 font-mono">Inferring endpoints from traffic...</div>
          ) : endpoints.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-[#111827] border border-[#1F2B3F] rounded-xl">
              No endpoints recorded yet. As traffic flows into DevPulse, OpenAPI specifications will be generated automatically.
            </div>
          ) : (
            <div className="space-y-3">
              {endpoints.map((ep) => {
                const isExpanded = selectedEndpointId === ep.id;
                return (
                  <div
                    key={ep.id}
                    className="bg-[#111827] border border-[#1F2B3F] rounded-xl overflow-hidden shadow-lg transition-all"
                  >
                    {/* Endpoint Title Row */}
                    <div
                      onClick={() => setSelectedEndpointId(isExpanded ? null : ep.id)}
                      className="p-4 flex items-center justify-between cursor-pointer bg-[#151D2F]/60 hover:bg-[#151D2F] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <button className="text-slate-400 hover:text-white">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <MethodBadge method={ep.method} />
                        <span className="font-mono text-xs font-semibold text-slate-200">{ep.path_pattern}</span>
                        <ServiceBadge service={ep.service} />
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-[11px] text-slate-400">{ep.total_calls_observed} calls recorded</span>
                        <div className="flex items-center gap-1">
                          {ep.status_codes_observed.map((sc, i) => (
                            <span key={i} className="px-1.5 py-0.2 rounded bg-[#0E1524] border border-[#1F2B3F] text-[10px] text-emerald-400">
                              {sc}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Schema Inspector */}
                    {isExpanded && (
                      <div className="p-5 border-t border-[#1F2B3F] bg-[#090D14] space-y-5 text-xs">
                        <div className="text-slate-400 font-sans">
                          {ep.description}
                        </div>

                        {ep.schemas.length === 0 ? (
                          <div className="p-4 text-center text-slate-500 bg-[#111827] rounded-lg border border-[#1F2B3F]">
                            No request/response body schemas captured for this endpoint yet.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {ep.schemas.map((s) => (
                              <div key={s.id} className="space-y-2 bg-[#111827] p-4 rounded-xl border border-[#1F2B3F]">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold uppercase tracking-wider text-slate-300 text-[11px]">
                                    {s.schema_type.replace('_', ' ')}
                                  </span>
                                  {s.is_inferred && (
                                    <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono text-[10px]">
                                      Inferred Schema
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-3">
                                  <div>
                                    <div className="text-[10px] text-slate-500 font-semibold mb-1 uppercase">JSON Schema</div>
                                    <CodeBlock code={JSON.stringify(s.json_schema, null, 2)} language="json" maxHeight="max-h-48" />
                                  </div>

                                  {s.example_payload && (
                                    <div>
                                      <div className="text-[10px] text-slate-500 font-semibold mb-1 uppercase">Example Payload</div>
                                      <CodeBlock
                                        code={typeof s.example_payload === 'string' ? s.example_payload : JSON.stringify(s.example_payload, null, 2)}
                                        language="json"
                                        maxHeight="max-h-48"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
