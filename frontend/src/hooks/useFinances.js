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

export const usePaymentsHistory = (entityType, from, to) => {
  return useQuery({
    queryKey: ['payments', 'history', entityType, from, to],
    queryFn: async () => {
      let url = `${API_URL}/payments/history?`;
      const params = new URLSearchParams();
      if (entityType) params.append('entity_type', entityType);
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      
      const res = await fetch(`${url}${params.toString()}`, { headers: getHeaders(false) });
      if (!res.ok) throw new Error('Error al obtener el historial de pagos');
      return res.json();
    }
  });
};

export const useUpdatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, amount, payment_method, notes }) => {
      const res = await fetch(`${API_URL}/payments/${id}`, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify({ amount, payment_method, notes }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Error al actualizar el pago');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API_URL}/payments/${id}`, {
        method: 'DELETE',
        headers: getHeaders(false),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Error al anular el pago');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
};

// ─── EGRESOS ──────────────────────────────────────────────────────────────────

export const useExpenses = (from, to) => {
  return useQuery({
    queryKey: ['expenses', from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);

      const res = await fetch(`${API_URL}/expenses?${params.toString()}`, { headers: getHeaders(false) });
      if (!res.ok) throw new Error('Error al obtener los egresos');
      return res.json();
    }
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const res = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || result.error || 'Error al crear el egreso');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await fetch(`${API_URL}/expenses/${id}`, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || result.error || 'Error al actualizar el egreso');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API_URL}/expenses/${id}`, {
        method: 'DELETE',
        headers: getHeaders(false),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || result.error || 'Error al eliminar el egreso');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
};

