import React, { useState } from 'react';
import { IconCash, IconCalendarEvent, IconX } from '@tabler/icons-react';
import { format, startOfMonth } from 'date-fns';
import { GymCard } from '../components/ui/GymCard';
import { usePaymentsHistory } from '../hooks/useFinances';

export default function Finanzas() {
  const [tab, setTab] = useState('all'); // all, gym, consultorio
  const today = new Date();
  const [fromDate, setFromDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(today, 'yyyy-MM-dd'));

  const { data: response, isLoading, isError } = usePaymentsHistory(tab, fromDate, toDate);
  const history = response?.data || [];

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
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

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-[var(--color-navy)] mb-1 flex items-center gap-3">
            <IconCash size={32} className="text-[var(--color-gold)]" />
            Flujo de Efectivo
          </h1>
          <p className="text-[var(--color-text-muted)]">
            Consulta los ingresos por área, cliente y periodo.
          </p>
        </div>
      </div>

      <GymCard title="Historial de pagos" variant="default">
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

            <div className="flex gap-3 items-center w-full lg:w-auto">
              <div className="relative flex-1 md:w-40">
                <IconCalendarEvent size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-secondary)]"
                  title="Fecha desde"
                />
              </div>
              <span className="text-[var(--color-text-muted)]">-</span>
              <div className="relative flex-1 md:w-40">
                <IconCalendarEvent size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-secondary)]"
                  title="Fecha hasta"
                />
              </div>
              {(fromDate || toDate) && (
                <button onClick={handleClearFilters} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors" title="Limpiar fechas">
                  <IconX size={20} />
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] p-4 rounded-[var(--radius-lg)]">
            <div>
              <p className="text-[var(--color-success)] text-sm font-semibold mb-1">Total Ingresos ({tab === 'all' ? 'General' : tab === 'gym' ? 'Gimnasio' : 'Consultorio'})</p>
              <h3 className="text-3xl font-bold text-[var(--color-success)]">{formatCurrency(totalAmount)}</h3>
            </div>
            <IconCash size={40} className="text-[var(--color-success)] opacity-80" />
          </div>

          {isLoading ? (
            <div className="text-center py-10 text-[var(--color-text-muted)]">Cargando datos...</div>
          ) : isError ? (
            <div className="text-center py-10 text-[var(--color-danger)]">Error al cargar el historial</div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 text-[var(--color-text-muted)]">No hay registros para este filtro</div>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-alt)]">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs uppercase tracking-[0.15em] select-none">
                    <th className="px-4 py-4">Fecha</th>
                    <th className="px-4 py-4">Cliente / Paciente</th>
                    <th className="px-4 py-4">Concepto</th>
                    <th className="px-4 py-4">Método</th>
                    <th className="px-4 py-4">Entidad</th>
                    <th className="px-4 py-4 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, index) => (
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
                      <td className="px-4 py-4 text-sm capitalize text-[var(--color-text-muted)]">
                        {item.payment_method === 'cash' ? 'Efectivo' : item.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta'}
                      </td>
                      <td className="px-4 py-4">
                        {getEntityBadge(item.entity_type)}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </GymCard>
    </div>
  );
}
