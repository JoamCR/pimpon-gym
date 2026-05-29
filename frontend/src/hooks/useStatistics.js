import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Helper for fetch with auth - sin validación obligatoria en desarrollo
const fetchWithAuth = async (endpoint, options = {}) => {
  const token = useAuthStore.getState().token || localStorage.getItem('gym_token');
  
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Error ${res.status}` }));
    throw new Error(err.error || `Error: ${res.status}`);
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

export function useAbsentClients() {
  return useQuery({
    queryKey: ['statistics', 'absent'],
    queryFn: () => fetchWithAuth('/statistics/absent-clients').then(res => res.data),
    staleTime: 5 * 60 * 1000
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

export function useRetentionRate() {
  return useQuery({
    queryKey: ['statistics', 'retention-rate'],
    queryFn: () => fetchWithAuth('/statistics/retention-rate').then(res => res.data),
    staleTime: 10 * 60 * 1000
  });
}

export function useAttendanceHeatmap(year, month) {
  return useQuery({
    queryKey: ['statistics', 'attendance-heatmap', year, month],
    queryFn: () => fetchWithAuth(`/statistics/attendance-heatmap?year=${year}&month=${month}`).then(res => res.data),
  });
}

export function useDailyAttendance(year, month) {
  return useQuery({
    queryKey: ['statistics', 'daily-attendance', year, month],
    queryFn: () => fetchWithAuth(`/statistics/daily-attendance?year=${year}&month=${month}`).then(res => res.data),
  });
}

export function useGhostClients() {
  return useQuery({
    queryKey: ['statistics', 'ghost-clients'],
    queryFn: () => fetchWithAuth('/statistics/ghost-clients').then(res => res.data),
  });
}

export function usePaymentMethods(year, month) {
  return useQuery({
    queryKey: ['statistics', 'payment-methods', year, month],
    queryFn: () => fetchWithAuth(`/statistics/payment-methods?year=${year}&month=${month}`).then(res => res.data),
  });
}

export function useAverageTicket(year, month) {
  return useQuery({
    queryKey: ['statistics', 'average-ticket', year, month],
    queryFn: () => fetchWithAuth(`/statistics/average-ticket?year=${year}&month=${month}`).then(res => res.data),
  });
}

export function useIncomeAnalysis(year, month) {
  return useQuery({
    queryKey: ['statistics', 'income-analysis', year, month],
    queryFn: () => fetchWithAuth(`/statistics/income-analysis?year=${year}&month=${month}`).then(res => res.data),
  });
}

export function useProjectedDebt(daysOut = 30) {
  return useQuery({
    queryKey: ['statistics', 'projected-debt', daysOut],
    queryFn: () => fetchWithAuth(`/statistics/projected-debt?daysOut=${daysOut}`).then(res => res.data),
  });
}

export function useNutritionConversion() {
  return useQuery({
    queryKey: ['statistics', 'nutrition-conversion'],
    queryFn: () => fetchWithAuth('/statistics/nutrition-conversion').then(res => res.data),
  });
}

export function useSixMonthEligible() {
  return useQuery({
    queryKey: ['statistics', 'six-month-eligible'],
    queryFn: () => fetchWithAuth('/statistics/six-month-eligible').then(res => res.data),
  });
}

export function useNutritionStats(year, month) {
  return useQuery({
    queryKey: ['statistics', 'nutrition-stats', year, month],
    queryFn: () => fetchWithAuth(`/statistics/nutrition-stats?year=${year}&month=${month}`).then(res => res.data),
  });
}

export function useComprehensiveStats(year, month) {
  return useQuery({
    queryKey: ['statistics', 'comprehensive', year, month],
    queryFn: () => fetchWithAuth(`/statistics/comprehensive?year=${year}&month=${month}`).then(res => res.data),
    staleTime: 5 * 60 * 1000
  });
}

// === Nuevos hooks ===

export function useMonthlyIncomeByMethod(year, month) {
  return useQuery({
    queryKey: ['statistics', 'income-by-method', year, month],
    queryFn: () => fetchWithAuth(`/statistics/monthly-income-by-method?year=${year}&month=${month}`).then(res => res.data),
    staleTime: 5 * 60 * 1000
  });
}

export function useNutritionConversionPaid() {
  return useQuery({
    queryKey: ['statistics', 'nutrition-conversion-paid'],
    queryFn: () => fetchWithAuth('/statistics/nutrition-conversion-paid').then(res => res.data),
    staleTime: 5 * 60 * 1000
  });
}

export function useAlertClients() {
  return useQuery({
    queryKey: ['statistics', 'alert-clients'],
    queryFn: () => fetchWithAuth('/statistics/alert-clients').then(res => res.data),
    staleTime: 5 * 60 * 1000
  });
}

export function useNutritionFreeToConversion() {
  return useQuery({
    queryKey: ['statistics', 'nutrition-free-to-conversion'],
    queryFn: () => fetchWithAuth('/statistics/nutrition-free-to-conversion').then(res => res.data),
    staleTime: 5 * 60 * 1000
  });
}

export function useNutritionPatientsToClients() {
  return useQuery({
    queryKey: ['statistics', 'nutrition-patients-to-clients'],
    queryFn: () => fetchWithAuth('/statistics/nutrition-patients-to-clients').then(res => res.data),
    staleTime: 5 * 60 * 1000
  });
}

export function useNutritionRetention3Months() {
  return useQuery({
    queryKey: ['statistics', 'nutrition-retention-3months'],
    queryFn: () => fetchWithAuth('/statistics/nutrition-retention-3months').then(res => res.data),
    staleTime: 5 * 60 * 1000
  });
}

export function useNutritionConsultationDurations() {
  return useQuery({
    queryKey: ['statistics', 'nutrition-consultation-durations'],
    queryFn: () => fetchWithAuth('/statistics/nutrition-consultation-durations').then(res => res.data),
    staleTime: 5 * 60 * 1000
  });
}

export function useNutritionIncomeReal(year, month) {
  return useQuery({
    queryKey: ['statistics', 'nutrition-income-real', year, month],
    queryFn: () => fetchWithAuth(`/statistics/nutrition-income-real?year=${year}&month=${month}`).then(res => res.data),
    staleTime: 5 * 60 * 1000
  });
}
