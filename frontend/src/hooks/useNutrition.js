import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authFetch, API_URL } from '../lib/api';

/**
 * Hook para obtener la cola de pacientes listos para evaluación
 */
export const useNutritionQueue = () => {
  return useQuery({
    queryKey: ['nutrition-queue'],
    queryFn: async () => {
      const response = await authFetch(`${API_URL}/nutrition/queue`);
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
      const response = await authFetch(`${API_URL}/nutrition/evaluations/${clientId}`);
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
      const response = await authFetch(`${API_URL}/nutrition/evaluations`, {
        method: 'POST',
        body: JSON.stringify(evaluationData),
      });
      if (!response.ok) {
        const error = await response.json();
        const detailsStr = typeof error.details === 'object' ? JSON.stringify(error.details) : error.details;
        const msg = detailsStr ? `${error.error || 'Error'} - ${detailsStr}` : (error.error || 'Error al crear evaluación');
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
      const response = await authFetch(`${API_URL}/nutrition/evaluations/${recordId}`, {
        method: 'PUT',
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
      const response = await authFetch(`${API_URL}/nutrition/plans/${clientId}`);
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
      const response = await authFetch(`${API_URL}/nutrition/plans`, {
        method: 'POST',
        body: JSON.stringify(planData),
      });
      if (!response.ok) {
        const error = await response.json();
        const detailsStr = typeof error.details === 'object' ? JSON.stringify(error.details) : error.details;
        const msg = detailsStr ? `${error.error || 'Error'} - ${detailsStr}` : (error.error || 'Error al crear plan');
        throw new Error(msg);
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
      const response = await authFetch(`${API_URL}/nutrition/plans/${planId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        const detailsStr = typeof error.details === 'object' ? JSON.stringify(error.details) : error.details;
        const msg = detailsStr ? `${error.error || 'Error'} - ${detailsStr}` : (error.error || 'Error al actualizar plan');
        throw new Error(msg);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-plans'] });
    },
  });
};

export default useNutritionQueue;

