import { create } from 'zustand';
import { Project } from '../types';
import { api } from '../lib/api';

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  timeRange: string; // '5m' | '15m' | '1h' | '6h' | '24h' | '7d'
  selectedEnvironment: string;
  selectedService: string;
  isLoading: boolean;
  fetchProjects: () => Promise<void>;
  setActiveProject: (project: Project) => void;
  setTimeRange: (range: string) => void;
  setSelectedEnvironment: (env: string) => void;
  setSelectedService: (svc: string) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProject: null,
  timeRange: '1h',
  selectedEnvironment: 'all',
  selectedService: 'all',
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const projects = await api.get<Project[]>('/api/v1/projects');
      set({ projects, isLoading: false });
      if (projects.length > 0 && !get().activeProject) {
        set({ activeProject: projects[0] });
      }
    } catch (e) {
      set({ isLoading: false });
    }
  },

  setActiveProject: (project) => set({ activeProject: project }),
  setTimeRange: (timeRange) => set({ timeRange }),
  setSelectedEnvironment: (selectedEnvironment) => set({ selectedEnvironment }),
  setSelectedService: (selectedService) => set({ selectedService }),
}));
