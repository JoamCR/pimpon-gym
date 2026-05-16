import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (credentials) => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Error al iniciar sesión');
        }

        const { user, token } = result.data;
        
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