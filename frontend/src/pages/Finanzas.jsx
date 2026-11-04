import React, { useState, useRef, useMemo } from 'react';
import { IconCash, IconCalendarEvent, IconX, IconPencil, IconTrash, IconCheck, IconLoader2, IconPlus, IconEye, IconArrowDown, IconArrowUp, IconScale, IconChevronDown, IconChevronUp, IconDownload } from '@tabler/icons-react';
import { format, startOfMonth, eachDayOfInterval, subDays } from 'date-fns';
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
  const dailyIncomeRef = useRef(null);
  const expensesRef = useRef(null);
  const dailyExpensesRef = useRef(null);

  const scrollToIncome = () => {
    incomeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToDailyIncome = () => {
    dailyIncomeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToExpenses = () => {
    expensesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToDailyExpenses = () => {
    dailyExpensesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const [tab, setTab] = useState('all'); // all, gym, consultorio
  const [dailyTab, setDailyTab] = useState('all'); // all, gym, consultorio (para Ingresos del Día)
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const [fromDate, setFromDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(todayStr);

  // Estados para desplegar la lista completa o 10 items
  const [showAllIncome, setShowAllIncome] = useState(false);
  const [showAllDailyIncome, setShowAllDailyIncome] = useState(false);
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [showAllDailyExpenses, setShowAllDailyExpenses] = useState(false);
  const [showAllPastCutoffs, setShowAllPastCutoffs] = useState(false);

  // Filtros y modal de detalle para el Histórico de Cortes de Días Pasados
  const [cutoffFromDate, setCutoffFromDate] = useState('');
  const [cutoffToDate, setCutoffToDate] = useState('');
  const [selectedDayCutoff, setSelectedDayCutoff] = useState(null);

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
  const { data: dailyResponse, isLoading: dailyLoading, isError: dailyError } = usePaymentsHistory(dailyTab, todayStr, todayStr);
  const { data: allPaymentsResponse, isLoading: allPaymentsLoading } = usePaymentsHistory('all', '', '');
  const updatePaymentMutation = useUpdatePayment();
  const deletePaymentMutation = useDeletePayment();
  const history = response?.data || [];
  const dailyHistory = dailyResponse?.data || [];
  const allHistoricalPayments = allPaymentsResponse?.data || [];

  // Hooks de egresos
  const { data: expensesResponse, isLoading: expLoading, isError: expError } = useExpenses(fromDate, toDate);
  const { data: dailyExpensesResponse, isLoading: dailyExpLoading, isError: dailyExpError } = useExpenses(todayStr, todayStr);
  const { data: allExpensesResponse, isLoading: allExpensesLoading } = useExpenses('', '');
  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const deleteExpenseMutation = useDeleteExpense();
  const expenses = expensesResponse?.data || [];
  const dailyExpenses = dailyExpensesResponse?.data || [];
  const allHistoricalExpenses = allExpensesResponse?.data || [];

  // Construcción del Histórico de Cortes Diarios (Días Pasados)
  const pastDailyCutoffs = useMemo(() => {
    const map = new Map();

    const ensureDay = (dateKey) => {
      if (!map.has(dateKey)) {
        const [y, m, d] = dateKey.split('-');
        map.set(dateKey, {
          date: dateKey,
          formattedDate: `${d}/${m}/${y}`,
          gymIncome: 0,
          consultorioIncome: 0,
          cashIncome: 0,
          transferOrCardIncome: 0,
          totalIncome: 0,
          incomeCount: 0,
          totalExpenses: 0,
          expenseCount: 0,
          balance: 0,
          payments: [],
          expenses: [],
        });
      }
      return map.get(dateKey);
    };

    // Pre-poblar los últimos 30 días pasados (hasta ayer) para contar con el historial continuo
    const startRange = subDays(today, 30);
    const yesterday = subDays(today, 1);
    if (yesterday >= startRange) {
      const pastDaysRange = eachDayOfInterval({ start: startRange, end: yesterday });
      pastDaysRange.forEach((dayDate) => {
        ensureDay(format(dayDate, 'yyyy-MM-dd'));
      });
    }

    // Agregar todos los ingresos históricos de días pasados (< todayStr)
    allHistoricalPayments.forEach((item) => {
      if (!item.paid_at) return;
      const dateKey = format(new Date(item.paid_at), 'yyyy-MM-dd');
      if (dateKey >= todayStr) return; // Solo días pasados

      const entry = ensureDay(dateKey);
      const amt = Number(item.amount) || 0;
      const isConsultorio =
        item.entity_type === 'consultorio' ||
        item.payment_type === 'nutrition_consult' ||
        item.payment_type === 'nutrition_followup';

      if (isConsultorio) {
        entry.consultorioIncome += amt;
      } else {
        entry.gymIncome += amt;
      }

      if (item.payment_method === 'cash') {
        entry.cashIncome += amt;
      } else {
        entry.transferOrCardIncome += amt;
      }

      entry.totalIncome += amt;
      entry.incomeCount += 1;
      entry.balance = entry.totalIncome - entry.totalExpenses;
      entry.payments.push(item);
    });

    // Agregar todos los egresos históricos de días pasados (< todayStr)
    allHistoricalExpenses.forEach((item) => {
      if (!item.expense_date) return;
      const dateKey = format(new Date(item.expense_date), 'yyyy-MM-dd');
      if (dateKey >= todayStr) return; // Solo días pasados

      const entry = ensureDay(dateKey);
      const amt = Number(item.amount) || 0;
      entry.totalExpenses += amt;
      entry.expenseCount += 1;
      entry.balance = entry.totalIncome - entry.totalExpenses;
      entry.expenses.push(item);
    });

    let list = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));

    if (cutoffFromDate) {
      list = list.filter((d) => d.date >= cutoffFromDate);
    }
    if (cutoffToDate) {
      list = list.filter((d) => d.date <= cutoffToDate);
    }

    return list;
  }, [allHistoricalPayments, allHistoricalExpenses, todayStr, cutoffFromDate, cutoffToDate]);

  const displayedPastCutoffs = showAllPastCutoffs ? pastDailyCutoffs : pastDailyCutoffs.slice(0, 10);
  const pastCutoffsTotals = useMemo(() => {
    return pastDailyCutoffs.reduce(
      (acc, d) => {
        acc.gymIncome += d.gymIncome;
        acc.consultorioIncome += d.consultorioIncome;
        acc.totalIncome += d.totalIncome;
        acc.totalExpenses += d.totalExpenses;
        acc.balance += d.balance;
        return acc;
      },
      { gymIncome: 0, consultorioIncome: 0, totalIncome: 0, totalExpenses: 0, balance: 0 }
    );
  }, [pastDailyCutoffs]);

  const handleDownloadHistoricalCutoffs = () => {
    if (pastDailyCutoffs.length === 0) return;

    const escapeCsv = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'Fecha',
      'Ingresos Gimnasio (MXN)',
      'Ingresos Consultorio (MXN)',
      'Ingresos Efectivo (MXN)',
      'Ingresos Transferencia/Tarjeta (MXN)',
      'Cant. Ingresos',
      'Total Ingresos (MXN)',
      'Cant. Egresos',
      'Total Egresos (MXN)',
      'Balance / Corte del Dia (MXN)'
    ];

    const rows = pastDailyCutoffs.map((d) => [
      d.formattedDate,
      d.gymIncome.toFixed(2),
      d.consultorioIncome.toFixed(2),
      d.cashIncome.toFixed(2),
      d.transferOrCardIncome.toFixed(2),
      d.incomeCount,
      d.totalIncome.toFixed(2),
      d.expenseCount,
      d.totalExpenses.toFixed(2),
      d.balance.toFixed(2)
    ]);

    // Fila final de totales
    rows.push([
      'TOTAL ACUMULADO',
      pastCutoffsTotals.gymIncome.toFixed(2),
      pastCutoffsTotals.consultorioIncome.toFixed(2),
      pastDailyCutoffs.reduce((s, d) => s + d.cashIncome, 0).toFixed(2),
      pastDailyCutoffs.reduce((s, d) => s + d.transferOrCardIncome, 0).toFixed(2),
      pastDailyCutoffs.reduce((s, d) => s + d.incomeCount, 0),
      pastCutoffsTotals.totalIncome.toFixed(2),
      pastDailyCutoffs.reduce((s, d) => s + d.expenseCount, 0),
      pastCutoffsTotals.totalExpenses.toFixed(2),
      pastCutoffsTotals.balance.toFixed(2)
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `historico_cortes_diarios_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSingleDayCutoff = (dayData) => {
    if (!dayData) return;

    const escapeCsv = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = [
      ['CORTE DEL DIA', dayData.formattedDate],
      ['Ingresos Gimnasio (MXN)', dayData.gymIncome.toFixed(2)],
      ['Ingresos Consultorio (MXN)', dayData.consultorioIncome.toFixed(2)],
      ['Total Ingresos (MXN)', dayData.totalIncome.toFixed(2)],
      ['Total Egresos (MXN)', dayData.totalExpenses.toFixed(2)],
      ['Balance del Dia (MXN)', dayData.balance.toFixed(2)],
      [],
      ['--- DESGLOSE DE INGRESOS ---'],
      ['Hora', 'Cliente / Paciente', 'Concepto', 'Plan', 'Metodo', 'Entidad', 'Monto (MXN)'],
      ...dayData.payments.map((p) => [
        format(new Date(p.paid_at), 'dd/MM/yyyy HH:mm'),
        p.entity_type === 'gym'
          ? `${p.client_first_name || ''} ${p.client_last_name || ''}`.trim() || 'Desconocido'
          : `${p.patient_first_name || ''} ${p.patient_last_name || ''}`.trim() || 'Desconocido',
        getTypeLabel(p.payment_type),
        p.plan_name || '-',
        p.payment_method === 'cash' ? 'Efectivo' : p.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta',
        p.entity_type === 'gym' ? 'GYM' : 'Nutricion',
        Number(p.amount).toFixed(2)
      ]),
      [],
      ['--- DESGLOSE DE EGRESOS ---'],
      ['Hora', 'Concepto', 'Metodo', 'Notas', 'Monto (MXN)'],
      ...dayData.expenses.map((e) => [
        format(new Date(e.expense_date), 'dd/MM/yyyy HH:mm'),
        e.concept,
        e.payment_method === 'cash' ? 'Efectivo' : 'Transferencia',
        e.notes || '-',
        `-${Number(e.amount).toFixed(2)}`
      ])
    ];

    const csvContent = '\uFEFF' + lines.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `corte_dia_${dayData.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const displayedHistory = showAllIncome ? history : history.slice(0, 10);
  const displayedDailyHistory = showAllDailyIncome ? dailyHistory : dailyHistory.slice(0, 10);
  const displayedExpenses = showAllExpenses ? expenses : expenses.slice(0, 10);
  const displayedDailyExpenses = showAllDailyExpenses ? dailyExpenses : dailyExpenses.slice(0, 10);

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
  const dailyTotalAmount = dailyHistory.reduce((sum, item) => sum + Number(item.amount), 0);
  const dailyTotalExpenses = dailyExpenses.reduce((sum, item) => sum + Number(item.amount), 0);

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
          FINANZAS DEL MES Y FINANZAS DEL DÍA — Balance general
          ══════════════════════════════════════════════════════════════════════ */}
      {isOwnerOrAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Finanzas del Mes */}
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
                  <h3 className="text-xl xl:text-2xl font-bold text-[var(--color-success)]">{formatCurrency(totalAmount)}</h3>
                </div>
                <IconArrowUp size={28} className="text-[var(--color-success)] opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
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
                  <h3 className="text-xl xl:text-2xl font-bold text-red-500">{formatCurrency(totalExpenses)}</h3>
                </div>
                <IconArrowDown size={28} className="text-red-500 opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              {/* Balance */}
              <div className={`flex items-center justify-between p-4 rounded-[var(--radius-lg)] border ${(totalAmount - totalExpenses) >= 0
                  ? 'bg-[rgba(34,197,94,0.05)] border-[rgba(34,197,94,0.15)]'
                  : 'bg-[rgba(220,38,38,0.05)] border-[rgba(220,38,38,0.15)]'
                }`}>
                <div>
                  <p className={`text-xs font-semibold mb-1 uppercase tracking-wide ${(totalAmount - totalExpenses) >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'
                    }`}>Balance</p>
                  <h3 className={`text-xl xl:text-2xl font-bold ${(totalAmount - totalExpenses) >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'
                    }`}>{formatCurrency(totalAmount - totalExpenses)}</h3>
                </div>
                <IconScale size={28} className={`opacity-70 shrink-0 ${(totalAmount - totalExpenses) >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'}`} />
              </div>
            </div>
          </GymCard>

          {/* Finanzas del Día */}
          <GymCard title="Finanzas del Día" variant="default">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Ingresos del Día */}
              <div
                onClick={scrollToDailyIncome}
                className="flex items-center justify-between bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] p-4 rounded-[var(--radius-lg)] cursor-pointer hover:bg-[rgba(34,197,94,0.14)] hover:scale-[1.01] transition-all shadow-xs group"
                title="Clic para ir a la lista de Ingresos del Día"
              >
                <div>
                  <p className="text-[var(--color-success)] text-xs font-semibold mb-1 uppercase tracking-wide flex items-center gap-1">
                    Ingresos <span className="text-[10px] opacity-75 group-hover:translate-y-0.5 transition-transform">↓</span>
                  </p>
                  <h3 className="text-xl xl:text-2xl font-bold text-[var(--color-success)]">{formatCurrency(dailyTotalAmount)}</h3>
                </div>
                <IconArrowUp size={28} className="text-[var(--color-success)] opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              {/* Egresos del Día */}
              <div
                onClick={scrollToDailyExpenses}
                className="flex items-center justify-between bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)] p-4 rounded-[var(--radius-lg)] cursor-pointer hover:bg-[rgba(220,38,38,0.14)] hover:scale-[1.01] transition-all shadow-xs group"
                title="Clic para ir a la lista de Egresos del Día"
              >
                <div>
                  <p className="text-red-500 text-xs font-semibold mb-1 uppercase tracking-wide flex items-center gap-1">
                    Egresos <span className="text-[10px] opacity-75 group-hover:translate-y-0.5 transition-transform">↓</span>
                  </p>
                  <h3 className="text-xl xl:text-2xl font-bold text-red-500">{formatCurrency(dailyTotalExpenses)}</h3>
                </div>
                <IconArrowDown size={28} className="text-red-500 opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              {/* Balance del Día */}
              <div className={`flex items-center justify-between p-4 rounded-[var(--radius-lg)] border ${(dailyTotalAmount - dailyTotalExpenses) >= 0
                  ? 'bg-[rgba(34,197,94,0.05)] border-[rgba(34,197,94,0.15)]'
                  : 'bg-[rgba(220,38,38,0.05)] border-[rgba(220,38,38,0.15)]'
                }`}>
                <div>
                  <p className={`text-xs font-semibold mb-1 uppercase tracking-wide ${(dailyTotalAmount - dailyTotalExpenses) >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'
                    }`}>Balance</p>
                  <h3 className={`text-xl xl:text-2xl font-bold ${(dailyTotalAmount - dailyTotalExpenses) >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'
                    }`}>{formatCurrency(dailyTotalAmount - dailyTotalExpenses)}</h3>
                </div>
                <IconScale size={28} className={`opacity-70 shrink-0 ${(dailyTotalAmount - dailyTotalExpenses) >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'}`} />
              </div>
            </div>
          </GymCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN DE INGRESOS (MES Y DÍA)
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Ingresos del Mes */}
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

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      Mostrando {displayedHistory.length} de {history.length} filas (10 por defecto)
                    </span>
                    <GymButton
                      variant="secondary"
                      size="sm"
                      icon={showAllIncome ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}
                      onClick={() => setShowAllIncome((prev) => !prev)}
                      disabled={history.length <= 10 && !showAllIncome}
                    >
                      {showAllIncome ? 'Ver menos' : `Ver más${history.length > 10 ? ` (${history.length - 10} más)` : ''}`}
                    </GymButton>
                  </div>
                </>
              )}
            </div>
          </GymCard>
        </div>

        {/* Ingresos del Día */}
        <div ref={dailyIncomeRef} className="scroll-mt-6">
          <GymCard
            title="Ingresos del Día"
            subtitle={dailyHistory.length > 10 ? (showAllDailyIncome ? `Mostrando todos (${dailyHistory.length} registros)` : `Mostrando 10 de ${dailyHistory.length} registros`) : undefined}
            variant="default"
            onHeaderClick={dailyHistory.length > 10 ? () => setShowAllDailyIncome((prev) => !prev) : undefined}
            headerAction={
              dailyHistory.length > 10 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllDailyIncome((prev) => !prev);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                  title={showAllDailyIncome ? "Mostrar 10 registros" : "Mostrar todos los registros"}
                >
                  {showAllDailyIncome ? (
                    <>
                      <span>Ver menos</span>
                      <IconChevronUp size={14} />
                    </>
                  ) : (
                    <>
                      <span>Ver más ({dailyHistory.length})</span>
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
                    onClick={() => setDailyTab('all')}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${dailyTab === 'all' ? 'bg-[var(--color-secondary)] text-black' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                  >
                    General
                  </button>
                  <button
                    onClick={() => setDailyTab('gym')}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${dailyTab === 'gym' ? 'bg-[var(--color-secondary)] text-black' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                  >
                    Gimnasio
                  </button>
                  <button
                    onClick={() => setDailyTab('consultorio')}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${dailyTab === 'consultorio' ? 'bg-[var(--color-secondary)] text-black' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                  >
                    Consultorio
                  </button>
                </div>
              </div>

              {isOwnerOrAdmin && (
                <div className="flex justify-between items-center bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] p-4 rounded-[var(--radius-lg)]">
                  <div>
                    <p className="text-[var(--color-success)] text-sm font-semibold mb-1">Total Ingresos del Día ({dailyTab === 'all' ? 'General' : dailyTab === 'gym' ? 'Gimnasio' : 'Consultorio'})</p>
                    <h3 className="text-3xl font-bold text-[var(--color-success)]">{formatCurrency(dailyTotalAmount)}</h3>
                  </div>
                  <IconArrowUp size={40} className="text-[var(--color-success)] opacity-80" />
                </div>
              )}

              {dailyLoading ? (
                <div className="text-center py-10 text-[var(--color-text-muted)]">Cargando datos...</div>
              ) : dailyError ? (
                <div className="text-center py-10 text-[var(--color-danger)]">Error al cargar el historial del día</div>
              ) : dailyHistory.length === 0 ? (
                <div className="text-center py-10 text-[var(--color-text-muted)]">No hay registros hoy para este filtro</div>
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
                        {displayedDailyHistory.map((item, index) => (
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

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      Mostrando {displayedDailyHistory.length} de {dailyHistory.length} filas (10 por defecto)
                    </span>
                    <GymButton
                      variant="secondary"
                      size="sm"
                      icon={showAllDailyIncome ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}
                      onClick={() => setShowAllDailyIncome((prev) => !prev)}
                      disabled={dailyHistory.length <= 10 && !showAllDailyIncome}
                    >
                      {showAllDailyIncome ? 'Ver menos' : `Ver más${dailyHistory.length > 10 ? ` (${dailyHistory.length - 10} más)` : ''}`}
                    </GymButton>
                  </div>
                </>
              )}
            </div>
          </GymCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN DE EGRESOS (MES Y DÍA)
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Egresos del Mes */}
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

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      Mostrando {displayedExpenses.length} de {expenses.length} filas (10 por defecto)
                    </span>
                    <GymButton
                      variant="secondary"
                      size="sm"
                      icon={showAllExpenses ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}
                      onClick={() => setShowAllExpenses((prev) => !prev)}
                      disabled={expenses.length <= 10 && !showAllExpenses}
                    >
                      {showAllExpenses ? 'Ver menos' : `Ver más${expenses.length > 10 ? ` (${expenses.length - 10} más)` : ''}`}
                    </GymButton>
                  </div>
                </>
              )}
            </div>
          </GymCard>
        </div>

        {/* Egresos del Día */}
        <div ref={dailyExpensesRef} className="scroll-mt-6">
          <GymCard
            title="Egresos del Día"
            subtitle={dailyExpenses.length > 10 ? (showAllDailyExpenses ? `Mostrando todos (${dailyExpenses.length} registros)` : `Mostrando 10 de ${dailyExpenses.length} registros`) : undefined}
            variant="default"
            onHeaderClick={dailyExpenses.length > 10 ? () => setShowAllDailyExpenses((prev) => !prev) : undefined}
            headerAction={
              dailyExpenses.length > 10 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllDailyExpenses((prev) => !prev);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                  title={showAllDailyExpenses ? "Mostrar 10 registros" : "Mostrar todos los registros"}
                >
                  {showAllDailyExpenses ? (
                    <>
                      <span>Ver menos</span>
                      <IconChevronUp size={14} />
                    </>
                  ) : (
                    <>
                      <span>Ver más ({dailyExpenses.length})</span>
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

              {/* Banner de total egresos del día */}
              {isOwnerOrAdmin && (
                <div className="flex justify-between items-center bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)] p-4 rounded-[var(--radius-lg)]">
                  <div>
                    <p className="text-red-500 text-sm font-semibold mb-1">Total Egresos del Día (general)</p>
                    <h3 className="text-3xl font-bold text-red-500">{formatCurrency(dailyTotalExpenses)}</h3>
                  </div>
                  <IconArrowDown size={40} className="text-red-500 opacity-80" />
                </div>
              )}

              {/* Tabla de egresos del día */}
              {dailyExpLoading ? (
                <div className="text-center py-10 text-[var(--color-text-muted)]">Cargando egresos...</div>
              ) : dailyExpError ? (
                <div className="text-center py-10 text-[var(--color-danger)]">Error al cargar los egresos del día</div>
              ) : dailyExpenses.length === 0 ? (
                <div className="text-center py-10 text-[var(--color-text-muted)]">No hay egresos registrados hoy</div>
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
                        {displayedDailyExpenses.map((item, index) => (
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

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      Mostrando {displayedDailyExpenses.length} de {dailyExpenses.length} filas (10 por defecto)
                    </span>
                    <GymButton
                      variant="secondary"
                      size="sm"
                      icon={showAllDailyExpenses ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}
                      onClick={() => setShowAllDailyExpenses((prev) => !prev)}
                      disabled={dailyExpenses.length <= 10 && !showAllDailyExpenses}
                    >
                      {showAllDailyExpenses ? 'Ver menos' : `Ver más${dailyExpenses.length > 10 ? ` (${dailyExpenses.length - 10} más)` : ''}`}
                    </GymButton>
                  </div>
                </>
              )}
            </div>
          </GymCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN DE CORTES DE DÍAS PASADOS (HISTÓRICO DIARIO)
          ══════════════════════════════════════════════════════════════════════ */}
      <GymCard
        title="Cortes de Días Pasados"
        subtitle={
          pastDailyCutoffs.length > 10
            ? showAllPastCutoffs
              ? `Mostrando todos (${pastDailyCutoffs.length} días registrados)`
              : `Mostrando 10 de ${pastDailyCutoffs.length} días registrados`
            : `Historial acumulado día por día (${pastDailyCutoffs.length} días)`
        }
        variant="default"
        onHeaderClick={pastDailyCutoffs.length > 10 ? () => setShowAllPastCutoffs((prev) => !prev) : undefined}
        headerAction={
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleDownloadHistoricalCutoffs}
              disabled={pastDailyCutoffs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-[var(--color-secondary)] text-black hover:opacity-90 transition disabled:opacity-40 cursor-pointer"
              title="Descargar tabla con el histórico de cortes diarios (CSV / Excel)"
            >
              <IconDownload size={15} />
              <span>Descargar Histórico</span>
            </button>
            {pastDailyCutoffs.length > 10 && (
              <button
                onClick={() => setShowAllPastCutoffs((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                title={showAllPastCutoffs ? 'Mostrar 10 días' : 'Mostrar todos los días'}
              >
                {showAllPastCutoffs ? (
                  <>
                    <span>Ver menos</span>
                    <IconChevronUp size={14} />
                  </>
                ) : (
                  <>
                    <span>Ver más ({pastDailyCutoffs.length})</span>
                    <IconChevronDown size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-6">
          {/* Barra superior con descripción, filtros por fecha y botón de descarga */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">
                Resumen histórico de cortes diarios finalizados para validar el acumulado día por día.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={cutoffFromDate}
                  max={todayStr}
                  onChange={(e) => setCutoffFromDate(e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-secondary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={cutoffToDate}
                  max={todayStr}
                  onChange={(e) => setCutoffToDate(e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-secondary)]"
                />
              </div>
              {(cutoffFromDate || cutoffToDate) && (
                <GymButton
                  variant="secondary"
                  size="sm"
                  icon={<IconX size={15} />}
                  onClick={() => {
                    setCutoffFromDate('');
                    setCutoffToDate('');
                  }}
                >
                  Limpiar
                </GymButton>
              )}
              <GymButton
                variant="primary"
                size="sm"
                icon={<IconDownload size={16} />}
                onClick={handleDownloadHistoricalCutoffs}
                disabled={pastDailyCutoffs.length === 0}
              >
                Descargar Histórico (Excel / CSV)
              </GymButton>
            </div>
          </div>

          {/* Resumen acumulado de los días pasados listados */}
          {isOwnerOrAdmin && pastDailyCutoffs.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center justify-between bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] p-4 rounded-[var(--radius-lg)]">
                <div>
                  <p className="text-[var(--color-success)] text-xs font-semibold mb-1 uppercase tracking-wide">
                    Ingresos Acumulados (Días Pasados)
                  </p>
                  <h3 className="text-2xl font-bold text-[var(--color-success)]">
                    {formatCurrency(pastCutoffsTotals.totalIncome)}
                  </h3>
                </div>
                <IconArrowUp size={30} className="text-[var(--color-success)] opacity-75" />
              </div>
              <div className="flex items-center justify-between bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)] p-4 rounded-[var(--radius-lg)]">
                <div>
                  <p className="text-red-500 text-xs font-semibold mb-1 uppercase tracking-wide">
                    Egresos Acumulados (Días Pasados)
                  </p>
                  <h3 className="text-2xl font-bold text-red-500">
                    {formatCurrency(pastCutoffsTotals.totalExpenses)}
                  </h3>
                </div>
                <IconArrowDown size={30} className="text-red-500 opacity-75" />
              </div>
              <div
                className={`flex items-center justify-between p-4 rounded-[var(--radius-lg)] border ${
                  pastCutoffsTotals.balance >= 0
                    ? 'bg-[rgba(34,197,94,0.05)] border-[rgba(34,197,94,0.15)]'
                    : 'bg-[rgba(220,38,38,0.05)] border-[rgba(220,38,38,0.15)]'
                }`}
              >
                <div>
                  <p
                    className={`text-xs font-semibold mb-1 uppercase tracking-wide ${
                      pastCutoffsTotals.balance >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'
                    }`}
                  >
                    Balance Acumulado (Días Pasados)
                  </p>
                  <h3
                    className={`text-2xl font-bold ${
                      pastCutoffsTotals.balance >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'
                    }`}
                  >
                    {formatCurrency(pastCutoffsTotals.balance)}
                  </h3>
                </div>
                <IconScale
                  size={30}
                  className={`opacity-75 ${
                    pastCutoffsTotals.balance >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Tabla de Cortes de Días Pasados */}
          {allPaymentsLoading || allExpensesLoading ? (
            <div className="text-center py-10 text-[var(--color-text-muted)]">
              Cargando histórico de cortes diarios...
            </div>
          ) : pastDailyCutoffs.length === 0 ? (
            <div className="text-center py-10 text-[var(--color-text-muted)]">
              No hay cortes de días pasados registrados para este filtro
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-alt)]">
                <table className="min-w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs uppercase tracking-[0.15em] select-none">
                      <th className="px-4 py-4">Fecha del Corte</th>
                      <th className="px-4 py-4 text-right">Ingresos GYM</th>
                      <th className="px-4 py-4 text-right">Ingresos Consultorio</th>
                      <th className="px-4 py-4 text-right">Efectivo</th>
                      <th className="px-4 py-4 text-right">Transf. / Tarjeta</th>
                      <th className="px-4 py-4 text-right">Total Ingresos</th>
                      <th className="px-4 py-4 text-right">Total Egresos</th>
                      <th className="px-4 py-4 text-right">Balance (Corte)</th>
                      <th className="px-4 py-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPastCutoffs.map((dayItem, index) => (
                      <tr
                        key={dayItem.date}
                        className={index % 2 === 0 ? 'bg-[var(--color-card-alt)]' : 'bg-[var(--color-card)]'}
                      >
                        <td className="px-4 py-4 text-sm font-semibold text-[var(--color-text)]">
                          <div className="flex items-center gap-2">
                            <IconCalendarEvent size={16} className="text-[var(--color-secondary)] shrink-0" />
                            <span>{dayItem.formattedDate}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-medium text-[var(--color-text)]">
                          {formatCurrency(dayItem.gymIncome)}
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-medium text-[var(--color-text)]">
                          {formatCurrency(dayItem.consultorioIncome)}
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-[var(--color-text-muted)]">
                          {formatCurrency(dayItem.cashIncome)}
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-[var(--color-text-muted)]">
                          {formatCurrency(dayItem.transferOrCardIncome)}
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-green-600 dark:text-green-400">
                          <div>{formatCurrency(dayItem.totalIncome)}</div>
                          <span className="text-[11px] font-normal text-[var(--color-text-muted)]">
                            {dayItem.incomeCount} {dayItem.incomeCount === 1 ? 'cobro' : 'cobros'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-red-500">
                          <div>-{formatCurrency(dayItem.totalExpenses)}</div>
                          <span className="text-[11px] font-normal text-[var(--color-text-muted)]">
                            {dayItem.expenseCount} {dayItem.expenseCount === 1 ? 'egreso' : 'egresos'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-sm font-bold ${
                              dayItem.balance >= 0
                                ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                                : 'bg-red-500/15 text-red-500'
                            }`}
                          >
                            {formatCurrency(dayItem.balance)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedDayCutoff(dayItem)}
                              className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/10 transition-colors"
                              title="Ver desglose del día"
                            >
                              <IconEye size={18} />
                            </button>
                            <button
                              onClick={() => handleDownloadSingleDayCutoff(dayItem)}
                              className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                              title="Descargar corte de este día (CSV / Excel)"
                            >
                              <IconDownload size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3">
                <span className="text-xs text-[var(--color-text-muted)]">
                  Mostrando {displayedPastCutoffs.length} de {pastDailyCutoffs.length} filas (10 por defecto)
                </span>
                <GymButton
                  variant="secondary"
                  size="sm"
                  icon={showAllPastCutoffs ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}
                  onClick={() => setShowAllPastCutoffs((prev) => !prev)}
                  disabled={pastDailyCutoffs.length <= 10 && !showAllPastCutoffs}
                >
                  {showAllPastCutoffs ? 'Ver menos' : `Ver más${pastDailyCutoffs.length > 10 ? ` (${pastDailyCutoffs.length - 10} más)` : ''}`}
                </GymButton>
              </div>
            </>
          )}
        </div>
      </GymCard>

      {/* Modal para ver el desglose completo de un corte de día pasado */}
      <GymModal
        isOpen={!!selectedDayCutoff}
        onClose={() => setSelectedDayCutoff(null)}
        title={selectedDayCutoff ? `Desglose del Corte — ${selectedDayCutoff.formattedDate}` : 'Desglose del Corte'}
        size="lg"
      >
        {selectedDayCutoff && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] p-3 rounded-lg">
                <p className="text-xs font-semibold text-[var(--color-success)] uppercase">Total Ingresos</p>
                <p className="text-xl font-bold text-[var(--color-success)]">
                  {formatCurrency(selectedDayCutoff.totalIncome)}
                </p>
              </div>
              <div className="bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.2)] p-3 rounded-lg">
                <p className="text-xs font-semibold text-red-500 uppercase">Total Egresos</p>
                <p className="text-xl font-bold text-red-500">
                  -{formatCurrency(selectedDayCutoff.totalExpenses)}
                </p>
              </div>
              <div
                className={`p-3 rounded-lg border ${
                  selectedDayCutoff.balance >= 0
                    ? 'bg-[rgba(34,197,94,0.06)] border-[rgba(34,197,94,0.2)]'
                    : 'bg-[rgba(220,38,38,0.06)] border-[rgba(220,38,38,0.2)]'
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase ${
                    selectedDayCutoff.balance >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'
                  }`}
                >
                  Balance del Día
                </p>
                <p
                  className={`text-xl font-bold ${
                    selectedDayCutoff.balance >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'
                  }`}
                >
                  {formatCurrency(selectedDayCutoff.balance)}
                </p>
              </div>
            </div>

            {/* Lista de ingresos de ese día */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Ingresos del Día ({selectedDayCutoff.payments.length})
              </h4>
              {selectedDayCutoff.payments.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] py-2">Sin ingresos registrados en esta fecha.</p>
              ) : (
                <div className="max-h-52 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-card-alt)]">
                  <table className="min-w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[var(--color-surface)] text-[var(--color-text-muted)] uppercase">
                        <th className="px-3 py-2">Hora</th>
                        <th className="px-3 py-2">Cliente / Paciente</th>
                        <th className="px-3 py-2">Concepto</th>
                        <th className="px-3 py-2">Método</th>
                        <th className="px-3 py-2 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDayCutoff.payments.map((p) => (
                        <tr key={p.id} className="border-t border-[var(--color-border)]">
                          <td className="px-3 py-2 text-[var(--color-text)]">
                            {format(new Date(p.paid_at), 'HH:mm')}
                          </td>
                          <td className="px-3 py-2 font-semibold text-[var(--color-text)]">
                            {p.entity_type === 'gym'
                              ? `${p.client_first_name || ''} ${p.client_last_name || ''}`.trim() || 'Desconocido'
                              : `${p.patient_first_name || ''} ${p.patient_last_name || ''}`.trim() || 'Desconocido'}
                          </td>
                          <td className="px-3 py-2 text-[var(--color-text-muted)]">
                            {getTypeLabel(p.payment_type)}
                          </td>
                          <td className="px-3 py-2 text-[var(--color-text-muted)]">
                            {p.payment_method === 'cash'
                              ? 'Efectivo'
                              : p.payment_method === 'transfer'
                              ? 'Transferencia'
                              : 'Tarjeta'}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Lista de egresos de ese día */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Egresos del Día ({selectedDayCutoff.expenses.length})
              </h4>
              {selectedDayCutoff.expenses.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] py-2">Sin egresos registrados en esta fecha.</p>
              ) : (
                <div className="max-h-52 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-card-alt)]">
                  <table className="min-w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[var(--color-surface)] text-[var(--color-text-muted)] uppercase">
                        <th className="px-3 py-2">Hora</th>
                        <th className="px-3 py-2">Concepto</th>
                        <th className="px-3 py-2">Método</th>
                        <th className="px-3 py-2 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDayCutoff.expenses.map((e) => (
                        <tr key={e.id} className="border-t border-[var(--color-border)]">
                          <td className="px-3 py-2 text-[var(--color-text)]">
                            {format(new Date(e.expense_date), 'HH:mm')}
                          </td>
                          <td className="px-3 py-2 font-semibold text-[var(--color-text)]">{e.concept}</td>
                          <td className="px-3 py-2 text-[var(--color-text-muted)]">
                            {e.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-red-500">
                            -{formatCurrency(e.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
              <GymButton
                variant="primary"
                size="sm"
                icon={<IconDownload size={16} />}
                onClick={() => handleDownloadSingleDayCutoff(selectedDayCutoff)}
              >
                Descargar Corte de este Día
              </GymButton>
              <button
                type="button"
                onClick={() => setSelectedDayCutoff(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/5 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </GymModal>

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
