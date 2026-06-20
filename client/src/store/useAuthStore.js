import { create } from 'zustand';
import { api, setAuthToken } from '../api/client';

const initialToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
if (initialToken) {
  setAuthToken(initialToken);
}

export const useAuthStore = create((set) => ({
  token: initialToken,
  user: null,
  loading: false,

  hydrate: () => {
    const t = localStorage.getItem('token');
    if (t) {
      setAuthToken(t);
      set({ token: t });
    }
  },

  register: async ({ name, email, password }) => {
    set({ loading: true });
    try {
      const res = await api.post('/api/auth/register', { name, email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      setAuthToken(token);
      set({ token, user, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  login: async ({ email, password }) => {
    set({ loading: true });
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      setAuthToken(token);
      set({ token, user, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  fetchMe: async () => {
    try {
      const res = await api.get('/api/users/me');
      set({ user: res.data.user });
      return res.data.user;
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem('token');
        setAuthToken(null);
        set({ token: null, user: null });
      }
      throw e;
    }
  },

  setUser: (user) => set({ user }),

  updateProfile: async (payload) => {
    const res = await api.patch('/api/users/me', payload);
    set({ user: res.data.user });
    return res.data.user;
  },

  logout: () => {
    localStorage.removeItem('token');
    setAuthToken(null);
    set({ token: null, user: null });
  },
}));

