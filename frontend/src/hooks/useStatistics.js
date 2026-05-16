import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
// Helper for fetch with auth
const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem('gym_token');
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error en la petición');
  }
  return res.json();
};

export function useDashboardStats(year, month) {
  return useQuery({
    queryKey: ['statistics', 'dashboard', year, month],
    queryFn: () => fetchWithAuth(`/statistics/dashboard?year=${year}&month=${month}`).then(res => res.data),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

export function useExpiredClients() {
  return useQuery({
    queryKey: ['statistics', 'expired'],
    queryFn: () => fetchWithAuth('/statistics/expired-clients').then(res => res.data),
  });
}

export function useAbsentClients(year, month) {
  return useQuery({
    queryKey: ['statistics', 'absent', year, month],
    queryFn: () => fetchWithAuth(`/statistics/absent-clients?year=${year}&month=${month}`).then(res => res.data),
  });
}

export function useConsistentClients(minMonths = 6) {
  return useQuery({
    queryKey: ['statistics', 'consistent', minMonths],
    queryFn: () => fetchWithAuth(`/statistics/consistent-clients?minMonths=${minMonths}`).then(res => res.data),
  });
}

export function useCashCutoff(from, to) {
  return useQuery({
    queryKey: ['statistics', 'cash-cutoff', from, to],
    queryFn: () => fetchWithAuth(`/statistics/cash-cutoff?from=${from}&to=${to}`).then(res => res.data),
    enabled: !!from && !!to,
  });
}

export function useSendIncentiveWA() {
  return useMutation({
    mutationFn: (clientId) => fetchWithAuth(`/notifications/send-incentive/${clientId}`, { method: 'POST' }), // Assuming this endpoint exists or will exist in notifications
    onSuccess: () => {
      // toast success
    }
  });
}
