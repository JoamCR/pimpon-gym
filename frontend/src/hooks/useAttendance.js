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

export const useTodayAttendance = () => {
  return useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/attendance/today`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Error al obtener asistencias de hoy');
      return res.json();
    }
  });
};

export const useAttendanceByClient = (clientId) => {
  return useQuery({
    queryKey: ['attendance', clientId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/attendance/client/${clientId}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Error al obtener historial de asistencia');
      return res.json();
    },
    enabled: !!clientId
  });
};

export const useCreateCheckin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_URL}/attendance/checkin`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar checkin');
      return data;
    },
    onSuccess: () => qc.invalidateQueries(['attendance', 'today'])
  });
};

export const useCheckout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, checked_out_at }) => {
      const res = await fetch(`${API_URL}/attendance/${id}/checkout`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify({ checked_out_at })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al hacer checkout');
      return data;
    },
    onSuccess: () => qc.invalidateQueries(['attendance', 'today'])
  });
};

export default useTodayAttendance;
