import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const getHeaders = () => {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const useAgenda = (filters = {}) => {
  return useQuery({
    queryKey: ['agenda', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const url = `${API_URL}/agenda${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) throw new Error('Error al obtener agenda');
      return res.json();
    }
  });
};

export const useCreateAgenda = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_URL}/agenda`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear evento');
      return data;
    },
    onSuccess: () => qc.invalidateQueries(['agenda'])
  });
};

export const useUpdateAgenda = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await fetch(`${API_URL}/agenda/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar evento');
      return data;
    },
    onSuccess: () => qc.invalidateQueries(['agenda'])
  });
};

export default useAgenda;
