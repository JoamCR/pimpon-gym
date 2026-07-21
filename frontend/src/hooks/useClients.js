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

export const usePlans = () => {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/plans`, { headers: getHeaders() });
      if (!response.ok) {
        throw new Error('Error al obtener la lista de planes');
      }
      return response.json();
    },
  });
};

export const useClients = (filters = {}) => {
  return useQuery({
    queryKey: ['clients', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const queryString = params.toString();
      const url = `${API_URL}/clients${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, { headers: getHeaders() });
      if (!response.ok) {
        throw new Error('Error al obtener la lista de clientes');
      }
      return response.json();
    },
  });
};

export const useClient = (id) => {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/clients/${id}`, { headers: getHeaders() });
      if (!response.ok) {
        throw new Error('Error al obtener los detalles del cliente');
      }
      return response.json();
    },
    enabled: !!id,
  });
};

export const useClientHistory = (id) => {
  return useQuery({
    queryKey: ['client-history', id],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/clients/${id}/history`, { headers: getHeaders() });
      if (!response.ok) {
        throw new Error('Error al obtener el historial del cliente');
      }
      const data = await response.json();
      return data.data;
    },
    enabled: !!id,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clientData) => {
      const response = await fetch(`${API_URL}/clients`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(clientData),
      });
      
      const data = await response.json();
      if (!response.ok) {
        // Mapear los detalles de Zod (si existen) o mostrar el error general
        let errorMessage = data.error || data.message || 'Error al crear el cliente';
        if (data.details) {
          const firstError = Object.values(data.details).find(val => Array.isArray(val) && val._errors)?.['_errors']?.[0];
          if (firstError) errorMessage = firstError;
        }
        throw new Error(errorMessage);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...clientData }) => {
      const response = await fetch(`${API_URL}/clients/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(clientData),
      });
      
      const data = await response.json();
      if (!response.ok) {
        // Mapear los detalles de Zod (si existen) o mostrar el error general
        let errorMessage = data.error || data.message || 'Error al actualizar el cliente';
        if (data.details) {
          const firstError = Object.values(data.details).find(val => Array.isArray(val) && val._errors)?.['_errors']?.[0];
          if (firstError) errorMessage = firstError;
        }
        throw new Error(errorMessage);
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.id] });
    },
  });
};

export const validateClientField = async (field, value, excludeId = null) => {
  if (!value) return true;
  let url = `${API_URL}/clients/validate?${field}=${encodeURIComponent(value)}`;
  if (excludeId) {
    url += `&excludeId=${encodeURIComponent(excludeId)}`;
  }
  const response = await fetch(url, { headers: getHeaders() });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Dato ya registrado');
  }
  return true;
};
