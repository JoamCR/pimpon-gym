import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDashboard, useSendNotification, useRenewSubscription } from '../hooks/useDashboard';
import { GymCard } from '../components/ui/GymCard';
import { GymModal } from '../components/ui/GymModal';
import { GymButton } from '../components/ui/GymButton';
import '../styles/dashboard.css';

const ProgressBar = ({ used, limit, percentage }) => {
  let fill = 'bg-[var(--color-success)]';
  let text = 'text-[var(--color-success)]';
  if (percentage >= 90) {
    fill = 'bg-[var(--color-danger)]';
    text = 'text-[var(--color-danger)]';
  } else if (percentage >= 70) {
    fill = 'bg-[var(--color-warning)]';
    text = 'text-[var(--color-warning)]';
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)]">
        <span>${used.toLocaleString('es-MX')} / ${limit.toLocaleString('es-MX')} MXN</span>
        <span className={`font-semibold ${text}`}>{percentage}%</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
        <div className={`${fill} h-full rounded-full transition-all duration-500`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
    </div>
  );
};

const ClientRow = ({ client, onAction, actionLabel, actionVariant, actionIcon }) => {
  let dateText = '';
  if (client.end_date) {
    dateText = new Date(client.end_date).toLocaleDateString('es-MX');
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-alt)] p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-[var(--color-text)]">{client.first_name} {client.last_name}</p>
        <p className="text-sm text-[var(--color-text-muted)]">{client.plan_name} • {client.phone} {dateText ? `• Vence: ${dateText}` : ''}</p>
      </div>
      {onAction && actionLabel && (
        <GymButton size="sm" variant={actionVariant} icon={actionIcon} onClick={() => onAction(client)}>{actionLabel}</GymButton>
      )}
    </motion.div>
  );
};

