import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authFetch, API_URL } from '../lib/api';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await authFetch(`${API_URL}/users`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Error al obtener usuarios');
      }
      return res.json();
    }
  });
};

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await authFetch(`${API_URL}/users`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        let errorMessage = data.error || data.message || 'Error al crear el usuario';
        if (data.details) {
          const firstError = Object.values(data.details).find(val => val && Array.isArray(val._errors) && val._errors.length > 0)?.['_errors']?.[0];
          if (firstError) errorMessage = firstError;
        }
        throw new Error(errorMessage);
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries(['users'])
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const res = await authFetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        let errorMessage = data.error || data.message || 'Error al actualizar el usuario';
        if (data.details) {
          const firstError = Object.values(data.details).find(val => val && Array.isArray(val._errors) && val._errors.length > 0)?.['_errors']?.[0];
          if (firstError) errorMessage = firstError;
        }
        throw new Error(errorMessage);
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries(['users'])
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await authFetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Error al eliminar el usuario');
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries(['users'])
  });
};

