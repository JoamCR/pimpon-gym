import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api', // Asume que la API está en /api
});

// Interceptor para añadir el token de autenticación a cada solicitud
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// SEGURIDAD: Interceptor de respuestas — Auto-logout en token expirado (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido: limpiar sesión y redirigir al login
      const authStore = useAuthStore.getState();
      // Solo hacer logout si había una sesión activa (evitar bucle en login)
      if (authStore.isAuthenticated) {
        authStore.logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);