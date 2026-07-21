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

/**
 * Hook personalizado para obtener datos del dashboard
 * Usa TanStack Query con refetch automático cada 60 segundos (datos en vivo)
 */
export const useDashboard = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/dashboard`, {
        headers: getHeaders(),
      });
      if (!response.ok) {
        throw new Error('Error al obtener datos del dashboard');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refetch cada 60 segundos para datos en vivo
    staleTime: 30000, // Los datos se consideran "stale" después de 30 segundos
    cacheTime: 10 * 60 * 1000, // Cache por 10 minutos
  });
};

/**
 * Hook para enviar notificaciones a clientes que vencen
 */
export const useSendNotification = () => {
  return useMutation({
    mutationFn: async (clientId) => {
      const response = await fetch(`${API_URL}/notifications/send`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          client_id: clientId,
          type: '3day_warning',
        }),
      });
      if (!response.ok) {
        throw new Error('Error al enviar notificación');
      }
      return response.json();
    },
  });
};

/**
 * Hook para renovar suscripción
 */
export const useRenewSubscription = () => {
  return useMutation({
    mutationFn: async (data) => {
      const response = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          client_id: data.client_id,
          plan_id: data.plan_id || undefined,
          amount: data.amount,
          payment_method: data.payment_method,
          payment_type: data.payment_type || 'monthly',
          entity_type: 'gym',
          ...(data.notes ? { notes: data.notes } : {}),
        }),
      });
      if (!response.ok) {
        throw new Error('Error al renovar');
      }
      return response.json();
    },
  });
};

export default useDashboard;
