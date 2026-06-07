import { useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  useEvaluationHistory,
  useCreateEvaluation,
  useUpdateEvaluation,
  useExercisePlans,
  useCreateExercisePlan,
} from '../hooks/useNutrition';
import { usePatients } from '../hooks/usePatients';
import { useClients } from '../hooks/useClients';
import { GymCard } from '../components/ui/GymCard';
import { GymModal } from '../components/ui/GymModal';
import { GymButton } from '../components/ui/GymButton';
import { ConsultModal } from '../components/ui/ConsultModal/ConsultModal';
import { IconClipboardHeart } from '@tabler/icons-react';
import '../styles/nutrition.css';

const ClientCard = ({ patient, onEvaluate, onShowDetails }) => {
  const isClient = patient.userType === 'client';
  const days = isClient && patient.end_date ? Math.max(0, Math.ceil((new Date(patient.end_date) - new Date()) / (1000 * 60 * 60 * 24))) : 0;
  const isFreeConsult = patient.userType === 'patient' && patient.is_free_consult;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-alt)] p-4 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p 
            className="font-semibold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-secondary)] hover:underline transition-colors"
            onClick={() => onShowDetails(patient)}
          >
            {patient.first_name} {patient.last_name}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">{patient.phone || 'Sin teléfono'}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold text-center ${isFreeConsult ? 'bg-[rgba(34,197,94,0.15)] text-[var(--color-success)]' : 'bg-[rgba(14,116,144,0.12)] text-[var(--color-teal)]'}`}>
          {patient.consultType || 'Regular'}
        </span>
      </div>
      <div className="mb-4 flex flex-wrap gap-2 items-center flex-grow">
        <span className="rounded-full bg-[rgba(14,116,144,0.12)] px-3 py-1 text-xs font-semibold text-[var(--color-teal)]">{patient.plan_name || 'Sin plan'}</span>
        {days > 0 && <span className="rounded-full bg-[rgba(226,154,0,0.12)] px-3 py-1 text-xs font-semibold text-[var(--color-secondary)]">{days} días</span>}
      </div>
      <div className="grid gap-3 mt-auto">
        <GymButton size="sm" variant="primary" className="w-full" icon={<IconClipboardHeart size={16} />} onClick={() => onEvaluate(patient)}>Evaluar</GymButton>
      </div>
    </motion.div>
  );
};

const EvaluationRow = ({ evaluation, onEdit }) => {
  const date = new Date(evaluation.evaluation_date).toLocaleDateString('es-MX');
  const bmi = evaluation.height_cm ? (evaluation.weight_kg / ((evaluation.height_cm / 100) ** 2)).toFixed(1) : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[var(--radius-lg)] border-l-4 border-[var(--color-secondary)] bg-[var(--color-card-alt)] p-4 shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-semibold text-[var(--color-text)]">{date}</p>
          {evaluation.is_free_consult && (
            <span className="mt-2 inline-flex rounded-full bg-[rgba(34,197,94,0.16)] px-3 py-1 text-xs font-semibold text-[var(--color-success)]">Primera consulta gratis</span>
          )}
        </div>
        <GymButton size="xs" variant="ghost" onClick={() => onEdit(evaluation)}>Editar</GymButton>
      </div>
      <div className="grid grid-cols-3 gap-3 text-xs text-[var(--color-text-muted)]">
        <div><p className="text-[var(--color-text)] font-semibold">Peso</p><p>{evaluation.weight_kg || '—'} kg</p></div>
        <div><p className="text-[var(--color-text)] font-semibold">Grasa</p><p>{evaluation.body_fat_pct || '—'}%</p></div>
        <div><p className="text-[var(--color-text)] font-semibold">IMC</p><p>{bmi}</p></div>
      </div>
      {evaluation.body_composition_notes && <p className="mt-3 text-sm italic text-[var(--color-text-muted)]">“{evaluation.body_composition_notes}”</p>}
    </motion.div>
  );
};

