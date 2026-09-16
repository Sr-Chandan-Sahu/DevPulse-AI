import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTelemetryStreamStore } from '../stores/telemetryStreamStore';
import { RequestSummary } from '../types';

export function useTelemetryWebSocket(projectId?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { setConnected, addLiveRequest } = useTelemetryStreamStore();

  useEffect(() => {
    if (!projectId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/ws/projects/${projectId}`;

    let reconnectTimer: any;
    let isSubscribed = true;

    function connect() {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isSubscribed) return;
          setConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'NEW_REQUEST') {
              const req: RequestSummary = {
                id: message.data.id,
                request_id: message.data.request_id,
                trace_id: message.data.trace_id,
                timestamp: message.data.timestamp,
                environment: message.data.environment || 'production',
                service: message.data.service || 'api-service',
                method: message.data.method,
                path: message.data.path,
                status_code: message.data.status_code,
                duration_ms: message.data.duration_ms,
                database_duration_ms: 0,
                cache_duration_ms: 0,
                external_duration_ms: 0,
              };
              addLiveRequest(req);
              
              // Invalidate overview metrics query periodically
              queryClient.invalidateQueries({ queryKey: ['metrics-overview', projectId] });
              queryClient.invalidateQueries({ queryKey: ['requests', projectId] });
            } else if (message.type === 'ANOMALY_DETECTED') {
              queryClient.invalidateQueries({ queryKey: ['anomalies', projectId] });
              queryClient.invalidateQueries({ queryKey: ['metrics-overview', projectId] });
            } else if (message.type === 'ALERT_TRIGGERED') {
              queryClient.invalidateQueries({ queryKey: ['alert-events', projectId] });
            }
          } catch (e) {
            console.error('WebSocket message parse error', e);
          }
        };

        ws.onclose = () => {
          if (!isSubscribed) return;
          setConnected(false);
          reconnectTimer = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      isSubscribed = false;
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
      setConnected(false);
    };
  }, [projectId, setConnected, addLiveRequest, queryClient]);
}
