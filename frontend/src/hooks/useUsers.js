import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const getHeaders = (hasBody = true) => {
  const token = useAuthStore.getState().token;
  return {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/users`, { headers: getHeaders(false) });
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
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: getHeaders(true),
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
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: getHeaders(true),
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
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders(false)
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
