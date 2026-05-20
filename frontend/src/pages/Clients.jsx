import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useClients, useCreateClient, usePlans } from '../hooks/useClients';
import { useRenewSubscription } from '../hooks/useDashboard';
import { GymCard } from '../components/ui/GymCard';
import { GymModal } from '../components/ui/GymModal';
import { GymButton } from '../components/ui/GymButton';
import { IconChevronUp, IconChevronDown, IconSelector, IconPlus, IconRefresh } from '@tabler/icons-react';

export default function Clients() {
  const [filterTab, setFilterTab] = useState('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // View state
  const [viewClientModal, setViewClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Renew state
  const [renewModal, setRenewModal] = useState(false);
  const [renewFormData, setRenewFormData] = useState({ payment_method: 'cash', amount: 0 });

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    plan_id: '',
    plan_requires_enrollment: false,
    first_name: '',
    last_name: '',
    age: '',
    phone: '',
    rfc: '',
    payment_method: 'cash',
    amount: '',
    coach_fitness_level: '',
    coach_health_notes: '',
    coach_goal: '',
  });

  const { data, isLoading, refetch } = useClients({ type: filterTab, search: searchQuery });
  const clients = Array.isArray(data) ? data : data?.data || [];
  const { data: plansData, isLoading: isLoadingPlans } = usePlans();
  const planOptions = Array.isArray(plansData?.data) ? plansData.data : [];
  const createClientMutation = useCreateClient();
  const renewSubscription = useRenewSubscription();

  const openModal = () => {
    setStep(1);
    setFormData({
      plan_id: '',
      plan_requires_enrollment: false,
      first_name: '',
      last_name: '',
      age: '',
      phone: '',
      rfc: '',
      payment_method: 'cash',
      amount: '',
      coach_fitness_level: '',
      coach_health_notes: '',
      coach_goal: '',
    });
    setIsModalOpen(true);
  };

  const nextStep = () => {
    if (step === 4 || (step === 3 && !formData.plan_requires_enrollment)) {
      return submitForm();
    }
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const submitForm = () => {
    const payload = {
      ...formData,
      age: Number(formData.age),
      payment_amount: Number(formData.amount),
    };

    if (payload.plan_requires_enrollment) {
      payload.enrollment_amount = 0; // Se podría añadir un campo en UI, por ahora 0 para que backend no falle si no se cobra extra
    }

    delete payload.amount;
    delete payload.plan_requires_enrollment;
    
    // Sanitize empty strings to avoid Zod schema validation errors
    if (!payload.coach_fitness_level) delete payload.coach_fitness_level;
    if (!payload.coach_health_notes) delete payload.coach_health_notes;
    if (!payload.coach_goal) delete payload.coach_goal;

    createClientMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Cliente registrado exitosamente');
        setIsModalOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || 'Error al registrar el cliente');
      },
    });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedClients = useMemo(() => {
    let sortableItems = [...clients];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'clientName') {
          aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
          bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
        }

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [clients, sortConfig]);

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? <IconChevronUp size={16} className="inline ml-1" /> : <IconChevronDown size={16} className="inline ml-1" />;
    }
    return <IconSelector size={16} className="inline ml-1 text-[var(--color-text-muted)]" />;
  };

  const handleViewClient = (client) => {
    setSelectedClient(client);
    setViewClientModal(true);
  };

  const handleRenewClient = (client) => {
    setSelectedClient(client);
    setRenewFormData({ payment_method: 'cash', amount: 0 });
    setRenewModal(true);
  };

  const confirmRenew = async () => {
    if (!renewFormData.amount || renewFormData.amount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    try {
      await renewSubscription.mutateAsync({
        client_id: selectedClient.id,
        amount: parseFloat(renewFormData.amount),
        payment_method: renewFormData.payment_method,
      });
      toast.success('Suscripción renovada');
      setRenewModal(false);
      refetch();
    } catch (error) {
      toast.error(error.message || 'Error al renovar suscripción');
    }
  };

  const getClientStatus = (client) => {
    if (!client) return 'expired';
    if (client.subscription_status === 'active') {
      if (!client.end_date) return 'active';
      const end = new Date(client.end_date);
      const now = new Date();
      const diffTime = end - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 3 && diffDays >= 0) return 'expiring';
      if (diffDays < 0) return 'expired';
      return 'active';
    }
    return 'expired';
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {planOptions.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setFormData({
                ...formData,
                plan_id: plan.id,
                plan_requires_enrollment: plan.requires_enrollment,
                amount: plan.price_monthly,
              })}
              className={`rounded-[var(--radius-lg)] border p-4 text-left transition ${
                formData.plan_id === plan.id ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)]/10 shadow-[var(--shadow-card)]' : 'border-[var(--color-border)] bg-[var(--color-card-alt)] hover:border-[var(--color-secondary)]'
              }`}
            >
              <p className="text-base font-semibold text-[var(--color-text)]">{plan.name}</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">${plan.price_monthly} MXN</p>
            </button>
          ))}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: 'Nombre', key: 'first_name' },
            { label: 'Apellidos', key: 'last_name' },
            { label: 'Edad', key: 'age', type: 'number' },
            { label: 'Teléfono', key: 'phone' },
            { label: 'RFC', key: 'rfc' },
          ].map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{field.label}</label>
              <input
                type={field.type || 'text'}
                value={formData[field.key]}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
              />
            </div>
          ))}
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="grid gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Método de pago</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Monto</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
              placeholder="0.00"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-4">
          {[
            { label: 'Condición física', key: 'coach_fitness_level' },
            { label: 'Notas de salud', key: 'coach_health_notes', textarea: true },
            { label: 'Objetivo principal', key: 'coach_goal', textarea: true },
          ].map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{field.label}</label>
              {field.textarea ? (
                <textarea
                  rows={3}
                  value={formData[field.key]}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                />
              ) : (
                <input
                  type="text"
                  value={formData[field.key]}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 bg-[var(--color-surface)] space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-3 rounded-full bg-[rgba(226,154,0,0.12)] px-4 py-2 text-sm font-semibold text-[var(--color-secondary)]">Clientes</div>
          <div>
            <h1 className="text-4xl font-[var(--font-display)] font-bold text-[var(--color-text)]">Administración de clientes</h1>
            <p className="text-[var(--color-text-muted)] mt-2">Filtra, busca y registra nuevos miembros desde una interfaz premium.</p>
          </div>
        </div>
        <GymButton icon={<IconPlus size={18} />} variant="primary" onClick={openModal}>Agregar Cliente</GymButton>
      </header>

      <GymCard title="Clientes registrados" variant="default">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente..."
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
            />
            <div className="flex flex-wrap items-center gap-2 bg-[var(--color-card-alt)] rounded-[var(--radius-lg)] p-1 shrink-0">
              {['monthly', 'visit', 'weekly'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterTab(tab)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${filterTab === tab ? 'bg-[var(--color-secondary)] text-black' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                  {tab === 'monthly' ? 'Mensuales' : tab === 'visit' ? 'Visitantes' : 'Semanales'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-alt)]">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs uppercase tracking-[0.15em] select-none">
                  <th className="px-4 py-4 cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors" onClick={() => handleSort('clientName')}>
                    Cliente {getSortIcon('clientName')}
                  </th>
                  <th className="px-4 py-4">Teléfono</th>
                  <th className="px-4 py-4 cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors" onClick={() => handleSort('plan_name')}>
                    Plan {getSortIcon('plan_name')}
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors" onClick={() => handleSort('status')}>
                    Estado {getSortIcon('status')}
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors" onClick={() => handleSort('consecutive_months')}>
                    Meses {getSortIcon('consecutive_months')}
                  </th>
                  <th className="px-4 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                   <tr>
                     <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-muted)]">Cargando clientes...</td>
                   </tr>
                ) : sortedClients.map((client, index) => {
                  const currentStatus = getClientStatus(client);
                  return (
                  <tr key={client.id} className={index % 2 === 0 ? 'bg-[var(--color-card-alt)]' : 'bg-[var(--color-card)]'}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-secondary)] text-white font-bold">{client.first_name?.[0]}{client.last_name?.[0]}</div>
                        <div>
                          <p className="font-semibold text-[var(--color-text)]">{client.first_name} {client.last_name}</p>
                          <p className="text-sm text-[var(--color-text-muted)]">{client.plan_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-text-muted)]">{client.phone}</td>
                    <td className="px-4 py-4 text-sm text-[var(--color-text)]">{client.plan_name}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${currentStatus === 'active' ? 'bg-[rgba(34,197,94,0.15)] text-[var(--color-success)]' : currentStatus === 'expiring' ? 'bg-[rgba(245,158,11,0.15)] text-[var(--color-warning)]' : 'bg-[rgba(239,68,68,0.15)] text-[var(--color-danger)]'}`}>
                        {currentStatus === 'active' ? 'Activo' : currentStatus === 'expiring' ? 'Por vencer' : 'Vencido'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-text-muted)]">{client.consecutive_months ?? 0}</td>
                    <td className="px-4 py-4 space-x-2 whitespace-nowrap">
                      <GymButton size="xs" variant="secondary" onClick={() => handleViewClient(client)}>Ver</GymButton>
                      <GymButton size="xs" variant="warning" icon={<IconRefresh size={14} />} onClick={() => handleRenewClient(client)}>Renovar</GymButton>
                    </td>
                  </tr>
                )})}
                {!isLoading && sortedClients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-muted)]">No se encontraron clientes.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </GymCard>

      <GymModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nuevo Cliente" width="lg">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Paso {step} de 4</p>
              <div className="mt-2 h-2 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--color-secondary)]" style={{ width: `${(step / 4) * 100}%` }} />
              </div>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">{step === 1 ? 'Selecciona un plan' : step === 2 ? 'Datos personales' : step === 3 ? 'Pago inicial' : 'Encuesta coach'}</p>
          </div>

          {renderStep()}

          <div className="flex justify-between gap-3">
            <GymButton variant="secondary" onClick={() => setStep(Math.max(step - 1, 1))} disabled={step === 1}>Atrás</GymButton>
            <GymButton variant="primary" onClick={nextStep}>
              {step < 4 ? 'Siguiente' : 'Registrar cliente'}
            </GymButton>
          </div>
        </div>
      </GymModal>

      <GymModal isOpen={viewClientModal} onClose={() => setViewClientModal(false)} title="Detalles del Cliente" width="md">
        {selectedClient && (
          <div className="space-y-4 text-[var(--color-text)]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--color-text-muted)] font-semibold">Nombre Completo</p>
                <p>{selectedClient.first_name} {selectedClient.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)] font-semibold">Teléfono</p>
                <p>{selectedClient.phone}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)] font-semibold">Plan</p>
                <p>{selectedClient.plan_name}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)] font-semibold">Estado</p>
                <p>{getClientStatus(selectedClient) === 'active' ? 'Activo' : getClientStatus(selectedClient) === 'expiring' ? 'Por vencer' : 'Vencido'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)] font-semibold">Meses Consecutivos</p>
                <p>{selectedClient.consecutive_months ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)] font-semibold">Vencimiento</p>
                <p>{selectedClient.end_date ? new Date(selectedClient.end_date).toLocaleDateString('es-MX') : 'N/A'}</p>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <GymButton variant="secondary" onClick={() => setViewClientModal(false)}>Cerrar</GymButton>
            </div>
          </div>
        )}
      </GymModal>

      <GymModal isOpen={renewModal} onClose={() => setRenewModal(false)} title="Renovar Suscripción" width="sm">
        <div className="space-y-4 text-[var(--color-text-muted)]">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">Método de Pago</label>
            <select
              value={renewFormData.payment_method}
              onChange={(e) => setRenewFormData({ ...renewFormData, payment_method: e.target.value })}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3 py-2 text-[var(--color-text)]"
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">Monto (MXN)</label>
            <input
              type="number"
              value={renewFormData.amount}
              onChange={(e) => setRenewFormData({ ...renewFormData, amount: e.target.value })}
              placeholder="0.00"
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3 py-2 text-[var(--color-text)]"
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <GymButton variant="secondary" size="sm" onClick={() => setRenewModal(false)}>Cancelar</GymButton>
            <GymButton variant="success" size="sm" onClick={confirmRenew} loading={renewSubscription.isLoading}>Renovar</GymButton>
          </div>
        </div>
      </GymModal>
    </div>
  );
}