export default function Nutrition() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [modalEvaluate, setModalEvaluate] = useState(false);
  const [modalDetails, setModalDetails] = useState(false);
  const [defaultTab, setDefaultTab] = useState('composition');
  const [planForm] = useState({
    monday: { exercises: [] },
    tuesday: { exercises: [] },
    wednesday: { exercises: [] },
    thursday: { exercises: [] },
    friday: { exercises: [] },
    saturday: { exercises: [] },
    notes: '',
  });

  const { data: patientsResponse, isLoading: patientsLoading } = usePatients();
  const { data: clientsResponse, isLoading: clientsLoading } = useClients();
  const { data: evaluationsResponse } = useEvaluationHistory(selectedPatient?.id);
  const { data: plansResponse } = useExercisePlans(selectedPatient?.id);
  const createEvaluation = useCreateEvaluation();
  const updateEvaluation = useUpdateEvaluation();
  const createExercisePlan = useCreateExercisePlan();

  const rawPatients = Array.isArray(patientsResponse) ? patientsResponse : patientsResponse?.data || [];
  const rawClients = Array.isArray(clientsResponse) ? clientsResponse : clientsResponse?.data || [];
  const queueLoading = patientsLoading || clientsLoading;

  const patientsQueue = rawPatients.map(p => ({ ...p, userType: 'patient', consultType: p.is_free_consult ? 'Primera consulta gratis' : 'Consulta regular' }));
  const clientsQueue = rawClients.map(c => ({ ...c, userType: 'client', consultType: 'Cliente de gimnasio' }));
  const queue = [...patientsQueue, ...clientsQueue];

  const history = Array.isArray(evaluationsResponse) ? evaluationsResponse : evaluationsResponse?.data || [];
  const plans = Array.isArray(plansResponse) ? plansResponse : plansResponse?.data || [];

  const handleEvaluate = (patient) => {
    setSelectedPatient(patient);
    setSelectedEvaluation(null);
    setDefaultTab('composition');
    setModalEvaluate(true);
  };

  const handleShowDetails = (patient) => {
    setSelectedPatient(patient);
    setModalDetails(true);
  };

  const handleSaveEvaluation = async (payload) => {
    const entityType = selectedPatient?.userType === 'client' ? 'gym' : 'consultorio';
    const cleanedPayload = {
      ...payload,
      entity_type: entityType,
    };

    ['weight_kg', 'height_cm', 'body_fat_pct', 'visceral_fat_pct', 'muscle_mass_kg', 'waist_cm', 'caloric_target', 'protein_target_g', 'carbs_target_g', 'fat_target_g', 'energy_level', 'hunger_level', 'sleep_quality', 'concentration_level', 'mood_level'].forEach((key) => {
      if (cleanedPayload[key] !== undefined && cleanedPayload[key] !== '') {
        cleanedPayload[key] = Number(cleanedPayload[key]);
      } else {
        delete cleanedPayload[key];
      }
    });

    Object.keys(cleanedPayload).forEach((key) => {
      if (cleanedPayload[key] === '') delete cleanedPayload[key];
    });

    try {
      if (selectedEvaluation) {
        await updateEvaluation.mutateAsync({ recordId: selectedEvaluation.id, data: cleanedPayload });
      } else {
        await createEvaluation.mutateAsync(cleanedPayload);
      }
      toast.success('Evaluación guardada');
      setModalEvaluate(false);
    } catch (error) {
      toast.error(error.message || 'Error al guardar evaluación');
    }
  };

  const handleSavePlan = async (payload) => {
    try {
      await createExercisePlan.mutateAsync(payload);
      toast.success('Plan guardado');
      setModalEvaluate(false);
    } catch (error) {
      toast.error(error.message || 'Error al guardar plan');
    }
  };

  return (
    <div className="min-h-screen p-6 bg-[var(--color-surface)] space-y-6">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-3 rounded-full bg-[rgba(226,154,0,0.12)] px-4 py-2 text-sm font-semibold text-[var(--color-secondary)]">Nutriología</div>
        <div>
          <h1 className="text-4xl font-[var(--font-display)] font-bold text-[var(--color-text)]">Gestión de consulta nutricional</h1>
          <p className="text-[var(--color-text-muted)] mt-2">Administra la cola de pacientes, evaluaciones y planes con estilo premium.</p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6 h-full">
          <GymCard title="Cola de Pacientes" subtitle="Pacientes de consultorio" variant="default">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {queueLoading ? (
                <p className="text-[var(--color-text-muted)] col-span-full">Cargando pacientes...</p>
              ) : patientsQueue.length === 0 ? (
                <p className="text-[var(--color-text-muted)] col-span-full">No hay pacientes registrados.</p>
              ) : (
                patientsQueue.map((patient) => (
                  <ClientCard key={`patient-${patient.id}`} patient={patient} onEvaluate={handleEvaluate} onShowDetails={handleShowDetails} />
                ))
              )}
            </div>
          </GymCard>

          <GymCard title="Cola de Clientes" subtitle="Clientes de gimnasio" variant="default">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {queueLoading ? (
                <p className="text-[var(--color-text-muted)] col-span-full">Cargando clientes...</p>
              ) : clientsQueue.length === 0 ? (
                <p className="text-[var(--color-text-muted)] col-span-full">No hay clientes registrados.</p>
              ) : (
                clientsQueue.map((client) => (
                  <ClientCard key={`client-${client.id}`} patient={client} onEvaluate={handleEvaluate} onShowDetails={handleShowDetails} />
                ))
              )}
            </div>
          </GymCard>
        </div>

        <div className="space-y-6">
          <GymCard title="Evaluaciones recientes" variant="default">
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-[var(--color-text-muted)]">No hay evaluaciones recientes.</p>
              ) : (
                history.map((evaluation) => (
                  <EvaluationRow
                    key={evaluation.id}
                    evaluation={evaluation}
                    onEdit={(evaluationItem) => {
                      setSelectedEvaluation(evaluationItem);
                      setModalEvaluate(true);
                    }}
                  />
                ))
              )}
            </div>
          </GymCard>

          <GymCard title="Resumen rápido" variant="default">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-[var(--radius-lg)] bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">Evaluaciones</p>
                <p className="mt-3 text-3xl font-bold text-[var(--color-secondary)]">{history.length}</p>
              </div>
              <div className="rounded-[var(--radius-lg)] bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">Planes activos</p>
                <p className="mt-3 text-3xl font-bold text-[var(--color-text)]">{plans.length}</p>
              </div>
              <div className="rounded-[var(--radius-lg)] bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">Pacientes hoy</p>
                <p className="mt-3 text-3xl font-bold text-[var(--color-success)]">{queue.length}</p>
              </div>
            </div>
          </GymCard>
        </div>
      </div>

            <ConsultModal
        isOpen={modalEvaluate}
        onClose={() => setModalEvaluate(false)}
        title={defaultTab === 'exercise_plan' ? `Plan de Ejercicio — ${selectedPatient?.first_name || 'Paciente'}` : `Evaluación — ${selectedPatient?.first_name || 'Paciente'}`}
        patient={selectedPatient}
        evaluation={selectedEvaluation}
        plan={planForm}
        defaultTab={defaultTab}
        onSubmit={handleSaveEvaluation}
        onSubmitPlan={handleSavePlan}
        submitLabel={defaultTab === 'exercise_plan' ? 'Guardar Plan' : 'Guardar Evaluación'}
      />

      <GymModal isOpen={modalDetails} onClose={() => setModalDetails(false)} title={`Detalles de Paciente — ${selectedPatient?.first_name || 'Paciente'}`} width="lg">
        <div className="space-y-6">
          <div className="bg-[var(--color-card-alt)] p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">Información de Contacto</h3>
            <p className="text-[var(--color-text-muted)]"><strong>Teléfono:</strong> {selectedPatient?.phone || 'N/A'}</p>
            <p className="text-[var(--color-text-muted)]"><strong>Email:</strong> {selectedPatient?.email || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-3">Historial de Consultas</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {history.length === 0 ? (
                <p className="text-[var(--color-text-muted)]">No hay consultas registradas para este paciente.</p>
              ) : (
                history.map((evaluation) => (
                  <div key={evaluation.id} className="p-3 border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-surface)]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-[var(--color-text)]">{new Date(evaluation.evaluation_date).toLocaleDateString('es-MX')}</span>
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
                ))
              )}
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-[var(--color-border)]">
            <GymButton variant="secondary" onClick={() => setModalDetails(false)}>Cerrar</GymButton>
          </div>
        </div>
      </GymModal>
    </div>
  );
}
