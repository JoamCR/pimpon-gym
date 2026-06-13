import React from 'react';
import { GymModal } from '../GymModal';
import { GymButton } from '../GymButton';
import { IconStethoscope, IconCoin } from '@tabler/icons-react';

export function PatientDetailsModal({
  isOpen,
  onClose,
  patient,
  evaluations = [],
  isLoadingEvaluations = false,
  onNewConsult,
  onPayment,
  onSchedule,
}) {
  if (!patient) return null;

  return (
    <GymModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalles del Paciente — ${patient.first_name} ${patient.last_name}`}
      width="lg"
    >
      <div className="space-y-4 text-[var(--color-text)]">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-[var(--color-text-muted)] font-semibold">Nombre Completo</p>
            <p>{patient.first_name} {patient.last_name}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-muted)] font-semibold">Teléfono</p>
            <p>{patient.phone}</p>
          </div>
          {/* <div>
            <p className="text-sm text-[var(--color-text-muted)] font-semibold">RFC</p>
            <p>{patient.rfc || 'No registrado'}</p>
          </div> */}
          {/* <div>
            <p className="text-sm text-[var(--color-text-muted)] font-semibold">Ocupación</p>
            <p>{patient.occupation || 'No registrado'}</p>
          </div> */}
          <div className="col-span-2">
            <p className="text-sm text-[var(--color-text-muted)] font-semibold">Evaluación Rápida</p>
            <p className="text-sm">Peso: {patient.quick_weight_kg ? `${patient.quick_weight_kg} kg` : 'N/A'}</p>
            <p className="text-sm">Estatura: {patient.quick_height_cm ? `${patient.quick_height_cm} cm` : 'N/A'}</p>
            <p className="text-sm">Objetivo: {patient.quick_goal || 'N/A'}</p>
            <p className="text-sm">Notas de salud: {patient.quick_health_notes || 'N/A'}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--color-border)] mt-4">
          <h3 className="text-lg font-bold mb-3 text-[var(--color-text)]">Historial de Consultas</h3>
          {isLoadingEvaluations ? (
            <p className="text-sm text-[var(--color-text-muted)]">Cargando consultas...</p>
          ) : evaluations.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {evaluations.map((evaluation) => (
                <div key={evaluation.id} className="p-3 border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-surface)]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-[var(--color-text)]">
                      {new Date(evaluation.evaluation_date).toLocaleDateString('es-MX')}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-[rgba(15,62,96,0.1)] text-[var(--color-secondary)]">
                      {evaluation.is_free_consult ? 'Gratis' : 'Regular'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm text-[var(--color-text-muted)]">
                    <div><span className="font-medium">Peso:</span> {evaluation.weight_kg || '—'} kg</div>
                    <div><span className="font-medium">Grasa:</span> {evaluation.body_fat_pct || '—'}%</div>
                    <div>
                      <span className="font-medium">IMC:</span> {evaluation.height_cm && evaluation.weight_kg ? (evaluation.weight_kg / ((evaluation.height_cm / 100) ** 2)).toFixed(1) : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">El paciente no tiene consultas registradas.</p>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t border-[var(--color-border)]">
          <div className="flex gap-3 flex-wrap">
            {onNewConsult && (
              <GymButton variant="primary" icon={<IconStethoscope size={18} />} onClick={onNewConsult}>
                Nueva Consulta
              </GymButton>
            )}
            {onPayment && (
              <GymButton variant="success" icon={<IconCoin size={18} />} onClick={onPayment}>
                Pago de Consulta
              </GymButton>
            )}
            {onSchedule && (
              <GymButton variant="gold" onClick={onSchedule}>
                Agendar Cita
              </GymButton>
            )}
          </div>
          <GymButton variant="secondary" onClick={onClose}>Cerrar</GymButton>
        </div>
      </div>
    </GymModal>
  );
}
