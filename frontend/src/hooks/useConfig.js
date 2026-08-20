import { useQuery, useMutation } from '@tanstack/react-query';
import { authFetch, API_URL } from '../lib/api';

export const useConfig = () => {
  return useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const res = await authFetch(`${API_URL}/config`);
      if (!res.ok) throw new Error('Error al obtener configuración');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateConfig = () => {
  return useMutation({
    mutationFn: async (data) => {
      const res = await authFetch(`${API_URL}/config`, {
        method: 'PUT',
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

