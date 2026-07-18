import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDashboard, useSendNotification, useRenewSubscription } from '../hooks/useDashboard';
import { GymCard } from '../components/ui/GymCard';
import { GymModal } from '../components/ui/GymModal';
import { GymButton } from '../components/ui/GymButton';
import { IconChartBar, IconSpeakerphone, IconSend, IconCreditCard, IconCheck, IconAlertTriangle, IconSearch } from '@tabler/icons-react';
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

const ClientRow = ({ client, onAction, actionLabel, actionVariant, actionIcon, customDetail }) => {
  let dateText = '';
  if (client.end_date) {
    dateText = new Date(client.end_date).toLocaleDateString('es-MX');
  }
  const displayDetail = customDetail || (dateText ? `Vence: ${dateText}` : '');

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-alt)] p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-[var(--color-text)]">{client.first_name} {client.last_name}</p>
        <p className="text-sm text-[var(--color-text-muted)]">{client.plan_name} • {client.phone} {displayDetail ? `• ${displayDetail}` : ''}</p>
      </div>
      {onAction && actionLabel && (
        <GymButton size="sm" variant={actionVariant} icon={actionIcon} onClick={() => onAction(client)}>{actionLabel}</GymButton>
      )}
    </motion.div>
  );
};

const getMonthsRemainingText = (endDateStr) => {
  if (!endDateStr) return '';
  const endDate = new Date(endDateStr);
  const today = new Date();
  
  endDate.setHours(0,0,0,0);
  today.setHours(0,0,0,0);

  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) return 'Vencido';
  
  const months = Math.floor(diffDays / 30);
  const remainingDays = diffDays % 30;
  
  if (months === 0) {
    return `vence en ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  } else if (remainingDays === 0) {
    return `vence en ${months} ${months === 1 ? 'mes' : 'meses'}`;
  } else {
    return `vence en ${months} ${months === 1 ? 'mes' : 'meses'} y ${remainingDays} ${remainingDays === 1 ? 'día' : 'días'}`;
  }
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
      <span className="rounded-full bg-[rgba(34,197,94,0.15)] px-3 py-1 text-xs font-semibold text-[var(--color-success)] flex items-center gap-1">
        <IconCheck size={14} /> Presente
      </span>
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
  const [searchTerm, setSearchTerm] = useState('');

  const filterItems = (items, term) => {
    if (!items) return [];
    if (!term) return items;
    const lowerTerm = term.toLowerCase().trim();
    return items.filter(item => {
      const fullName = `${item.first_name || ''} ${item.last_name || ''}`.toLowerCase();
      const phone = (item.phone || '').toLowerCase();
      const planName = (item.plan_name || '').toLowerCase();
      const method = (item.method || '').toLowerCase();
      return fullName.includes(lowerTerm) || 
             phone.includes(lowerTerm) || 
             planName.includes(lowerTerm) ||
             method.includes(lowerTerm);
    });
  };

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
  
  const totalClients = dashboard.totalClients || 0;
  const totalClientsList = dashboard.totalClientsList || [];
  const todayVisitors = dashboard.todayVisitors || 0;
  const todayVisitorsList = dashboard.todayVisitorsList || [];
  const renewalsThisMonth = dashboard.renewalsThisMonth || 0;
  const renewalsThisMonthList = dashboard.renewalsThisMonthList || [];
  const cancellationsThisMonth = dashboard.cancellationsThisMonth || 0;
  const cancellationsThisMonthList = dashboard.cancellationsThisMonthList || [];
  const newClientsThisMonth = dashboard.newClientsThisMonth || 0;
  const newClientsThisMonthList = dashboard.newClientsThisMonthList || [];
  const annualCancellationsCount = dashboard.annualCancellationsCount || 0;
  const annualCancellationsList = dashboard.annualCancellationsList || [];
  const annualExpiringCount = dashboard.annualExpiringCount || 0;
  const annualExpiringList = dashboard.annualExpiringList || [];

  const mappedVisitorsList = todayVisitorsList.map(visitor => ({ ...visitor, plan_name: 'Visita' }));
  const mappedRenewalsList = renewalsThisMonthList.map(renewal => ({
    ...renewal,
    plan_name: renewal.plan_name ? `Renovación (${renewal.plan_name})` : 'Renovación'
  }));

  const filteredActive = filterItems(activeClientsList, searchTerm);
  const filteredExpiring3Days = filterItems(expiring3Days, searchTerm);
  const filteredExpiringToday = filterItems(expiringToday, searchTerm);
  const filteredExpired = filterItems(expiredClients, searchTerm);
  const filteredAttendance = filterItems(todayAttendance.all, searchTerm);
  const filteredTotalClients = filterItems(totalClientsList, searchTerm);
  const filteredTodayVisitors = filterItems(mappedVisitorsList, searchTerm);
  const filteredRenewals = filterItems(mappedRenewalsList, searchTerm);
  const filteredCancellations = filterItems(cancellationsThisMonthList, searchTerm);
  const filteredAnnualCancellations = filterItems(annualCancellationsList, searchTerm);
  const filteredAnnualExpiring = filterItems(annualExpiringList, searchTerm);
  const filteredNewClients = filterItems(newClientsThisMonthList, searchTerm);

  const handleNotify = (client) => {
    setSelectedClient(client);
    setModalNotify(true);
  };

  const handleConfirmNotify = async () => {
    try {
      await sendNotification.mutateAsync(selectedClient.id);
      toast.success('Notificación enviada');
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
      toast.success('Suscripción renovada');
      setModalRenew(false);
      refetch();
    } catch (error) {
      toast.error(error.message || 'Error al renovar suscripción');
    }
  };

  const toggleSection = (section) => {
    setSearchTerm('');
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
          <GymButton icon={<IconChartBar size={18} />} variant="secondary" onClick={() => navigate('/statistics')}>Ver Informe</GymButton>
          <GymButton icon={<IconSpeakerphone size={18} />} variant="primary" onClick={() => toast('Funcionalidad de avisos masivos en construcción', { icon: <IconAlertTriangle size={20} /> })}>Enviar Aviso</GymButton>
        </div>
      </section>

      {/* Estadísticas compactas interactivas */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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

        <div onClick={() => toggleSection('totalClients')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'totalClients' ? 'ring-2 ring-[var(--color-secondary)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Clientes Totales" subtitle="Histórico" variant="default" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{totalClients}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Todos los registrados.</p>
          </GymCard>
        </div>

        <div onClick={() => toggleSection('todayVisitors')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'todayVisitors' ? 'ring-2 ring-[var(--color-secondary)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Visitantes" subtitle="Día actual" variant="default" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{todayVisitors}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Visitas vendidas hoy.</p>
          </GymCard>
        </div>

        <div onClick={() => toggleSection('renewals')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'renewals' ? 'ring-2 ring-[var(--color-success)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Renovaciones" subtitle="Mes actual" variant="success" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{renewalsThisMonth}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Pagos mensuales.</p>
          </GymCard>
        </div>

        <div onClick={() => toggleSection('cancellations')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'cancellations' ? 'ring-2 ring-[var(--color-text-muted)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Cancelaciones" subtitle="Mes actual" variant="default" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{cancellationsThisMonth}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Suscripciones expiradas.</p>
          </GymCard>
        </div>

        <div onClick={() => toggleSection('annualCancellations')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'annualCancellations' ? 'ring-2 ring-[var(--color-text-muted)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Cancelaciones Anualidad" subtitle="Expiradas" variant="default" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{annualCancellationsCount}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Inscripciones vencidas.</p>
          </GymCard>
        </div>

        <div onClick={() => toggleSection('annualExpiring')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'annualExpiring' ? 'ring-2 ring-[var(--color-text-muted)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Anualidades por Vencer" subtitle="Próximos 3 meses" variant="default" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{annualExpiringCount}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Próximos vencimientos.</p>
          </GymCard>
        </div>

        <div onClick={() => toggleSection('newClients')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'newClients' ? 'ring-2 ring-[var(--color-secondary)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Nuevos Clientes" subtitle="Mes actual" variant="default" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{newClientsThisMonth}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Registrados este mes.</p>
          </GymCard>
        </div>
      </section>

      {/* Panel expansible condicional */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {expandedSection && (
              <motion.section
                key="expanded-section"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <GymCard 
                  title={
                    expandedSection === 'active' ? 'Lista de Clientes Activos' :
                    expandedSection === 'expiring3Days' ? 'Clientes que vencen en 3 días' :
                    expandedSection === 'expiringToday' ? 'Clientes que vencen hoy' :
                    expandedSection === 'expired' ? 'Clientes con membresía vencida' :
                    expandedSection === 'attendance' ? 'Registro de Asistencias de hoy' :
                    expandedSection === 'totalClients' ? 'Lista de Clientes Totales' :
                    expandedSection === 'todayVisitors' ? 'Lista de Visitantes de Hoy' :
                    expandedSection === 'renewals' ? 'Renovaciones del Mes' :
                    expandedSection === 'cancellations' ? 'Cancelaciones / Expiraciones del Mes' :
                    expandedSection === 'annualCancellations' ? 'Cancelaciones de Anualidad' :
                    expandedSection === 'annualExpiring' ? 'Anualidades por Vencer en los Próximos 3 Meses' :
                    expandedSection === 'newClients' ? 'Nuevos Clientes del Mes' : ''
                  } 
                  variant="default"
                >
                  {/* Buscador */}
                  <div className="relative mt-4">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[var(--color-text-muted)]">
                      <IconSearch size={18} />
                    </span>
                    <input
                      type="text"
                      placeholder="Buscar por nombre, teléfono o plan..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] pl-10 pr-3 py-2 text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)] text-sm"
                    />
                  </div>

                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 mt-4">
                    {expandedSection === 'active' && filteredActive.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay clientes activos.'}</p>
                    )}
                    {expandedSection === 'active' && filteredActive.map(client => (
                      <ClientRow key={client.id} client={client} />
                    ))}

                    {expandedSection === 'expiring3Days' && filteredExpiring3Days.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay clientes por vencer en 3 días.'}</p>
                    )}
                    {expandedSection === 'expiring3Days' && filteredExpiring3Days.map(client => (
                      <ClientRow key={client.id} client={client} onAction={handleNotify} actionLabel="Notificar" actionVariant="warning" actionIcon={<IconSend size={18} />} />
                    ))}

                    {expandedSection === 'expiringToday' && filteredExpiringToday.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay clientes por vencer hoy.'}</p>
                    )}
                    {expandedSection === 'expiringToday' && filteredExpiringToday.map(client => (
                      <ClientRow key={client.id} client={client} onAction={handleRenew} actionLabel="Renovar" actionVariant="success" actionIcon={<IconCreditCard size={18} />} />
                    ))}

                    {expandedSection === 'expired' && filteredExpired.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay clientes vencidos.'}</p>
                    )}
                    {expandedSection === 'expired' && filteredExpired.map(client => (
                      <ClientRow key={client.id} client={client} onAction={handleRenew} actionLabel="Renovar" actionVariant="success" actionIcon={<IconCreditCard size={18} />} />
                    ))}

                    {expandedSection === 'attendance' && filteredAttendance.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay asistencias registradas hoy.'}</p>
                    )}
                    {expandedSection === 'attendance' && filteredAttendance.map(record => (
                      <AttendanceRow key={record.id} record={record} />
                    ))}

                    {expandedSection === 'totalClients' && filteredTotalClients.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay clientes registrados.'}</p>
                    )}
                    {expandedSection === 'totalClients' && filteredTotalClients.map(client => (
                      <ClientRow key={client.id} client={client} />
                    ))}

                    {expandedSection === 'todayVisitors' && filteredTodayVisitors.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay visitantes hoy.'}</p>
                    )}
                    {expandedSection === 'todayVisitors' && filteredTodayVisitors.map(visitor => (
                      <ClientRow key={visitor.id} client={visitor} />
                    ))}

                    {expandedSection === 'renewals' && filteredRenewals.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay renovaciones este mes.'}</p>
                    )}
                    {expandedSection === 'renewals' && filteredRenewals.map(renewal => (
                      <ClientRow 
                        key={renewal.id} 
                        client={renewal} 
                        customDetail={
                          renewal.start_date && renewal.end_date
                            ? `Periodo: ${new Date(renewal.start_date).toLocaleDateString('es-MX')} al ${new Date(renewal.end_date).toLocaleDateString('es-MX')} • Vence: ${new Date(renewal.end_date).toLocaleDateString('es-MX')}`
                            : ''
                        }
                      />
                    ))}

                    {expandedSection === 'cancellations' && filteredCancellations.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay cancelaciones/expiraciones este mes.'}</p>
                    )}
                    {expandedSection === 'cancellations' && filteredCancellations.map(cancel => (
                      <ClientRow key={cancel.id} client={cancel} />
                    ))}

                    {expandedSection === 'annualCancellations' && filteredAnnualCancellations.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay cancelaciones de anualidad.'}</p>
                    )}
                    {expandedSection === 'annualCancellations' && filteredAnnualCancellations.map(client => (
                      <ClientRow key={client.id} client={client} />
                    ))}

                    {expandedSection === 'annualExpiring' && filteredAnnualExpiring.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay anualidades por vencer en los próximos 3 meses.'}</p>
                    )}
                    {expandedSection === 'annualExpiring' && filteredAnnualExpiring.map(client => (
                      <ClientRow key={client.id} client={client} customDetail={getMonthsRemainingText(client.end_date)} />
                    ))}

                    {expandedSection === 'newClients' && filteredNewClients.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay clientes nuevos este mes.'}</p>
                    )}
                    {expandedSection === 'newClients' && filteredNewClients.map(client => (
                      <ClientRow key={client.id} client={client} />
                    ))}
                  </div>
                </GymCard>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        <section className="lg:col-span-1">
          <GymCard title="Control de Transferencias" subtitle="Mes actual" variant={transferControl.percentage > 90 ? 'danger' : transferControl.percentage > 70 ? 'warning' : 'default'}>
            <div className="space-y-4">
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
      </div>

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
              {/* <option value="card">Tarjeta</option> */}
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
            <div className="rounded-[var(--radius-md)] bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.2)] p-3 text-sm text-[var(--color-warning)] flex items-start gap-2">
              <IconAlertTriangle size={18} className="mt-0.5 shrink-0" /> 
              <span>Precaución: Se está acercando al tope de transferencias del mes ({transferControl.percentage}%).</span>
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