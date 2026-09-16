export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  organizations: OrgMembership[];
}

export interface OrgMembership {
  organization_id: string;
  organization_name: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string;
  created_at: string;
  environments: { id: string; name: string }[];
  services: { id: string; name: string }[];
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  environment: string;
  is_active: boolean;
  created_at: string;
  raw_key?: string;
}

export interface Span {
  id: string;
  span_id: string;
  parent_span_id: string | null;
  trace_id: string;
  name: string;
  span_type: 'http' | 'database' | 'cache' | 'external' | 'custom';
  service: string;
  duration_ms: number;
  start_time: string;
  end_time: string;
  attributes: Record<string, any>;
}

export interface Log {
  id: string;
  trace_id?: string;
  request_id?: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  service: string;
  message: string;
  context: Record<string, any>;
}

export interface RequestSummary {
  id: string;
  request_id: string;
  trace_id: string;
  timestamp: string;
  environment: string;
  service: string;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  database_duration_ms: number;
  cache_duration_ms: number;
  external_duration_ms: number;
  error_message?: string | null;
}

export interface PaginatedRequestsResponse {
  items: RequestSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface RequestDetail extends RequestSummary {
  url: string;
  route: string;
  client_ip: string;
  user_agent: string;
  request_headers: Record<string, string>;
  request_body?: string | null;
  response_headers: Record<string, string>;
  response_body?: string | null;
  error_type?: string | null;
  stack_trace?: string | null;
  spans: Span[];
  logs: Log[];
}

export interface MetricsSummary {
  total_requests: number;
  requests_per_second: number;
  error_rate: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  avg_latency_ms: number;
  active_anomalies_count: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  rps: number;
  p50_latency: number;
  p95_latency: number;
  p99_latency: number;
  error_rate: number;
  requests_count: number;
  errors_count: number;
}

export interface SlowEndpoint {
  method: string;
  path: string;
  service: string;
  avg_latency_ms: number;
  p95_latency_ms: number;
  call_count: number;
}

export interface TopErrorEndpoint {
  method: string;
  path: string;
  service: string;
  error_count: number;
  total_calls: number;
  error_rate: number;
}

export interface OverviewDashboardData {
  summary: MetricsSummary;
  series: TimeSeriesPoint[];
  slowest_endpoints: SlowEndpoint[];
  top_error_endpoints: TopErrorEndpoint[];
  service_health: Record<string, string>;
}

export interface AIAnalysis {
  id: string;
  anomaly_id: string;
  provider: string;
  model: string;
  summary: string;
  probable_root_cause: string;
  confidence_score: number;
  evidence: string[];
  recommended_actions: string[];
  created_at: string;
}

export interface Anomaly {
  id: string;
  project_id: string;
  title: string;
  anomaly_type: 'LATENCY_SPIKE' | 'ERROR_SURGE' | 'SLOW_QUERY' | 'CACHE_DROP';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  service: string;
  endpoint: string;
  detected_at: string;
  resolved_at?: string | null;
  metric_value: number;
  baseline_value: number;
  deviation_percent: number;
  signals: { signal: string; value: string; threshold: string }[];
  ai_analysis?: AIAnalysis | null;
}

export interface DatabaseQuery {
  id: string;
  query_hash: string;
  statement: string;
  table_name: string;
  operation: string;
  avg_duration_ms: number;
  max_duration_ms: number;
  call_count: number;
  slow_count: number;
  last_seen: string;
}

export interface RedisOperation {
  id: string;
  command: string;
  key_pattern: string;
  avg_duration_ms: number;
  call_count: number;
  last_seen: string;
}

export interface ErrorCluster {
  id: string;
  fingerprint: string;
  error_type: string;
  error_message: string;
  service: string;
  endpoint: string;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  sample_trace_id?: string;
  sample_request_id?: string;
  sample_stack_trace?: string;
}

export interface ApiSchemaDetail {
  id: string;
  schema_type: string;
  content_type: string;
  json_schema: Record<string, any>;
  example_payload: any;
  is_inferred: boolean;
}

export interface ApiEndpoint {
  id: string;
  method: string;
  path_pattern: string;
  service: string;
  summary: string;
  description: string;
  total_calls_observed: number;
  status_codes_observed: number[];
  schemas: ApiSchemaDetail[];
}

export interface AlertRule {
  id: string;
  project_id: string;
  name: string;
  metric_type: string;
  operator: string;
  threshold_value: number;
  duration_window_minutes: number;
  service_filter: string;
  endpoint_filter: string;
  is_enabled: boolean;
  notification_channel: string;
  created_at: string;
}

export interface AlertEvent {
  id: string;
  alert_rule_id: string;
  triggered_at: string;
  resolved_at?: string | null;
  metric_value: number;
  threshold_value: number;
  message: string;
  status: string;
}