const AttendanceRow = ({ record }) => {
  const timeIn = new Date(record.checked_in_at).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-alt)] p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-[var(--color-text)]">{record.first_name} {record.last_name}</p>
        <p className="text-sm text-[var(--color-text-muted)]">Entrada: {timeIn} • Método: {record.method}</p>
      </div>
      <span className="rounded-full bg-[rgba(34,197,94,0.15)] px-3 py-1 text-xs font-semibold text-[var(--color-success)]">✓ Presente</span>
    </motion.div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [modalNotify, setModalNotify] = useState(false);
  const [modalRenew, setModalRenew] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [renewFormData, setRenewFormData] = useState({
    payment_method: 'cash',
    amount: 0,
  });
  const [expandedSection, setExpandedSection] = useState(null);

  const { data: dashboardResponse, isLoading, isError, refetch } = useDashboard();
  const sendNotification = useSendNotification();
  const renewSubscription = useRenewSubscription();

  const dashboard = dashboardResponse?.data || {};
  const expiring3Days = dashboard.expiring3Days || [];
  const expiringToday = dashboard.expiringToday || [];
  const expiredClients = dashboard.expiredClients || [];
  const activeClientsList = dashboard.activeClientsList || [];
  const transferControl = dashboard.transferControl || { used: 0, limit: 30000, remaining: 30000, percentage: 0 };
  const activeCount = dashboard.activeCount || 0;
  const todayAttendance = dashboard.todayAttendance || { total: 0, recent: [], all: [] };

  const handleNotify = (client) => {
    setSelectedClient(client);
    setModalNotify(true);
  };

  const handleConfirmNotify = async () => {
    try {
      await sendNotification.mutateAsync(selectedClient.id);
      toast.success('✅ Notificación enviada');
      setModalNotify(false);
      refetch();
    } catch (error) {
      toast.error(error.message || 'Error al enviar notificación');
    }
  };

  const handleRenew = (client) => {
    setSelectedClient(client);
    setRenewFormData({ payment_method: 'cash', amount: 0 });
    setModalRenew(true);
  };

  const handleConfirmRenew = async () => {
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
      toast.success('✅ Suscripción renovada');
      setModalRenew(false);
      refetch();
    } catch (error) {
      toast.error(error.message || 'Error al renovar suscripción');
    }
  };

  const toggleSection = (section) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] p-6">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-[rgba(226,154,0,0.3)] border-t-[var(--color-secondary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--color-text-muted)]">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen p-6 bg-[var(--color-surface)]">
        <GymCard variant="danger" title="Error">
          <p className="text-[var(--color-text-muted)]">Error al cargar el dashboard. Por favor intenta nuevamente.</p>
          <GymButton className="mt-4" onClick={() => refetch()}>Reintentar</GymButton>
        </GymCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6 bg-[var(--color-surface)]">
      <section className="grid gap-4 md:grid-cols-[auto_1fr] items-end">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-3 rounded-full bg-[rgba(226,154,0,0.12)] px-4 py-2 text-[var(--color-secondary)] font-semibold text-sm">Dashboard</div>
          <div>
            <h1 className="text-4xl font-[var(--font-display)] font-bold text-[var(--color-text)]">Control del gimnasio</h1>
            <p className="text-[var(--color-text-muted)] mt-2">Visión general de clientes, pagos y asistencias.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 justify-start md:justify-end">
          <GymButton icon="📅" variant="secondary" onClick={() => navigate('/statistics')}>Ver Informe</GymButton>
          <GymButton icon="📢" variant="primary" onClick={() => toast('Funcionalidad de avisos masivos en construcción', { icon: '🚧' })}>Enviar Aviso</GymButton>
        </div>
      </section>

      {/* Estadísticas compactas interactivas */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <div onClick={() => toggleSection('active')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'active' ? 'ring-2 ring-[var(--color-success)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Clientes Activos" subtitle="Hoy" variant="success" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{activeCount}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Con membresía vigente.</p>
          </GymCard>
        </div>

        <div onClick={() => toggleSection('expiring3Days')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'expiring3Days' ? 'ring-2 ring-[var(--color-warning)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Vencen en 3 días" subtitle={`${expiring3Days.length} clientes`} variant="warning" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{expiring3Days.length}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Enviar recordatorio.</p>
          </GymCard>
        </div>

        <div onClick={() => toggleSection('expiringToday')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'expiringToday' ? 'ring-2 ring-[var(--color-danger)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Vencen hoy" subtitle={`${expiringToday.length} clientes`} variant="danger" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{expiringToday.length}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Acción inmediata.</p>
          </GymCard>
        </div>

        <div onClick={() => toggleSection('expired')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'expired' ? 'ring-2 ring-[var(--color-text-muted)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Vencidos" subtitle={`${expiredClients.length} clientes`} variant="default" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{expiredClients.length}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Membresías expiradas.</p>
          </GymCard>
        </div>

        <div onClick={() => toggleSection('attendance')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'attendance' ? 'ring-2 ring-[var(--color-secondary)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Asistencias" subtitle="Día actual" variant="default" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{todayAttendance.total}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Entradas al gym hoy.</p>
          </GymCard>
        </div>
      </section>

      {/* Panel expansible condicional */}
      <AnimatePresence mode="wait">
        {expandedSection && (
          <motion.section
            key="expanded-section"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <GymCard 
              title={
                expandedSection === 'active' ? 'Lista de Clientes Activos' :
                expandedSection === 'expiring3Days' ? 'Clientes que vencen en 3 días' :
                expandedSection === 'expiringToday' ? 'Clientes que vencen hoy' :
                expandedSection === 'expired' ? 'Clientes con membresía vencida' :
                'Registro de Asistencias de hoy'
              } 
              variant="default"
            >
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 mt-4">
                {expandedSection === 'active' && activeClientsList.length === 0 && <p className="text-[var(--color-text-muted)]">No hay clientes activos.</p>}
                {expandedSection === 'active' && activeClientsList.map(client => (
                  <ClientRow key={client.id} client={client} />
                ))}

                {expandedSection === 'expiring3Days' && expiring3Days.length === 0 && <p className="text-[var(--color-text-muted)]">No hay clientes por vencer en 3 días.</p>}
                {expandedSection === 'expiring3Days' && expiring3Days.map(client => (
                  <ClientRow key={client.id} client={client} onAction={handleNotify} actionLabel="Notificar" actionVariant="warning" actionIcon="💬" />
                ))}

                {expandedSection === 'expiringToday' && expiringToday.length === 0 && <p className="text-[var(--color-text-muted)]">No hay clientes por vencer hoy.</p>}
                {expandedSection === 'expiringToday' && expiringToday.map(client => (
                  <ClientRow key={client.id} client={client} onAction={handleRenew} actionLabel="Renovar" actionVariant="success" actionIcon="💳" />
                ))}

                {expandedSection === 'expired' && expiredClients.length === 0 && <p className="text-[var(--color-text-muted)]">No hay clientes vencidos.</p>}
                {expandedSection === 'expired' && expiredClients.map(client => (
                  <ClientRow key={client.id} client={client} onAction={handleRenew} actionLabel="Renovar" actionVariant="success" actionIcon="💳" />
                ))}

                {expandedSection === 'attendance' && todayAttendance.all.length === 0 && <p className="text-[var(--color-text-muted)]">No hay asistencias registradas hoy.</p>}
                {expandedSection === 'attendance' && todayAttendance.all.map(record => (
                  <AttendanceRow key={record.id} record={record} />
                ))}
              </div>
            </GymCard>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="grid gap-6 xl:grid-cols-[1fr]">
        <GymCard title="Control de Transferencias" subtitle="Mes actual" variant={transferControl.percentage > 90 ? 'danger' : transferControl.percentage > 70 ? 'warning' : 'default'}>
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Usado</p>
                <p className="text-3xl font-bold text-[var(--color-text)]">${transferControl.used.toLocaleString('es-MX')}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Disponible</p>
                <p className="text-base font-semibold text-[var(--color-text)]">${transferControl.remaining.toLocaleString('es-MX')}</p>
              </div>
            </div>
            <ProgressBar used={transferControl.used} limit={transferControl.limit} percentage={transferControl.percentage} />
            <p className="text-sm text-[var(--color-text-muted)]">El límite mensual no se bloquea, solo muestra advertencia.</p>
          </div>
        </GymCard>
      </section>

      <GymModal isOpen={modalNotify} onClose={() => setModalNotify(false)} title="Confirmar Notificación" width="sm">
        <div className="space-y-4 text-[var(--color-text-muted)]">
          <p>Enviar notificación a <strong>{selectedClient?.first_name}</strong>?</p>
          <div className="flex justify-end gap-3">
            <GymButton variant="secondary" size="sm" onClick={() => setModalNotify(false)}>Cancelar</GymButton>
            <GymButton variant="warning" size="sm" onClick={handleConfirmNotify} loading={sendNotification.isLoading}>Enviar</GymButton>
          </div>
        </div>
      </GymModal>

      <GymModal isOpen={modalRenew} onClose={() => setModalRenew(false)} title="Renovar Suscripción" width="sm">
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

          {renewFormData.payment_method === 'transfer' && transferControl.percentage > 85 && (
            <div className="rounded-[var(--radius-md)] bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.2)] p-3 text-sm text-[var(--color-warning)]">
              ⚠️ Precaución: Se está acercando al tope de transferencias del mes ({transferControl.percentage}%).
            </div>
          )}

          <div className="flex justify-end gap-3">
            <GymButton variant="secondary" size="sm" onClick={() => setModalRenew(false)}>Cancelar</GymButton>
            <GymButton variant="success" size="sm" onClick={handleConfirmRenew} loading={renewSubscription.isLoading}>Renovar</GymButton>
          </div>
        </div>
      </GymModal>
    </div>
  );
}