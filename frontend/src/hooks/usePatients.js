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

export const usePatients = (filters = {}) => {
  return useQuery({
    queryKey: ['patients', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const url = `${API_URL}/patients${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) throw new Error('Error al obtener pacientes');
      return res.json();
    }
  });
};

export const useCreatePatient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_URL}/patients`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        let errorMessage = data.error || data.message || 'Error al crear paciente';
        if (data.details) {
          const firstError = Object.values(data.details).find(val => val && Array.isArray(val._errors) && val._errors.length > 0)?.['_errors']?.[0];
          if (firstError) errorMessage = firstError;
        }
        throw new Error(errorMessage);
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries(['patients'])
  });
};

export const usePatient = (id) => {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/patients/${id}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Error al obtener paciente');
      return res.json();
    },
    enabled: !!id
  });
};

export const useCreatePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Error al procesar el pago');
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries(['patients']);
    }
  });
};

export default usePatients;
