import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (credentials) => {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Error al iniciar sesión');
        }

        // El backend devuelve { user, token } en la raíz del objeto
        const { user, token } = result;
        
        set({ user, token, isAuthenticated: true });
        
        return user;
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user })
    }),
    {
      name: 'auth-storage' // Persiste automáticamente el estado y el token en LocalStorage
    }
  )
);