import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authFetch, API_URL } from '../lib/api';

export const useAgenda = (filters = {}) => {
  return useQuery({
    queryKey: ['agenda', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const url = `${API_URL}/agenda${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await authFetch(url);
      if (!res.ok) throw new Error('Error al obtener agenda');
      return res.json();
    }
  });
};

export const useCreateAgenda = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await authFetch(`${API_URL}/agenda`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        const error = new Error(data.error || 'Error al crear evento');
        error.status = res.status;
        throw error;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries(['agenda'])
  });
};

export const useUpdateAgenda = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await authFetch(`${API_URL}/agenda/${id}`, {
        method: 'PUT',
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

