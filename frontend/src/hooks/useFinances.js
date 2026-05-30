import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const getHeaders = () => {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
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
      
      const res = await fetch(`${url}${params.toString()}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Error al obtener el historial de pagos');
      return res.json();
    }
  });
};
