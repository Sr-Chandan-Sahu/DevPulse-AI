import { create } from 'zustand';
import { RequestSummary } from '../types';
import { api } from '../lib/api';

interface LiveEvent {
  type: string;
  data: any;
}

interface TelemetryStreamState {
  isConnected: boolean;
  isStreaming: boolean;
  liveRequests: RequestSummary[];
  activeIncident: string | null;
  unreadAnomaliesCount: number;
  setConnected: (status: boolean) => void;
  toggleStreaming: () => void;
  addLiveRequest: (req: RequestSummary) => void;
  clearLiveStream: () => void;
  triggerSimulatedTraffic: (projectId: string, count?: number) => Promise<void>;
  triggerSimulatedIncident: (projectId: string, scenario: string) => Promise<void>;
}

export const useTelemetryStreamStore = create<TelemetryStreamState>((set, get) => ({
  isConnected: false,
  isStreaming: true,
  liveRequests: [],
  activeIncident: null,
  unreadAnomaliesCount: 0,

  setConnected: (isConnected) => set({ isConnected }),
  toggleStreaming: () => set((state) => ({ isStreaming: !state.isStreaming })),

  addLiveRequest: (req) => {
    if (!get().isStreaming) return;
    set((state) => ({
      liveRequests: [req, ...state.liveRequests.slice(0, 99)],
    }));
  },

  clearLiveStream: () => set({ liveRequests: [] }),

  triggerSimulatedTraffic: async (projectId: string, count = 15) => {
    await api.post(`/api/v1/demo/${projectId}/generate-traffic?count=${count}`);
  },

  triggerSimulatedIncident: async (projectId: string, scenario: string) => {
    set({ activeIncident: scenario });
    await api.post(`/api/v1/demo/${projectId}/trigger-incident/${scenario}`);
    setTimeout(() => {
      set({ activeIncident: null });
    }, 5000);
  },
}));
