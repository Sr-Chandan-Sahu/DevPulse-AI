import { create } from 'zustand';
import { User } from '../types';
import { api } from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, orgName?: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('devpulse_access_token'),
  isLoading: true,

  login: async (email, password) => {
    const res = await api.post<any>('/api/v1/auth/login', { email, password });
    localStorage.setItem('devpulse_access_token', res.tokens.access_token);
    localStorage.setItem('devpulse_refresh_token', res.tokens.refresh_token);
    set({ user: res.user, token: res.tokens.access_token, isLoading: false });
  },

  register: async (email, password, fullName, orgName) => {
    const res = await api.post<any>('/api/v1/auth/register', {
      email,
      password,
      full_name: fullName,
      organization_name: orgName,
    });
    localStorage.setItem('devpulse_access_token', res.tokens.access_token);
    localStorage.setItem('devpulse_refresh_token', res.tokens.refresh_token);
    set({ user: res.user, token: res.tokens.access_token, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('devpulse_access_token');
    localStorage.removeItem('devpulse_refresh_token');
    set({ user: null, token: null, isLoading: false });
  },

  fetchMe: async () => {
    const token = localStorage.getItem('devpulse_access_token');
    if (!token) {
      set({ user: null, token: null, isLoading: false });
      return;
    }
    try {
      const user = await api.get<User>('/api/v1/auth/me');
      set({ user, token, isLoading: false });
    } catch {
      localStorage.removeItem('devpulse_access_token');
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
