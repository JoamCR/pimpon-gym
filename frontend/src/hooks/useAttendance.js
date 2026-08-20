import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authFetch, API_URL } from '../lib/api';

export const useTodayAttendance = () => {
  return useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: async () => {
      const res = await authFetch(`${API_URL}/attendance/today`);
      if (!res.ok) throw new Error('Error al obtener asistencias de hoy');
      return res.json();
    }
  });
};

export const useAttendanceByClient = (clientId) => {
  return useQuery({
    queryKey: ['attendance', clientId],
    queryFn: async () => {
      const res = await authFetch(`${API_URL}/attendance/client/${clientId}`);
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
      const res = await authFetch(`${API_URL}/attendance/checkin`, {
        method: 'POST', body: JSON.stringify(payload)
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
      const res = await authFetch(`${API_URL}/attendance/${id}/checkout`, {
        method: 'PUT', body: JSON.stringify({ checked_out_at })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al hacer checkout');
      return data;
    },
    onSuccess: () => qc.invalidateQueries(['attendance', 'today'])
  });
};

export default useTodayAttendance;

