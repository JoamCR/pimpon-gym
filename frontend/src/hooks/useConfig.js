import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const getHeaders = () => {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const useConfig = () => {
  return useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/config`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Error al obtener configuración');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateConfig = () => {
  return useMutation({
    mutationFn: async (data) => {
      const res = await fetch(`${API_URL}/config`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Error al actualizar configuración');
      }
      return res.json();
    },
  });
};

export default useConfig;
