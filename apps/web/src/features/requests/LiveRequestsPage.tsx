import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import { useTelemetryStreamStore } from '../../stores/telemetryStreamStore';
import { api } from '../../lib/api';
import { RequestSummary, PaginatedRequestsResponse } from '../../types';
import { DataTable, Column } from '../../components/ui/DataTable';
import { FilterBar } from '../../components/ui/FilterBar';
import { MethodBadge, StatusBadge, LatencyBadge, ServiceBadge } from '../../components/ui/Badge';
import { formatDateTime, formatLatency } from '../../lib/utils';
import { Zap, GitCommit } from 'lucide-react';
import { RequestDetailPage } from './RequestDetailPage';

export function LiveRequestsPage() {
  const { activeProject } = useProjectStore();
  const { liveRequests } = useTelemetryStreamStore();
  const projectId = activeProject?.id;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('all');
  const [statusCode, setStatusCode] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery<PaginatedRequestsResponse>({
    queryKey: ['requests', projectId, page, search, method, statusCode, selectedService],
    queryFn: async () => {
      if (!projectId) return { items: [], total: 0, page: 1, page_size: 25, total_pages: 1 };
      let url = `/api/v1/projects/${projectId}/requests?page=${page}&page_size=25`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (method !== 'all') url += `&method=${method}`;
      if (statusCode !== 'all') url += `&status_code=${statusCode}`;
      if (selectedService !== 'all') url += `&service=${selectedService}`;
      return api.get<PaginatedRequestsResponse>(url);
    },
    enabled: !!projectId,
    refetchInterval: 8000,
  });

  // Combine live stream buffer with fetched database items
  const displayItems = React.useMemo(() => {
    const fetched = data?.items || [];
    if (page === 1 && !search && method === 'all' && statusCode === 'all' && selectedService === 'all') {
      const existingIds = new Set(fetched.map((r) => r.id));
      const freshLive = liveRequests.filter((r) => !existingIds.has(r.id));
      return [...freshLive, ...fetched];
    }
    return fetched;
  }, [data, liveRequests, page, search, method, statusCode, selectedService]);

  const columns: Column<RequestSummary>[] = [
    {
      header: 'Timestamp',
      accessor: (row) => (
        <span className="font-mono text-slate-400 text-[11px]">
          {formatDateTime(row.timestamp)}
        </span>
      ),
    },
    {
      header: 'Method',
      accessor: (row) => <MethodBadge method={row.method} />,
    },
    {
      header: 'Path / Route',
      accessor: (row) => (
        <div className="font-mono text-slate-200 font-medium truncate max-w-xs">
          {row.path}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status_code} />,
    },
    {
      header: 'Duration',
      accessor: (row) => <LatencyBadge ms={row.duration_ms} />,
    },
    {
      header: 'DB / Cache',
      accessor: (row) => (
        <span className="font-mono text-[11px] text-slate-400">
          {row.database_duration_ms > 0 ? `${row.database_duration_ms.toFixed(0)}ms` : '—'} /{' '}
          {row.cache_duration_ms > 0 ? `${row.cache_duration_ms.toFixed(0)}ms` : '—'}
        </span>
      ),
    },
    {
      header: 'Service',
      accessor: (row) => <ServiceBadge service={row.service} />,
    },
    {
      header: 'Trace ID',
      accessor: (row) => (
        <div className="flex items-center gap-1 font-mono text-[11px] text-brand-400/80">
          <GitCommit className="w-3.5 h-3.5" />
          <span>{row.trace_id.slice(0, 10)}...</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            Live Request Stream
          </h2>
          <p className="text-xs text-slate-400">
            Real-time HTTP requests, latency breakdown, and trace inspection
          </p>
        </div>
      </div>

      <FilterBar
        searchQuery={search}
        onSearchChange={(q) => {
          setSearch(q);
          setPage(1);
        }}
        filters={[
          {
            id: 'method',
            label: 'Method',
            value: method,
            options: [
              { value: 'all', label: 'All Methods' },
              { value: 'GET', label: 'GET' },
              { value: 'POST', label: 'POST' },
              { value: 'PUT', label: 'PUT' },
              { value: 'DELETE', label: 'DELETE' },
            ],
            onChange: (v) => {
              setMethod(v);
              setPage(1);
            },
          },
          {
            id: 'status',
            label: 'Status',
            value: statusCode,
            options: [
              { value: 'all', label: 'All Status' },
              { value: '200', label: '200 OK' },
              { value: '201', label: '201 Created' },
              { value: '400', label: '400 Bad Request' },
              { value: '404', label: '404 Not Found' },
              { value: '500', label: '500 Server Error' },
              { value: '502', label: '502 Bad Gateway' },
            ],
            onChange: (v) => {
              setStatusCode(v);
              setPage(1);
            },
          },
          {
            id: 'service',
            label: 'Service',
            value: selectedService,
            options: [
              { value: 'all', label: 'All Services' },
              { value: 'api-gateway', label: 'api-gateway' },
              { value: 'order-service', label: 'order-service' },
              { value: 'payment-service', label: 'payment-service' },
              { value: 'product-service', label: 'product-service' },
              { value: 'user-service', label: 'user-service' },
            ],
            onChange: (v) => {
              setSelectedService(v);
              setPage(1);
            },
          },
        ]}
        onRefresh={() => refetch()}
        isRefreshing={isRefetching}
      />

      <DataTable
        columns={columns}
        data={displayItems}
        isLoading={isLoading}
        onRowClick={(row) => setSelectedRequestId(row.id || row.request_id)}
        page={data?.page || page}
        totalPages={data?.total_pages || 1}
        onPageChange={(p) => setPage(p)}
      />

      {/* Slide-over Deep-Dive Request Inspector */}
      {selectedRequestId && (
        <RequestDetailPage
          requestId={selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
        />
      )}
    </div>
  );
}
