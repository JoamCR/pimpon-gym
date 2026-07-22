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

/**
 * Hook para obtener la cola de pacientes listos para evaluación
 */
export const useNutritionQueue = () => {
  return useQuery({
    queryKey: ['nutrition-queue'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/nutrition/queue`, {
        headers: getHeaders(),
      });
      if (!response.ok) {
        throw new Error('Error al obtener la cola de pacientes');
      }
      return response.json();
    },
  });
};

/**
 * Hook para obtener historial de evaluaciones de un cliente
 */
export const useEvaluationHistory = (clientId) => {
  return useQuery({
    queryKey: ['evaluations', clientId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/nutrition/evaluations/${clientId}`, {
        headers: getHeaders(),
      });
      if (!response.ok) {
        throw new Error('Error al obtener evaluaciones');
      }
      return response.json();
    },
    enabled: !!clientId,
  });
};

/**
 * Hook para crear una nueva evaluación nutricional
 */
export const useCreateEvaluation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (evaluationData) => {
      const response = await fetch(`${API_URL}/nutrition/evaluations`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(evaluationData),
      });
      if (!response.ok) {
        const error = await response.json();
        const msg = error.details ? `${error.error || 'Error'} - ${error.details}` : (error.error || 'Error al crear evaluación');
        throw new Error(msg);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-queue'] });
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
    },
  });
};

/**
 * Hook para actualizar una evaluación
 */
export const useUpdateEvaluation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ recordId, data }) => {
      const response = await fetch(`${API_URL}/nutrition/evaluations/${recordId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar evaluación');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
    },
  });
};

/**
 * Hook para obtener planes de ejercicio de un cliente
 */
export const useExercisePlans = (clientId) => {
  return useQuery({
    queryKey: ['exercise-plans', clientId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/nutrition/plans/${clientId}`, {
        headers: getHeaders(),
      });
      if (!response.ok) {
        throw new Error('Error al obtener planes de ejercicio');
      }
      return response.json();
    },
    enabled: !!clientId,
  });
};

/**
 * Hook para crear un plan de ejercicio (6 días)
 */
export const useCreateExercisePlan = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (planData) => {
      const response = await fetch(`${API_URL}/nutrition/plans`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(planData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear plan');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-plans'] });
    },
  });
};

/**
 * Hook para actualizar un plan de ejercicio
 */
export const useUpdateExercisePlan = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ planId, data }) => {
      const response = await fetch(`${API_URL}/nutrition/plans/${planId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar plan');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-plans'] });
    },
  });
};

export default useNutritionQueue;
