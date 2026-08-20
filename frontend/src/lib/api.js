import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
});

let isLoggingOut = false;

/**
 * Función centralizada para manejar la expiración de token/sesión (HTTP 401)
 */
export function handleUnauthorized() {
  const authStore = useAuthStore.getState();
  if (authStore.isAuthenticated && !isLoggingOut) {
    isLoggingOut = true;
    toast.error('Tu sesión de usuario ha expirado. Por favor, vuelve a iniciar sesión.');
    authStore.logout();
    setTimeout(() => {
      window.location.href = '/login';
    }, 300);
  }
}

// Interceptor para añadir el token de autenticación a solicitudes de Axios
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

// SEGURIDAD: Interceptor de respuestas Axios — Auto-logout en token expirado (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      handleUnauthorized();
    }
    return Promise.reject(error);
  }
);

/**
 * Wrapper universal para `fetch` que añade automáticamente el token Bearer
 * e intercepta respuestas 401 Unauthorized para cerrar sesión y redirigir al login.
 */
export async function authFetch(url, options = {}) {
  const token = useAuthStore.getState().token;

  const headers = {
    ...(options.body && !(options.body instanceof FormData) && !options.headers?.['Content-Type']
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    handleUnauthorized();
  }

  return response;
}