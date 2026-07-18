import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useClients, useCreateClient, useUpdateClient, usePlans, validateClientField } from '../hooks/useClients';
import { useRenewSubscription } from '../hooks/useDashboard';
import { GymCard } from '../components/ui/GymCard';
import { GymModal } from '../components/ui/GymModal';
import { GymButton } from '../components/ui/GymButton';
import { IconChevronUp, IconChevronDown, IconSelector, IconPlus, IconRefresh } from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';

import { HybridDateInput } from '../components/ui/HybridDateInput';
import { SimpleDateInput } from '../components/ui/SimpleDateInput';

export default function Clients() {
  const [filterTab, setFilterTab] = useState('enrolled');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVisitMode, setIsVisitMode] = useState(false);

  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // View state
  const [viewClientModal, setViewClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Edit state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [editFieldErrors, setEditFieldErrors] = useState({});
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    gender: 'Masculino',
    phone: '',
    email: '',
    rfc: '',
    age: '',
    coach_fitness_level: '',
    coach_health_notes: '',
    coach_goal: '',
    notes: '',
  });

  // Renew state
  const [renewModal, setRenewModal] = useState(false);
  const [renewFormData, setRenewFormData] = useState({ payment_method: 'cash', plan_id: null });

  const [step, setStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    plan_id: '',
    plan_requires_enrollment: false,
    first_name: '',
    last_name: '',
    birth_date: '',
    age: '',
    gender: 'Masculino',
    phone: '',
    email: '',
    rfc: '',
    payment_method: 'cash',
    amount: '',
    enrollment_amount: '500', //  Inicializado en 500 por defecto
    coach_fitness_level: '',
    coach_health_notes: '',
    coach_goal: '',
  });

  const { data, isLoading, refetch } = useClients({ search: searchQuery });
  const clients = Array.isArray(data) ? data : data?.data || [];
  const { data: plansData, isLoading: isLoadingPlans } = usePlans();
  const planOptions = Array.isArray(plansData?.data) ? plansData.data : [];
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const renewSubscription = useRenewSubscription();

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  };

  const handleEditClient = (client) => {
    let genderVal = client.gender || 'Masculino';
    if (genderVal === 'M') genderVal = 'Masculino';
    if (genderVal === 'F') genderVal = 'Femenino';
    if (genderVal === 'O') genderVal = 'Otro';

    setEditingClient(client);
    setEditFormData({
      first_name: client.first_name || '',
      last_name: client.last_name || '',
      gender: genderVal,
      phone: client.phone || '',
      email: client.email || '',
      rfc: client.rfc || '',
      plan_id: client.plan_id || '',
      age: client.age || '',
      coach_fitness_level: client.coach_fitness_level || '',
      coach_health_notes: client.coach_health_notes || '',
      coach_goal: client.coach_goal || '',
      notes: client.notes || '',
      birth_date: formatDateForInput(client.birth_date),
      enrollment_date: formatDateForInput(client.enrollment_date),
      enrollment_expires_at: formatDateForInput(client.enrollment_expires_at),
      subscription_start_date: formatDateForInput(client.start_date),
      subscription_end_date: formatDateForInput(client.end_date),
    });
    setEditFieldErrors({});
    setIsEditModalOpen(true);
  };

  const handleBirthDateChange = (dateVal) => {
    let calculatedAge = '';
    if (dateVal) {
      const birthDate = new Date(dateVal);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      calculatedAge = age >= 0 ? age.toString() : '';
    }
    setEditFormData(prev => ({
      ...prev,
      birth_date: dateVal,
      age: calculatedAge
    }));
  };

  const handleEnrollmentDateChange = (dateVal) => {
    let expires = '';
    if (dateVal) {
      const d = new Date(dateVal + 'T00:00:00');
      d.setFullYear(d.getFullYear() + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      expires = `${y}-${m}-${day}`;
    }
    setEditFormData(prev => ({
      ...prev,
      enrollment_date: dateVal,
      enrollment_expires_at: expires
    }));
  };

  const handleSubscriptionStartDateChange = (dateVal) => {
    let expires = '';
    if (dateVal) {
      const plan = planOptions.find(p => p.id === editingClient?.plan_id);
      const days = plan?.duration_days || 30;

      const d = new Date(dateVal + 'T00:00:00');
      d.setDate(d.getDate() + days);

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      expires = `${y}-${m}-${day}`;
    }
    setEditFormData(prev => ({
      ...prev,
      subscription_start_date: dateVal,
      subscription_end_date: expires
    }));
  };

  const handleUpdateSubmit = () => {
    if (!editFormData.first_name || !editFormData.last_name) {
      toast.error('Por favor, ingresa el nombre y los apellidos');
      return;
    }
    if (editFieldErrors.phone || editFieldErrors.rfc) {
      toast.error('Por favor, corrige los errores en el formulario');
      return;
    }

    const payload = {
      id: editingClient.id,
      ...editFormData,
    };

    if (payload.age) {
      payload.age = Number(payload.age);
    } else {
      payload.age = null;
    }

    // Sanitize empty strings to avoid Zod schema validation errors
    if (!payload.phone) delete payload.phone;
    if (!payload.rfc) delete payload.rfc;
    if (!payload.email) delete payload.email;
    if (!payload.coach_fitness_level) delete payload.coach_fitness_level;
    if (!payload.coach_health_notes) delete payload.coach_health_notes;
    if (!payload.coach_goal) delete payload.coach_goal;
    if (!payload.notes) delete payload.notes;

    payload.birth_date = payload.birth_date || null;
    payload.enrollment_date = payload.enrollment_date || null;
    payload.enrollment_expires_at = payload.enrollment_expires_at || null;
    payload.subscription_start_date = payload.subscription_start_date || null;
    payload.subscription_end_date = payload.subscription_end_date || null;

    updateClientMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Cliente actualizado exitosamente');
        setIsEditModalOpen(false);
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || 'Error al actualizar el cliente');
      },
    });
  };

  const openModal = (isVisit = false) => {
    setIsVisitMode(isVisit);
    setStep(1);
    setFieldErrors({});
    setFormData({
      plan_id: '',
      plan_requires_enrollment: false,
      first_name: '',
      last_name: '',
      age: '',
      gender: 'Masculino',
      phone: '',
      rfc: '',
      payment_method: 'cash',
      amount: '',
      enrollment_amount: '500', // Resetear también a 500 al abrir
      coach_fitness_level: '',
      coach_health_notes: '',
      coach_goal: '',
    });
    setIsModalOpen(true);
  };

  const nextStep = () => {
    if (step === 1 && !formData.plan_id) {
      toast.error('Por favor, selecciona un plan');
      return;
    }
    if (step === 2 && (!formData.first_name || !formData.last_name)) {
      toast.error('Por favor, ingresa el nombre y los apellidos');
      return;
    }

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
      //  Tomar el valor numérico digitado en el input editable
      payload.enrollment_amount = Number(formData.enrollment_amount) || 0;
    } else {
      delete payload.enrollment_amount;
    }

    delete payload.amount;
    delete payload.plan_requires_enrollment;

    // Sanitize empty strings to avoid Zod schema validation errors
    if (!payload.age) delete payload.age;
    if (!payload.phone) delete payload.phone;
    if (!payload.rfc) delete payload.rfc;
    if (!payload.coach_fitness_level) delete payload.coach_fitness_level;
    if (!payload.coach_health_notes) delete payload.coach_health_notes;
    if (!payload.coach_goal) delete payload.coach_goal;

    createClientMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Cliente registrado exitosamente');
        setIsModalOpen(false);
      },
      onError: (error) => {
        const msg = error.message || 'Error al registrar el cliente';
        if (msg.includes('número de teléfono')) {
          setFieldErrors({ phone: msg });
          setStep(2);
        } else if (msg.includes('RFC')) {
          setFieldErrors({ rfc: msg });
          setStep(2);
        } else {
          toast.error(msg);
        }
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
    let filteredItems = clients.filter(client => {
      const isVisitor = client.plan_name?.toLowerCase().includes('día') || client.plan_name?.toLowerCase().includes('semana') || client.plan_name?.toLowerCase().includes('visita');
      if (filterTab === 'visit') return isVisitor;
      if (filterTab === 'enrolled') return !isVisitor;
      return true;
    });

    let sortableItems = [...filteredItems];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'clientName') {
          aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
          bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
        }

        if (sortConfig.key === 'end_date') {
          aVal = a.end_date ? new Date(a.end_date).getTime() : 0;
          bVal = b.end_date ? new Date(b.end_date).getTime() : 0;
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
  }, [clients, sortConfig, filterTab]);

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
    setRenewFormData({ payment_method: 'cash', plan_id: client.plan_id });
    setRenewModal(true);
  };

  const confirmRenew = async () => {
    if (!renewFormData.plan_id) {
      toast.error('Por favor, selecciona un plan para renovar.');
      return;
    }

    const selectedPlan = planOptions.find(p => p.id === renewFormData.plan_id);
    if (!selectedPlan) {
      toast.error('El plan seleccionado no es válido.');
      return;
    }

    try {
      await renewSubscription.mutateAsync({
        client_id: selectedClient.id,
        amount: parseFloat(selectedPlan.price_monthly),
        payment_method: renewFormData.payment_method,
      });
      toast.success('Suscripción renovada exitosamente');
      setRenewModal(false);
      refetch();
    } catch (error) {
      toast.error(error.message || 'Ocurrió un error al renovar la suscripción');
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
      const visiblePlans = planOptions.filter(plan => isVisitMode ? plan.is_visit_based : !plan.is_visit_based);
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {visiblePlans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setFormData({
                  ...formData,
                  plan_id: plan.id,
                  plan_requires_enrollment: plan.requires_enrollment,
                  amount: plan.price_monthly,
                })}
                className={`rounded-[var(--radius-lg)] border p-4 text-left transition ${formData.plan_id === plan.id ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)]/10 shadow-[var(--shadow-card)]' : 'border-[var(--color-border)] bg-[var(--color-card-alt)] hover:border-[var(--color-secondary)]'
                  }`}
              >
                <p className="text-base font-semibold text-[var(--color-text)]">{plan.name}</p>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">${plan.price_monthly} MXN</p>
              </button>
            ))}
          </div>
          {formData.plan_id && (
            <div className="rounded-[var(--radius-lg)] border p-4 text-left border-[var(--color-secondary)] bg-[var(--color-secondary)]/10 shadow-[var(--shadow-card)] space-y-2">
              <label className="block text-base font-semibold text-[var(--color-text)]">
                Precio del Plan (MXN)
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-[var(--color-text)] focus:border-[var(--color-secondary)] focus:outline-none"
                placeholder="0.00"
              />
              <p className="text-xs text-[var(--color-text-muted)]">Modifica el precio del plan si deseas aplicar un descuento o tarifa especial.</p>
            </div>
          )}

          {!isVisitMode && (
            /*  Modificado de contenedor estático a campo de entrada interactivo */
            <div className="rounded-[var(--radius-lg)] border p-4 text-left border-[var(--color-secondary)] bg-[var(--color-secondary)]/10 shadow-[var(--shadow-card)] space-y-2">
              <label className="block text-base font-semibold text-[var(--color-text)]">
                Monto de Inscripción (MXN)
              </label>
              <input
                type="number"
                value={formData.enrollment_amount}
                onChange={(e) => setFormData({ ...formData, enrollment_amount: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-[var(--color-text)] focus:border-[var(--color-secondary)] focus:outline-none"
                placeholder="500.00"
              />
              <p className="text-xs text-[var(--color-text-muted)]">Modifica el monto si deseas aplicar un descuento o tarifa especial.</p>
            </div>
          )}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: 'Nombre', key: 'first_name' },
            { label: 'Apellidos', key: 'last_name' },
            { label: 'Sexo', key: 'gender', type: 'select', options: ['Masculino', 'Femenino', 'Otro'] },
            { label: 'Teléfono', key: 'phone' },
            { label: 'Correo electrónico', key: 'email', type: 'email' },
            // { label: 'RFC', key: 'rfc' },
          ].map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{field.label}</label>
              {field.type === 'select' ? (
                <select
                  value={formData[field.key]}
                  onChange={(e) => {
                    setFormData({ ...formData, [field.key]: e.target.value });
                    if (fieldErrors[field.key]) setFieldErrors({ ...fieldErrors, [field.key]: null });
                  }}
                  className={`w-full rounded-[var(--radius-md)] border ${fieldErrors[field.key] ? 'border-red-500' : 'border-[var(--color-border)]'} bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]`}
                >
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || 'text'}
                  value={formData[field.key]}
                  onChange={(e) => {
                    setFormData({ ...formData, [field.key]: e.target.value });
                    if (fieldErrors[field.key]) setFieldErrors({ ...fieldErrors, [field.key]: null });
                  }}
                  onBlur={async (e) => {
                    if ((field.key === 'phone' || field.key === 'rfc') && e.target.value) {
                      try {
                        await validateClientField(field.key, e.target.value);
                      } catch (error) {
                        setFieldErrors((prev) => ({ ...prev, [field.key]: error.message }));
                      }
                    }
                  }}
                  className={`w-full rounded-[var(--radius-md)] border ${fieldErrors[field.key] ? 'border-red-500' : 'border-[var(--color-border)]'} bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]`}
                />
              )}
              {fieldErrors[field.key] && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors[field.key]}</p>
              )}
            </div>
          ))}

          <div className="sm:col-span-2 mt-2">
            <HybridDateInput
              value={formData.birth_date}
              error={fieldErrors.birth_date}
              onChange={(dateStr, calculatedAge) => {
                setFormData({
                  ...formData,
                  birth_date: dateStr,
                  age: calculatedAge !== null ? calculatedAge.toString() : ''
                });
                if (fieldErrors.birth_date) setFieldErrors({ ...fieldErrors, birth_date: null });
              }}
            />
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-4">
          <div className="space-y-2 mb-6">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Método de pago</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>

          {/* Desglose de costos */}
          <div className="space-y-3">
            {formData.plan_requires_enrollment && (
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-[var(--color-text-muted)]">
                  Costo de Inscripción (MXN)
                </label>
                <input
                  type="number"
                  value={formData.enrollment_amount}
                  onChange={(e) => setFormData({ ...formData, enrollment_amount: e.target.value })}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-secondary)] focus:outline-none"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">
                Costo del Plan (MXN)
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-secondary)] focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-[var(--color-border)]">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Monto Total a Pagar</label>
            <input
              type="number"
              value={((formData.plan_requires_enrollment ? parseFloat(formData.enrollment_amount || 0) : 0) + parseFloat(formData.amount || 0)).toFixed(2)}
              readOnly
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-lg font-bold text-[var(--color-success)] focus:outline-none"
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
        <div className="flex gap-3">
          <GymButton variant="secondary" onClick={() => openModal(true)}>Agregar visitante</GymButton>
          <GymButton icon={<IconPlus size={18} />} variant="primary" onClick={() => openModal(false)}>Agregar Cliente</GymButton>
        </div>
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
              {['all', 'enrolled', 'visit'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterTab(tab)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${filterTab === tab ? 'bg-[var(--color-secondary)] text-black' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                  {tab === 'all' ? 'Todos' : tab === 'enrolled' ? 'Inscritos' : 'Visitantes'}
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
                  <th className="px-4 py-4 cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors" onClick={() => handleSort('end_date')}>
                    Vencimiento {getSortIcon('end_date')}
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
                            <p className="text-sm text-[var(--color-text-muted)]">
                              {client.plan_name?.toLowerCase().includes('día') || client.plan_name?.toLowerCase().includes('semana') || client.plan_name?.toLowerCase().includes('visita') ? 'Visitante' : client.plan_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-text-muted)]">{client.phone}</td>


                      <td className="px-4 py-4 text-sm text-[var(--color-text)]">
                        {client.plan_name?.toLowerCase().includes('día') || client.plan_name?.toLowerCase().includes('semana') || client.plan_name?.toLowerCase().includes('visita') ? 'Visitante' : client.plan_name}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${currentStatus === 'active' ? 'bg-[rgba(34,197,94,0.15)] text-[var(--color-success)]' : currentStatus === 'expiring' ? 'bg-[rgba(245,158,11,0.15)] text-[var(--color-warning)]' : 'bg-[rgba(239,68,68,0.15)] text-[var(--color-danger)]'}`}>
                          {currentStatus === 'active' ? 'Activo' : currentStatus === 'expiring' ? 'Por vencer' : 'Vencido'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-text)]">
                        {client.end_date ? new Date(client.end_date).toLocaleDateString('es-MX') : 'N/A'}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-text-muted)]">{client.consecutive_months ?? 0}</td>
                      <td className="px-4 py-4 space-x-2 whitespace-nowrap">
                        <GymButton size="xs" variant="secondary" onClick={() => handleViewClient(client)}>Ver</GymButton>
                        <GymButton size="xs" variant="primary" onClick={() => handleEditClient(client)}>Editar</GymButton>
                        <GymButton size="xs" variant="warning" icon={<IconRefresh size={14} />} onClick={() => handleRenewClient(client)}>Renovar</GymButton>
                      </td>
                    </tr>
                  )
                })}
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

      <GymModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isVisitMode ? "Registrar Nuevo Visitante" : "Registrar Nuevo Cliente"} width="lg">
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
              {step < 4 ? 'Siguiente' : (isVisitMode ? 'Registrar visitante' : 'Registrar cliente')}
            </GymButton>
          </div>
        </div>
      </GymModal>

      {/* Los modales de ViewClientModal y RenewModal se quedan exactamente igual... */}
      <GymModal isOpen={viewClientModal} onClose={() => setViewClientModal(false)} title="Detalles del Cliente" width="lg">
        {selectedClient && (
          <div className="space-y-4 text-[var(--color-text)]">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Sección del Código QR */}
              <div className="flex flex-col items-center justify-center p-4 bg-[var(--color-card-alt)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                <div className="p-3 bg-white rounded-lg">
                  <QRCodeSVG
                    value={selectedClient.id}
                    size={140}
                    bgColor={"#ffffff"}
                    fgColor={"#000000"}
                    level={"H"}
                  />
                </div>
              </div>
              {/* Sección de Datos Personales */}
              <div className="grid grid-cols-2 gap-4 flex-1 content-start">
                <div className="col-span-2">
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold">Nombre Completo</p>
                  <p>{selectedClient.first_name} {selectedClient.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold">Teléfono</p>
                  <p>{selectedClient.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold">Correo electrónico</p>
                  <p>{selectedClient.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold">Fecha de nacimiento</p>
                  <p>{selectedClient.birth_date ? new Date(selectedClient.birth_date).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold">Edad</p>
                  <p>{selectedClient.age ? `${selectedClient.age} años` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold">Plan</p>
                  <p>{selectedClient.plan_name?.toLowerCase().includes('día') || selectedClient.plan_name?.toLowerCase().includes('semana') || selectedClient.plan_name?.toLowerCase().includes('visita') ? 'Visitante' : selectedClient.plan_name}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold">Estado</p>
                  <p>{getClientStatus(selectedClient) === 'active' ? 'Activo' : getClientStatus(selectedClient) === 'expiring' ? 'Por vencer' : 'Vencido'}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold">Meses Consecutivos</p>
                  <p>{selectedClient.consecutive_months ?? 0}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold">Vencimiento</p>
                  <p>{selectedClient.end_date ? new Date(selectedClient.end_date).toLocaleDateString('es-MX') : 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <GymButton variant="secondary" onClick={() => setViewClientModal(false)}>Cerrar</GymButton>
            </div>
          </div>
        )}
      </GymModal>

      <GymModal isOpen={renewModal} onClose={() => setRenewModal(false)} title="Renovar Suscripción" width="lg">
        <div className="space-y-6">
          {/* Plan selection */}
          <div className="space-y-4">
            <p className="text-base font-semibold text-[var(--color-text)]">Selecciona el nuevo plan</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {planOptions.filter(p => !p.is_visit_based).map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setRenewFormData({ ...renewFormData, plan_id: plan.id })}
                  className={`rounded-[var(--radius-lg)] border p-4 text-left transition ${renewFormData.plan_id === plan.id ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)]/10 shadow-[var(--shadow-card)]' : 'border-[var(--color-border)] bg-[var(--color-card-alt)] hover:border-[var(--color-secondary)]'
                    }`}
                >
                  <p className="text-base font-semibold text-[var(--color-text)]">{plan.name}</p>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">${plan.price_monthly} MXN</p>
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Método de pago</label>
            <select
              value={renewFormData.payment_method}
              onChange={(e) => setRenewFormData({ ...renewFormData, payment_method: e.target.value })}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <GymButton variant="secondary" onClick={() => setRenewModal(false)}>Cancelar</GymButton>
            <GymButton
              variant="success"
              onClick={confirmRenew}
              loading={renewSubscription.isLoading}
              disabled={!renewFormData.plan_id}
            >
              Renovar Suscripción
            </GymButton>
          </div>
        </div>
      </GymModal>

      <GymModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Cliente" width="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleUpdateSubmit(); }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Nombre</label>
              <input
                type="text"
                value={editFormData.first_name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Apellidos</label>
              <input
                type="text"
                value={editFormData.last_name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Sexo</label>
              <select
                value={editFormData.gender || 'Masculino'}
                onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
              >
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Teléfono</label>
              <input
                type="text"
                value={editFormData.phone || ''}
                onChange={(e) => {
                  setEditFormData({ ...editFormData, phone: e.target.value });
                  if (editFieldErrors.phone) setEditFieldErrors({ ...editFieldErrors, phone: null });
                }}
                onBlur={async (e) => {
                  if (e.target.value && e.target.value !== editingClient?.phone) {
                    try {
                      await validateClientField('phone', e.target.value, editingClient?.id);
                    } catch (error) {
                      setEditFieldErrors((prev) => ({ ...prev, phone: error.message }));
                    }
                  }
                }}
                className={`w-full rounded-[var(--radius-md)] border ${editFieldErrors.phone ? 'border-red-500' : 'border-[var(--color-border)]'} bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]`}
              />
              {editFieldErrors.phone && (
                <p className="text-red-500 text-xs mt-1">{editFieldErrors.phone}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Correo electrónico</label>
              <input
                type="email"
                value={editFormData.email || ''}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">RFC</label>
              <input
                type="text"
                value={editFormData.rfc || ''}
                onChange={(e) => {
                  setEditFormData({ ...editFormData, rfc: e.target.value });
                  if (editFieldErrors.rfc) setEditFieldErrors({ ...editFieldErrors, rfc: null });
                }}
                onBlur={async (e) => {
                  if (e.target.value && e.target.value !== editingClient?.rfc) {
                    try {
                      await validateClientField('rfc', e.target.value, editingClient?.id);
                    } catch (error) {
                      setEditFieldErrors((prev) => ({ ...prev, rfc: error.message }));
                    }
                  }
                }}
                className={`w-full rounded-[var(--radius-md)] border ${editFieldErrors.rfc ? 'border-red-500' : 'border-[var(--color-border)]'} bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]`}
              />
              {editFieldErrors.rfc && (
                <p className="text-red-500 text-xs mt-1">{editFieldErrors.rfc}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Plan Activo</label>
              <select
                value={editFormData.plan_id || ''}
                onChange={(e) => setEditFormData({ ...editFormData, plan_id: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                required
              >
                <option value="" disabled>Selecciona un plan</option>
                {planOptions.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} (${plan.price_monthly} MXN)
                  </option>
                ))}
              </select>
            </div>
            {/* Configuración de Fechas */}
            <div className="col-span-2 border-t border-[var(--color-border)] pt-4 mt-2">
              <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)] mb-1 font-[var(--font-display)]">Configuración de Fechas e Historial</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Ajusta las fechas de nacimiento, anualidad (inscripción) y mensualidad (plan activo).</p>
            </div>

            <div className="sm:col-span-2 mt-2">
              <HybridDateInput
                value={editFormData.birth_date || ''}
                error={editFieldErrors.birth_date}
                onChange={(dateStr, calculatedAge) => {
                  setEditFormData({
                    ...editFormData,
                    birth_date: dateStr,
                    age: calculatedAge !== null ? calculatedAge.toString() : ''
                  });
                  if (editFieldErrors.birth_date) {
                    setEditFieldErrors({ ...editFieldErrors, birth_date: null });
                  }
                }}
              />
            </div>

            {/* Configuración de Fechas */}
            <div className="col-span-2 border-t border-[var(--color-border)] pt-4 mt-2">
              <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)] mb-1 font-[var(--font-display)]">Configuración de Fechas e Historial</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Ajusta las fechas de nacimiento, anualidad (inscripción) y mensualidad (plan activo).</p>
            </div>

            <div className="sm:col-span-2 mt-2">
              <HybridDateInput
                value={editFormData.birth_date || ''}
                error={editFieldErrors.birth_date}
                onChange={(dateStr, calculatedAge) => {
                  setEditFormData({
                    ...editFormData,
                    birth_date: dateStr,
                    age: calculatedAge !== null ? calculatedAge.toString() : ''
                  });
                  if (editFieldErrors.birth_date) {
                    setEditFieldErrors({ ...editFieldErrors, birth_date: null });
                  }
                }}
              />
            </div>

            {/* CAMBIO AQUÍ: Contenedor Inscripción agrupado con proporción 8 a 4 */}
            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-12">
              <div className="sm:col-span-8">
                <SimpleDateInput
                  label="Inicio Inscripción (Anualidad)"
                  value={editFormData.enrollment_date || ''}
                  onChange={handleEnrollmentDateChange}
                />
              </div>
              <div className="sm:col-span-4 space-y-2">
                <label className="block text-sm font-semibold text-[var(--color-text-muted)] truncate">Fin Inscripción</label>
                <input
                  type="text"
                  value={editFormData.enrollment_expires_at ? new Date(editFormData.enrollment_expires_at + 'T00:00:00').toLocaleDateString('es-MX') : 'N/A'}
                  readOnly
                  className="w-full text-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[var(--color-text-muted)] cursor-not-allowed focus:outline-none"
                />
              </div>
            </div>

            {/* CAMBIO AQUÍ: Contenedor Plan agrupado con proporción 8 a 4 */}
            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-12">
              <div className="sm:col-span-8">
                <SimpleDateInput
                  label="Inicio Plan (Mensualidad)"
                  value={editFormData.subscription_start_date || ''}
                  onChange={handleSubscriptionStartDateChange}
                />
              </div>
              <div className="sm:col-span-4 space-y-2">
                <label className="block text-sm font-semibold text-[var(--color-text-muted)] truncate">Fin Plan</label>
                <input
                  type="text"
                  value={editFormData.subscription_end_date ? new Date(editFormData.subscription_end_date + 'T00:00:00').toLocaleDateString('es-MX') : 'N/A'}
                  readOnly
                  className="w-full text-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[var(--color-text-muted)] cursor-not-allowed focus:outline-none"
                />
              </div>
            </div>
            <div className="col-span-2 border-t border-[var(--color-border)] pt-4 mt-2">
              <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)] mb-1 font-[var(--font-display)]">Encuesta de Coach y Notas</h3>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Condición física</label>
              <input
                type="text"
                value={editFormData.coach_fitness_level || ''}
                onChange={(e) => setEditFormData({ ...editFormData, coach_fitness_level: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Notas de salud</label>
              <textarea
                rows={2}
                value={editFormData.coach_health_notes || ''}
                onChange={(e) => setEditFormData({ ...editFormData, coach_health_notes: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Objetivo principal</label>
              <textarea
                rows={2}
                value={editFormData.coach_goal || ''}
                onChange={(e) => setEditFormData({ ...editFormData, coach_goal: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Notas adicionales</label>
              <textarea
                rows={2}
                value={editFormData.notes || ''}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <GymButton type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancelar</GymButton>
            <GymButton type="submit" variant="primary" loading={updateClientMutation.isLoading}>Guardar Cambios</GymButton>
          </div>
        </form>
      </GymModal>
    </div>
  );
}