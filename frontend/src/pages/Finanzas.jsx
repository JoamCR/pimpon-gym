import React, { useState, useRef } from 'react';
import { IconCash, IconCalendarEvent, IconX, IconPencil, IconTrash, IconCheck, IconLoader2, IconPlus, IconEye, IconArrowDown, IconArrowUp, IconScale, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { format, startOfMonth } from 'date-fns';
import { GymCard } from '../components/ui/GymCard';
import { GymModal } from '../components/ui/GymModal';
import { GymButton } from '../components/ui/GymButton';
import { PageHeader } from '../components/ui/PageHeader';
import { usePaymentsHistory, useUpdatePayment, useDeletePayment, useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '../hooks/useFinances';
import { useAuthStore } from '../stores/authStore';

export default function Finanzas() {
  const user = useAuthStore((state) => state.user);
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';

  const incomeRef = useRef(null);
  const expensesRef = useRef(null);

  const scrollToIncome = () => {
    incomeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToExpenses = () => {
    expensesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const [tab, setTab] = useState('all'); // all, gym, consultorio
  const today = new Date();
  const [fromDate, setFromDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(today, 'yyyy-MM-dd'));

  // Estados para desplegar la lista completa o 10 items
  const [showAllIncome, setShowAllIncome] = useState(false);
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  // Estado para la edición de importe
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMethod, setEditMethod] = useState('cash');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState('');

  // Estado para la eliminación / anulación de cobros duplicados
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  // ─── Estado para EGRESOS ───────────────────────────────────────────────
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [viewExpense, setViewExpense] = useState(null);
  const [editExpense, setEditExpense] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  // Formulario de crear egreso
  const [newConcept, setNewConcept] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newMethod, setNewMethod] = useState('cash');
  const [newNotes, setNewNotes] = useState('');
  const [createError, setCreateError] = useState('');

  // Formulario de editar egreso
  const [editExpConcept, setEditExpConcept] = useState('');
  const [editExpAmount, setEditExpAmount] = useState('');
  const [editExpMethod, setEditExpMethod] = useState('cash');
  const [editExpNotes, setEditExpNotes] = useState('');
  const [editExpError, setEditExpError] = useState('');

  const [expDeleteError, setExpDeleteError] = useState('');

  const { data: response, isLoading, isError } = usePaymentsHistory(tab, fromDate, toDate);
  const updatePaymentMutation = useUpdatePayment();
  const deletePaymentMutation = useDeletePayment();
  const history = response?.data || [];

  // Hooks de egresos
  const { data: expensesResponse, isLoading: expLoading, isError: expError } = useExpenses(fromDate, toDate);
  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const deleteExpenseMutation = useDeleteExpense();
  const expenses = expensesResponse?.data || [];

  const displayedHistory = showAllIncome ? history : history.slice(0, 10);
  const displayedExpenses = showAllExpenses ? expenses : expenses.slice(0, 10);

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
  };

  const handleOpenEditModal = (item) => {
    setSelectedPayment(item);
    setEditAmount(String(item.amount));
    setEditMethod(item.payment_method || 'cash');
    setEditNotes(item.notes || '');
    setEditError('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');

    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setEditError('Por favor ingresa un importe válido mayor a 0.');
      return;
    }

    try {
      await updatePaymentMutation.mutateAsync({
        id: selectedPayment.id,
        amount: numAmount,
        payment_method: editMethod,
        notes: editNotes,
      });
      setSelectedPayment(null);
    } catch (err) {
      setEditError(err.message || 'Error al actualizar el importe del pago.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!paymentToDelete) return;
    setDeleteError('');

    try {
      await deletePaymentMutation.mutateAsync(paymentToDelete.id);
      setPaymentToDelete(null);
    } catch (err) {
      setDeleteError(err.message || 'Error al anular el cobro duplicado.');
    }
  };

  const getEntityBadge = (type) => {
    if (type === 'gym') return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">GYM</span>;
    if (type === 'consultorio') return <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-medium">Nutrición</span>;
    return null;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const getTypeLabel = (type) => {
    const labels = {
      enrollment: 'Inscripción',
      monthly: 'Mensualidad',
      visit: 'Visita',
      nutrition_consult: 'Consulta Nutrición',
      nutrition_followup: 'Seguimiento Nutrición'
    };
    return labels[type] || type;
  };

  const totalAmount = history.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

  // ─── Handlers de Egresos ───────────────────────────────────────────────

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    setCreateError('');

    const numAmount = parseFloat(newAmount);
    if (!newConcept.trim()) {
      setCreateError('El concepto es requerido.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setCreateError('Por favor ingresa un monto válido mayor a 0.');
      return;
    }

    try {
      await createExpenseMutation.mutateAsync({
        concept: newConcept.trim(),
        amount: numAmount,
        payment_method: newMethod,
        notes: newNotes.trim() || null,
      });
      // Resetear formulario
      setNewConcept('');
      setNewAmount('');
      setNewMethod('cash');
      setNewNotes('');
      setShowAddExpense(false);
    } catch (err) {
      setCreateError(err.message || 'Error al registrar el egreso.');
    }
  };

  const handleOpenEditExpense = (item) => {
    setEditExpense(item);
    setEditExpConcept(item.concept);
    setEditExpAmount(String(item.amount));
    setEditExpMethod(item.payment_method || 'cash');
    setEditExpNotes(item.notes || '');
    setEditExpError('');
  };

  const handleSaveEditExpense = async (e) => {
    e.preventDefault();
    setEditExpError('');

    const numAmount = parseFloat(editExpAmount);
    if (!editExpConcept.trim()) {
      setEditExpError('El concepto es requerido.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setEditExpError('Por favor ingresa un monto válido mayor a 0.');
      return;
    }

    try {
      await updateExpenseMutation.mutateAsync({
        id: editExpense.id,
        concept: editExpConcept.trim(),
        amount: numAmount,
        payment_method: editExpMethod,
        notes: editExpNotes.trim() || null,
      });
      setEditExpense(null);
    } catch (err) {
      setEditExpError(err.message || 'Error al actualizar el egreso.');
    }
  };

  const handleConfirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setExpDeleteError('');

    try {
      await deleteExpenseMutation.mutateAsync(expenseToDelete.id);
      setExpenseToDelete(null);
    } catch (err) {
      setExpDeleteError(err.message || 'Error al eliminar el egreso.');
    }
  };

  return (
    <div className="min-h-screen p-6 bg-[var(--color-surface)] space-y-6">
      <PageHeader
        icon={<IconCash size={18} />}
        tag="Finanzas"
        title="Flujo de Efectivo"
        subtitle="Consulta y edita los ingresos por área, cliente y periodo."
      />

      {/* ══════════════════════════════════════════════════════════════════════
          FINANZAS DEL MES — Balance general
          ══════════════════════════════════════════════════════════════════════ */}
      {isOwnerOrAdmin && (
        <GymCard title="Finanzas del Mes" variant="default">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Ingresos */}
            <div
              onClick={scrollToIncome}
              className="flex items-center justify-between bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] p-4 rounded-[var(--radius-lg)] cursor-pointer hover:bg-[rgba(34,197,94,0.14)] hover:scale-[1.01] transition-all shadow-xs group"
              title="Clic para ir a la lista de Ingresos"
            >
              <div>
                <p className="text-[var(--color-success)] text-xs font-semibold mb-1 uppercase tracking-wide flex items-center gap-1">
                  Ingresos <span className="text-[10px] opacity-75 group-hover:translate-y-0.5 transition-transform">↓</span>
                </p>
                <h3 className="text-2xl font-bold text-[var(--color-success)]">{formatCurrency(totalAmount)}</h3>
              </div>
              <IconArrowUp size={32} className="text-[var(--color-success)] opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>
            {/* Egresos */}
            <div
              onClick={scrollToExpenses}
              className="flex items-center justify-between bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)] p-4 rounded-[var(--radius-lg)] cursor-pointer hover:bg-[rgba(220,38,38,0.14)] hover:scale-[1.01] transition-all shadow-xs group"
              title="Clic para ir a la lista de Egresos"
            >
              <div>
                <p className="text-red-500 text-xs font-semibold mb-1 uppercase tracking-wide flex items-center gap-1">
                  Egresos <span className="text-[10px] opacity-75 group-hover:translate-y-0.5 transition-transform">↓</span>
                </p>
                <h3 className="text-2xl font-bold text-red-500">{formatCurrency(totalExpenses)}</h3>
              </div>
              <IconArrowDown size={32} className="text-red-500 opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>
            {/* Balance */}
            <div className={`flex items-center justify-between p-4 rounded-[var(--radius-lg)] border ${(totalAmount - totalExpenses) >= 0
                ? 'bg-[rgba(34,197,94,0.05)] border-[rgba(34,197,94,0.15)]'
                : 'bg-[rgba(220,38,38,0.05)] border-[rgba(220,38,38,0.15)]'
              }`}>
              <div>
                <p className={`text-xs font-semibold mb-1 uppercase tracking-wide ${(totalAmount - totalExpenses) >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'
                  }`}>Balance</p>
                <h3 className={`text-2xl font-bold ${(totalAmount - totalExpenses) >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'
                  }`}>{formatCurrency(totalAmount - totalExpenses)}</h3>
              </div>
              <IconScale size={32} className={`opacity-70 ${(totalAmount - totalExpenses) >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'}`} />
            </div>
          </div>
        </GymCard>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN DE INGRESOS
          ══════════════════════════════════════════════════════════════════════ */}
      <div ref={incomeRef} className="scroll-mt-6">
        <GymCard
          title="Ingresos"
          subtitle={history.length > 10 ? (showAllIncome ? `Mostrando todos (${history.length} registros)` : `Mostrando 10 de ${history.length} registros`) : undefined}
          variant="default"
          onHeaderClick={history.length > 10 ? () => setShowAllIncome((prev) => !prev) : undefined}
          headerAction={
            history.length > 10 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllIncome((prev) => !prev);
                }}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                title={showAllIncome ? "Mostrar 10 registros" : "Mostrar todos los registros"}
              >
                {showAllIncome ? (
                  <>
                    <span>Ver menos</span>
                    <IconChevronUp size={14} />
                  </>
                ) : (
                  <>
                    <span>Ver más ({history.length})</span>
                    <IconChevronDown size={14} />
                  </>
                )}
              </button>
            ) : null
          }
        >
          <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between">
              <div className="flex flex-wrap items-center gap-2 bg-[var(--color-card-alt)] rounded-[var(--radius-lg)] p-1 shrink-0 border border-[var(--color-border)] shadow-sm">
                <button
                  onClick={() => setTab('all')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === 'all' ? 'bg-[var(--color-secondary)] text-black' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                >
                  General
                </button>
                <button
                  onClick={() => setTab('gym')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === 'gym' ? 'bg-[var(--color-secondary)] text-black' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                >
                  Gimnasio
                </button>
                <button
                  onClick={() => setTab('consultorio')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === 'consultorio' ? 'bg-[var(--color-secondary)] text-black' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                >
                  Consultorio
                </button>
              </div>
            </div>

            {isOwnerOrAdmin && (
              <div className="flex justify-between items-center bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] p-4 rounded-[var(--radius-lg)]">
                <div>
                  <p className="text-[var(--color-success)] text-sm font-semibold mb-1">Total Ingresos ({tab === 'all' ? 'General' : tab === 'gym' ? 'Gimnasio' : 'Consultorio'})</p>
                  <h3 className="text-3xl font-bold text-[var(--color-success)]">{formatCurrency(totalAmount)}</h3>
                </div>
                <IconArrowUp size={40} className="text-[var(--color-success)] opacity-80" />
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-10 text-[var(--color-text-muted)]">Cargando datos...</div>
            ) : isError ? (
              <div className="text-center py-10 text-[var(--color-danger)]">Error al cargar el historial</div>
            ) : history.length === 0 ? (
              <div className="text-center py-10 text-[var(--color-text-muted)]">No hay registros para este filtro</div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-alt)]">
                  <table className="min-w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs uppercase tracking-[0.15em] select-none">
                        <th className="px-4 py-4">Fecha</th>
                        <th className="px-4 py-4">Cliente / Paciente</th>
                        <th className="px-4 py-4">Concepto</th>
                        <th className="px-4 py-4">Plan</th>
                        <th className="px-4 py-4">Método</th>
                        <th className="px-4 py-4">Entidad</th>
                        <th className="px-4 py-4 text-right">Monto</th>
                        <th className="px-4 py-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedHistory.map((item, index) => (
                        <tr key={item.id} className={index % 2 === 0 ? 'bg-[var(--color-card-alt)]' : 'bg-[var(--color-card)]'}>
                          <td className="px-4 py-4 text-sm text-[var(--color-text)]">
                            {format(new Date(item.paid_at), 'dd/MM/yyyy HH:mm')}
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-[var(--color-text)]">
                            {item.entity_type === 'gym' 
                              ? `${item.client_first_name || ''} ${item.client_last_name || ''}`.trim() || 'Desconocido'
                              : `${item.patient_first_name || ''} ${item.patient_last_name || ''}`.trim() || 'Desconocido'
                            }
                          </td>
                          <td className="px-4 py-4 text-sm text-[var(--color-text-muted)]">
                            {getTypeLabel(item.payment_type)}
                          </td>
                          <td className="px-4 py-4 text-sm font-medium text-[var(--color-text)]">
                            {item.plan_name || '-'}
                          </td>
                          <td className="px-4 py-4 text-sm capitalize text-[var(--color-text-muted)]">
                            {item.payment_method === 'cash' ? 'Efectivo' : item.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta'}
                          </td>
                          <td className="px-4 py-4">
                            {getEntityBadge(item.entity_type)}
                          </td>
                          <td className="px-4 py-4 text-right font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                title="Editar importe"
                              >
                                <IconPencil size={18} />
                              </button>
                              <button
                                onClick={() => {
                                  setPaymentToDelete(item);
                                  setDeleteError('');
                                }}
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                title="Anular / Eliminar cobro duplicado"
                              >
                                <IconTrash size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {history.length > 10 && (
                  <div className="flex justify-center pt-2">
                    <GymButton
                      variant="secondary"
                      size="xs"
                      icon={showAllIncome ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                      onClick={() => setShowAllIncome((prev) => !prev)}
                    >
                      {showAllIncome ? 'Ver menos' : 'Ver más'}
                    </GymButton>
                  </div>
                )}
              </>
            )}
          </div>
        </GymCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN DE EGRESOS
          ══════════════════════════════════════════════════════════════════════ */}
      <div ref={expensesRef} className="scroll-mt-6">
        <GymCard
          title="Egresos"
          subtitle={expenses.length > 10 ? (showAllExpenses ? `Mostrando todos (${expenses.length} registros)` : `Mostrando 10 de ${expenses.length} registros`) : undefined}
          variant="default"
          onHeaderClick={expenses.length > 10 ? () => setShowAllExpenses((prev) => !prev) : undefined}
          headerAction={
            expenses.length > 10 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllExpenses((prev) => !prev);
                }}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                title={showAllExpenses ? "Mostrar 10 registros" : "Mostrar todos los registros"}
              >
                {showAllExpenses ? (
                  <>
                    <span>Ver menos</span>
                    <IconChevronUp size={14} />
                  </>
                ) : (
                  <>
                    <span>Ver más ({expenses.length})</span>
                    <IconChevronDown size={14} />
                  </>
                )}
              </button>
            ) : null
          }
        >
        <div className="space-y-6">
          {/* Header con botón Añadir Egreso */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <p className="text-sm text-[var(--color-text-muted)]">
              Control de salidas de dinero del negocio.
            </p>
            <GymButton
              variant="primary"
              size="sm"
              icon={<IconPlus size={16} />}
              onClick={() => {
                setShowAddExpense(true);
                setCreateError('');
                setNewConcept('');
                setNewAmount('');
                setNewMethod('cash');
                setNewNotes('');
              }}
            >
              Añadir Egreso
            </GymButton>
          </div>

          {/* Banner de total egresos */}
          {isOwnerOrAdmin && (
            <div className="flex justify-between items-center bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)] p-4 rounded-[var(--radius-lg)]">
              <div>
                <p className="text-red-500 text-sm font-semibold mb-1">Total Egresos (general)</p>
                <h3 className="text-3xl font-bold text-red-500">{formatCurrency(totalExpenses)}</h3>
              </div>
              <IconArrowDown size={40} className="text-red-500 opacity-80" />
            </div>
          )}

          {/* Tabla de egresos */}
          {expLoading ? (
            <div className="text-center py-10 text-[var(--color-text-muted)]">Cargando egresos...</div>
          ) : expError ? (
            <div className="text-center py-10 text-[var(--color-danger)]">Error al cargar los egresos</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-10 text-[var(--color-text-muted)]">No hay egresos registrados para este periodo</div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-alt)]">
                <table className="min-w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs uppercase tracking-[0.15em] select-none">
                      <th className="px-4 py-4">Fecha</th>
                      <th className="px-4 py-4">Concepto</th>
                      <th className="px-4 py-4">Método</th>
                      <th className="px-4 py-4 text-right">Monto</th>
                      <th className="px-4 py-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedExpenses.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-[var(--color-card-alt)]' : 'bg-[var(--color-card)]'}>
                        <td className="px-4 py-4 text-sm text-[var(--color-text)]">
                          {format(new Date(item.expense_date), 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-[var(--color-text)]">
                          {item.concept}
                        </td>
                        <td className="px-4 py-4 text-sm capitalize text-[var(--color-text-muted)]">
                          {item.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-red-500">
                          -{formatCurrency(item.amount)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setViewExpense(item)}
                              className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/10 transition-colors"
                              title="Ver detalle"
                            >
                              <IconEye size={18} />
                            </button>
                            <button
                              onClick={() => handleOpenEditExpense(item)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                              title="Editar egreso"
                            >
                              <IconPencil size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setExpenseToDelete(item);
                                setExpDeleteError('');
                              }}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              title="Eliminar egreso"
                            >
                              <IconTrash size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {expenses.length > 10 && (
                <div className="flex justify-center pt-2">
                  <GymButton
                    variant="secondary"
                    size="xs"
                    icon={showAllExpenses ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                    onClick={() => setShowAllExpenses((prev) => !prev)}
                  >
                    {showAllExpenses ? 'Ver menos' : 'Ver más'}
                  </GymButton>
                </div>
              )}
            </>
          )}
        </div>
      </GymCard>
    </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODALES DE INGRESOS (existentes)
          ══════════════════════════════════════════════════════════════════════ */}

      {/* Modal para editar ingreso */}
      <GymModal
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title="Editar Ingreso"
        size="md"
      >
        {selectedPayment && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && (
              <div className="p-3 text-sm rounded-lg bg-red-100 text-red-700 border border-red-200">
                {editError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">
                Cliente / Paciente
              </label>
              <p className="text-sm font-semibold text-[var(--color-text)]">
                {selectedPayment.entity_type === 'gym'
                  ? `${selectedPayment.client_first_name || ''} ${selectedPayment.client_last_name || ''}`.trim() || 'Desconocido'
                  : `${selectedPayment.patient_first_name || ''} ${selectedPayment.patient_last_name || ''}`.trim() || 'Desconocido'
                }
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">
                Concepto
              </label>
              <p className="text-sm text-[var(--color-text-muted)]">
                {getTypeLabel(selectedPayment.payment_type)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">
                Plan / Mensualidad
              </label>
              <p className="text-sm font-semibold text-[var(--color-secondary-dark)] dark:text-[var(--color-secondary)]">
                {selectedPayment.plan_name || 'Sin plan asignado'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Importe (MXN) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full px-3 py-2 text-base font-semibold rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-secondary)]"
                placeholder="Ej. 500.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Método de Pago
              </label>
              <select
                value={editMethod}
                onChange={(e) => setEditMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-secondary)]"
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Notas / Observaciones
              </label>
              <textarea
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-secondary)]"
                placeholder="Motivo de la corrección..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/5 transition"
                disabled={updatePaymentMutation.isPending}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updatePaymentMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--color-secondary)] text-black hover:opacity-90 transition disabled:opacity-50"
              >
                {updatePaymentMutation.isPending ? (
                  <>
                    <IconLoader2 className="animate-spin" size={18} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <IconCheck size={18} />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </GymModal>

      {/* Modal de confirmación para anular pago duplicado */}
      <GymModal
        isOpen={!!paymentToDelete}
        onClose={() => setPaymentToDelete(null)}
        title="Anular Cobro Duplicado"
        size="md"
      >
        {paymentToDelete && (
          <div className="space-y-4">
            {deleteError && (
              <div className="p-3 text-sm rounded-lg bg-red-100 text-red-700 border border-red-200">
                {deleteError}
              </div>
            )}
            <p className="text-sm text-[var(--color-text)]">
              ¿Estás seguro de que deseas anular este registro de ingreso por cobro duplicado?
            </p>
            <div className="bg-[var(--color-card)] p-3 rounded-lg border border-[var(--color-border)] text-sm space-y-1">
              <p className="font-semibold text-[var(--color-text)]">
                {paymentToDelete.entity_type === 'gym'
                  ? `${paymentToDelete.client_first_name || ''} ${paymentToDelete.client_last_name || ''}`.trim() || 'Desconocido'
                  : `${paymentToDelete.patient_first_name || ''} ${paymentToDelete.patient_last_name || ''}`.trim() || 'Desconocido'
                }
              </p>
              <p className="text-[var(--color-text-muted)]">
                Concepto: <span className="font-medium text-[var(--color-text)]">{getTypeLabel(paymentToDelete.payment_type)}</span>
              </p>
              <p className="text-green-600 dark:text-green-400 font-bold">
                Monto: {formatCurrency(paymentToDelete.amount)}
              </p>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Esta acción desmarcará el ingreso del historial, lo excluirá del reporte general y ajustará el flujo total acumulado.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setPaymentToDelete(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/5 transition"
                disabled={deletePaymentMutation.isPending}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletePaymentMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
              >
                {deletePaymentMutation.isPending ? (
                  <>
                    <IconLoader2 className="animate-spin" size={18} />
                    Anulando...
                  </>
                ) : (
                  <>
                    <IconTrash size={18} />
                    Anular Cobro
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </GymModal>

      {/* ══════════════════════════════════════════════════════════════════════
          MODALES DE EGRESOS
          ══════════════════════════════════════════════════════════════════════ */}

      {/* Modal para añadir egreso */}
      <GymModal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        title="Añadir Egreso"
        size="md"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          {createError && (
            <div className="p-3 text-sm rounded-lg bg-red-100 text-red-700 border border-red-200">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Concepto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newConcept}
              onChange={(e) => setNewConcept(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-secondary)]"
              placeholder="Ej. Pago de luz, Renta del local, Material..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Monto (MXN) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="w-full px-3 py-2 text-base font-semibold rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-secondary)]"
              placeholder="Ej. 1500.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Método de Pago <span className="text-red-500">*</span>
            </label>
            <select
              value={newMethod}
              onChange={(e) => setNewMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-secondary)]"
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Notas (opcional)
            </label>
            <textarea
              rows={2}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-secondary)]"
              placeholder="Observaciones adicionales..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setShowAddExpense(false)}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/5 transition"
              disabled={createExpenseMutation.isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createExpenseMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--color-secondary)] text-black hover:opacity-90 transition disabled:opacity-50"
            >
              {createExpenseMutation.isPending ? (
                <>
                  <IconLoader2 className="animate-spin" size={18} />
                  Guardando...
                </>
              ) : (
                <>
                  <IconCheck size={18} />
                  Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </GymModal>

      {/* Modal para ver detalle de egreso */}
      <GymModal
        isOpen={!!viewExpense}
        onClose={() => setViewExpense(null)}
        title="Detalle del Egreso"
        size="md"
      >
        {viewExpense && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">
                  Concepto
                </label>
                <p className="text-sm font-semibold text-[var(--color-text)]">{viewExpense.concept}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">
                  Monto
                </label>
                <p className="text-lg font-bold text-red-500">-{formatCurrency(viewExpense.amount)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">
                  Método de Pago
                </label>
                <p className="text-sm text-[var(--color-text)]">
                  {viewExpense.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">
                  Fecha
                </label>
                <p className="text-sm text-[var(--color-text)]">
                  {format(new Date(viewExpense.expense_date), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            </div>
            {viewExpense.notes && (
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">
                  Notas
                </label>
                <p className="text-sm text-[var(--color-text)] bg-[var(--color-card)] p-3 rounded-lg border border-[var(--color-border)]">
                  {viewExpense.notes}
                </p>
              </div>
            )}
            {viewExpense.created_by_name && (
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">
                  Registrado por
                </label>
                <p className="text-sm text-[var(--color-text)]">{viewExpense.created_by_name}</p>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setViewExpense(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/5 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </GymModal>

      {/* Modal para editar egreso */}
      <GymModal
        isOpen={!!editExpense}
        onClose={() => setEditExpense(null)}
        title="Editar Egreso"
        size="md"
      >
        {editExpense && (
          <form onSubmit={handleSaveEditExpense} className="space-y-4">
            {editExpError && (
              <div className="p-3 text-sm rounded-lg bg-red-100 text-red-700 border border-red-200">
                {editExpError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Concepto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editExpConcept}
                onChange={(e) => setEditExpConcept(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-secondary)]"
                placeholder="Ej. Pago de luz, Renta del local..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Monto (MXN) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={editExpAmount}
                onChange={(e) => setEditExpAmount(e.target.value)}
                className="w-full px-3 py-2 text-base font-semibold rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-secondary)]"
                placeholder="Ej. 1500.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Método de Pago
              </label>
              <select
                value={editExpMethod}
                onChange={(e) => setEditExpMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-secondary)]"
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Notas (opcional)
              </label>
              <textarea
                rows={2}
                value={editExpNotes}
                onChange={(e) => setEditExpNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-secondary)]"
                placeholder="Observaciones..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setEditExpense(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/5 transition"
                disabled={updateExpenseMutation.isPending}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updateExpenseMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--color-secondary)] text-black hover:opacity-90 transition disabled:opacity-50"
              >
                {updateExpenseMutation.isPending ? (
                  <>
                    <IconLoader2 className="animate-spin" size={18} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <IconCheck size={18} />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </GymModal>

      {/* Modal de confirmación para eliminar egreso */}
      <GymModal
        isOpen={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        title="Eliminar Egreso"
        size="md"
      >
        {expenseToDelete && (
          <div className="space-y-4">
            {expDeleteError && (
              <div className="p-3 text-sm rounded-lg bg-red-100 text-red-700 border border-red-200">
                {expDeleteError}
              </div>
            )}
            <p className="text-sm text-[var(--color-text)]">
              ¿Estás seguro de que deseas eliminar este egreso? Esta acción no se puede deshacer.
            </p>
            <div className="bg-[var(--color-card)] p-3 rounded-lg border border-[var(--color-border)] text-sm space-y-1">
              <p className="font-semibold text-[var(--color-text)]">
                {expenseToDelete.concept}
              </p>
              <p className="text-[var(--color-text-muted)]">
                Método: <span className="font-medium text-[var(--color-text)]">
                  {expenseToDelete.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}
                </span>
              </p>
              <p className="text-red-500 font-bold">
                Monto: -{formatCurrency(expenseToDelete.amount)}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/5 transition"
                disabled={deleteExpenseMutation.isPending}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteExpense}
                disabled={deleteExpenseMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleteExpenseMutation.isPending ? (
                  <>
                    <IconLoader2 className="animate-spin" size={18} />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <IconTrash size={18} />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </GymModal>
    </div>
  );
}
