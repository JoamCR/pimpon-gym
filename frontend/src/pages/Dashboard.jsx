import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDashboard, useSendNotification, useRenewSubscription } from '../hooks/useDashboard';
import { GymCard } from '../components/ui/GymCard';
import { GymModal } from '../components/ui/GymModal';
import { GymButton } from '../components/ui/GymButton';
import { PageHeader } from '../components/ui/PageHeader';
import { IconLayoutDashboard, IconChartBar, IconSpeakerphone, IconSend, IconCreditCard, IconCheck, IconAlertTriangle, IconSearch } from '@tabler/icons-react';
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
  const [selectedClient, setSelectedClient] = useState(null);
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

  const dashboard = dashboardResponse?.data || {};

  // Bloque 1: Mensualidades y Clientes Activos
  const activeClientsList = dashboard.activeClientsList || [];
  const activeCount = dashboard.activeCount || activeClientsList.length;
  const expiring3Days = dashboard.expiring3Days || [];
  const expiringToday = dashboard.expiringToday || [];
  const expiredClients = dashboard.expiredClients || [];
  const newClientsThisMonth = dashboard.newClientsThisMonth || 0;
  const newClientsThisMonthList = dashboard.newClientsThisMonthList || [];
  const renewalsThisMonth = dashboard.renewalsThisMonth || 0;
  const renewalsThisMonthList = dashboard.renewalsThisMonthList || [];

  // Bloque 2: Anualidades
  const activeAnnualCount = dashboard.activeAnnualCount || 0;
  const activeAnnualList = dashboard.activeAnnualList || [];
  const annualExpiring3DaysCount = dashboard.annualExpiring3DaysCount || 0;
  const annualExpiring3DaysList = dashboard.annualExpiring3DaysList || [];
  const annualExpiringTodayCount = dashboard.annualExpiringTodayCount || 0;
  const annualExpiringTodayList = dashboard.annualExpiringTodayList || [];
  const annualExpiredThisMonthCount = dashboard.annualExpiredThisMonthCount || dashboard.annualCancellationsCount || 0;
  const annualExpiredThisMonthList = dashboard.annualExpiredThisMonthList || dashboard.annualCancellationsList || [];
  const newAnnualThisMonthCount = dashboard.newAnnualThisMonthCount || 0;
  const newAnnualThisMonthList = dashboard.newAnnualThisMonthList || [];
  const annualRenewalsThisMonthCount = dashboard.annualRenewalsThisMonthCount || 0;
  const annualRenewalsThisMonthList = dashboard.annualRenewalsThisMonthList || [];

  // Bloque 3: Histórico, Visitantes y Asistencias
  const allAnnualExpiredCount = dashboard.allAnnualExpiredCount || 0;
  const allAnnualExpiredList = dashboard.allAnnualExpiredList || [];
  const totalClients = dashboard.totalClients || 0;
  const totalClientsList = dashboard.totalClientsList || [];
  const todayVisitors = dashboard.todayVisitors || 0;
  const todayVisitorsList = dashboard.todayVisitorsList || [];
  const monthVisitorsCount = dashboard.monthVisitorsCount || 0;
  const monthVisitorsList = dashboard.monthVisitorsList || [];
  const todayAttendance = dashboard.todayAttendance || { total: 0, recent: [], all: [] };
  const transferControl = dashboard.transferControl || { used: 0, limit: 30000, remaining: 30000, percentage: 0 };

  // Mapeos para detalles custom
  const mappedTodayVisitorsList = todayVisitorsList.map(visitor => ({ ...visitor, plan_name: 'Visita (Día)' }));
  const mappedMonthVisitorsList = monthVisitorsList.map(visitor => ({ ...visitor, plan_name: 'Visita (Mes)' }));
  const mappedRenewalsList = renewalsThisMonthList.map(renewal => ({
    ...renewal,
    plan_name: renewal.plan_name ? `Renovación (${renewal.plan_name})` : 'Renovación Mensual'
  }));
  const mappedAnnualRenewalsList = annualRenewalsThisMonthList.map(renewal => ({
    ...renewal,
    plan_name: renewal.plan_name ? `Renovación Anualidad (${renewal.plan_name})` : 'Renovación Anualidad'
  }));
  const mappedNewAnnualList = newAnnualThisMonthList.map(item => ({
    ...item,
    plan_name: item.plan_name ? `Nueva Anualidad (${item.plan_name})` : 'Nueva Anualidad'
  }));

  // Listas filtradas
  const filteredActive = filterItems(activeClientsList, searchTerm);
  const filteredExpiring3Days = filterItems(expiring3Days, searchTerm);
  const filteredExpiringToday = filterItems(expiringToday, searchTerm);
  const filteredExpired = filterItems(expiredClients, searchTerm);
  const filteredNewClients = filterItems(newClientsThisMonthList, searchTerm);
  const filteredRenewals = filterItems(mappedRenewalsList, searchTerm);

  const filteredActiveAnnual = filterItems(activeAnnualList, searchTerm);
  const filteredAnnualExpiring3Days = filterItems(annualExpiring3DaysList, searchTerm);
  const filteredAnnualExpiringToday = filterItems(annualExpiringTodayList, searchTerm);
  const filteredAnnualExpiredThisMonth = filterItems(annualExpiredThisMonthList, searchTerm);
  const filteredNewAnnual = filterItems(mappedNewAnnualList, searchTerm);
  const filteredAnnualRenewals = filterItems(mappedAnnualRenewalsList, searchTerm);

  const filteredAllAnnualExpired = filterItems(allAnnualExpiredList, searchTerm);
  const filteredTotalClients = filterItems(totalClientsList, searchTerm);
  const filteredTodayVisitors = filterItems(mappedTodayVisitorsList, searchTerm);
  const filteredMonthVisitors = filterItems(mappedMonthVisitorsList, searchTerm);
  const filteredAttendance = filterItems(todayAttendance.all, searchTerm);

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

  const handleRenew = (client, tab = 'monthly') => {
    navigate('/clients', { state: { renewClientId: client?.id, renewTab: tab } });
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
    <div className="min-h-screen p-6 space-y-8 bg-[var(--color-surface)]">
      {/* Header */}
      <PageHeader
        icon={<IconLayoutDashboard size={18} />}
        tag="Dashboard"
        title="Control del gimnasio"
        subtitle="Visión general de clientes, pagos y asistencias."
        actions={
          <>
            <GymButton icon={<IconChartBar size={18} />} variant="secondary" onClick={() => navigate('/statistics')}>Ver Informe</GymButton>
            <GymButton icon={<IconSpeakerphone size={18} />} variant="primary" onClick={() => toast('Funcionalidad de avisos masivos en construcción', { icon: <IconAlertTriangle size={20} /> })}>Enviar Aviso</GymButton>
          </>
        }
      />

      {/* TARJETAS DEL DASHBOARD */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {/* 1. Clientes Activos */}
        <div onClick={() => toggleSection('active')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'active' ? 'ring-2 ring-[var(--color-success)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Clientes Activos" subtitle="Con anualidad y mensualidad" variant="success" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{activeCount}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Vigencia activa.</p>
          </GymCard>
        </div>

        {/* 2. Vencen en 3 días */}
        <div onClick={() => toggleSection('expiring3Days')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'expiring3Days' ? 'ring-2 ring-[var(--color-warning)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Vencen en 3 días" subtitle={`${expiring3Days.length} clientes`} variant="warning" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{expiring3Days.length}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Mensualidades por vencer.</p>
          </GymCard>
        </div>

        {/* 3. Vencen hoy */}
        <div onClick={() => toggleSection('expiringToday')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'expiringToday' ? 'ring-2 ring-[var(--color-danger)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Vencen hoy" subtitle={`${expiringToday.length} clientes`} variant="danger" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{expiringToday.length}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Acción inmediata.</p>
          </GymCard>
        </div>

        {/* 4. Vencidos */}
        <div onClick={() => toggleSection('expired')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'expired' ? 'ring-2 ring-[var(--color-text-muted)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Vencidos" subtitle="Mes actual" variant="default" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{expiredClients.length}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Mensualidades vencidas este mes.</p>
          </GymCard>
        </div>

        {/* 5. Nuevos Clientes */}
        <div onClick={() => toggleSection('newClients')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'newClients' ? 'ring-2 ring-[var(--color-secondary)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Nuevos Clientes" subtitle="Mes actual" variant="default" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{newClientsThisMonth}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Registrados este mes.</p>
          </GymCard>
        </div>

        {/* 6. Renovaciones */}
        <div onClick={() => toggleSection('renewals')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'renewals' ? 'ring-2 ring-[var(--color-success)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Renovaciones" subtitle="Mes actual" variant="success" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{renewalsThisMonth}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Pagos mensuales.</p>
          </GymCard>
        </div>

        {/* 7. Anualidades Activas */}
        <div onClick={() => toggleSection('activeAnnual')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'activeAnnual' ? 'ring-2 ring-[var(--color-success)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Anualidades Activas" subtitle="Vigentes" variant="success" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{activeAnnualCount}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Inscripciones vigentes.</p>
          </GymCard>
        </div>

        {/* 8. Anualidades por Vencer */}
        <div onClick={() => toggleSection('annualExpiring3Days')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'annualExpiring3Days' ? 'ring-2 ring-[var(--color-warning)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Anualidades por Vencer" subtitle="Próximos 3 días" variant="warning" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{annualExpiring3DaysCount}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Próximos vencimientos.</p>
          </GymCard>
        </div>

        {/* 9. Anualidad Vence Hoy */}
        <div onClick={() => toggleSection('annualExpiringToday')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'annualExpiringToday' ? 'ring-2 ring-[var(--color-danger)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Anualidad Vence Hoy" subtitle="Expiran hoy" variant="danger" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{annualExpiringTodayCount}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Acción inmediata.</p>
          </GymCard>
        </div>

        {/* 10. Anualidades Vencidas */}
        <div onClick={() => toggleSection('annualExpiredThisMonth')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'annualExpiredThisMonth' ? 'ring-2 ring-[var(--color-text-muted)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Anualidades Vencidas" subtitle="Mes actual" variant="default" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{annualExpiredThisMonthCount}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Vencidas este mes.</p>
          </GymCard>
        </div>

        {/* 11. Nuevas Anualidades */}
        <div onClick={() => toggleSection('newAnnual')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'newAnnual' ? 'ring-2 ring-[var(--color-secondary)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Nuevas Anualidades" subtitle="Mes actual" variant="default" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{newAnnualThisMonthCount}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Inscripciones pagadas.</p>
          </GymCard>
        </div>

        {/* 12. Renovaciones Anualidades */}
        <div onClick={() => toggleSection('annualRenewals')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'annualRenewals' ? 'ring-2 ring-[var(--color-success)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Renovaciones Anualidades" subtitle="Mes actual" variant="success" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{annualRenewalsThisMonthCount}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Renovadas este mes.</p>
          </GymCard>
        </div>

        {/* 13. Todas las Anualidades Vencidas */}
        <div onClick={() => toggleSection('allAnnualExpired')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'allAnnualExpired' ? 'ring-2 ring-[var(--color-text-muted)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Todas Anualidades Vencidas" subtitle="Histórico" variant="default" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{allAnnualExpiredCount}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Vencidas históricamente.</p>
          </GymCard>
        </div>

        {/* 14. Clientes Totales */}
        <div onClick={() => toggleSection('totalClients')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'totalClients' ? 'ring-2 ring-[var(--color-secondary)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Clientes Totales" subtitle="Histórico" variant="default" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{totalClients}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Todos los registrados.</p>
          </GymCard>
        </div>

        {/* 15. Visitantes (Día) */}
        <div onClick={() => toggleSection('todayVisitors')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'todayVisitors' ? 'ring-2 ring-[var(--color-secondary)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Visitantes (Día)" subtitle="Día actual" variant="default" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{todayVisitors}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Visitas vendidas hoy.</p>
          </GymCard>
        </div>

        {/* 16. Visitantes (Mes) */}
        <div onClick={() => toggleSection('monthVisitors')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'monthVisitors' ? 'ring-2 ring-[var(--color-secondary)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Visitantes (Mes)" subtitle="Mes actual" variant="default" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{monthVisitorsCount}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Visitas este mes.</p>
          </GymCard>
        </div>

        {/* 17. Asistencias */}
        <div onClick={() => toggleSection('attendance')} className={`cursor-pointer transition-transform hover:scale-[1.02] ${expandedSection === 'attendance' ? 'ring-2 ring-[var(--color-secondary)] rounded-[var(--radius-lg)]' : ''}`}>
          <GymCard title="Asistencias" subtitle="Día actual" variant="default" className="h-full">
            <div className="text-4xl font-bold text-[var(--color-text)]">{todayAttendance.total}</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Entradas al gym hoy.</p>
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
                    expandedSection === 'active' ? 'Lista de Clientes Activos (Anualidad y Mensualidad)' :
                    expandedSection === 'expiring3Days' ? 'Clientes que vencen en 3 días (Mensualidad)' :
                    expandedSection === 'expiringToday' ? 'Clientes que vencen hoy (Mensualidad)' :
                    expandedSection === 'expired' ? 'Clientes con mensualidad vencida en el mes actual' :
                    expandedSection === 'newClients' ? 'Nuevos Clientes del Mes' :
                    expandedSection === 'renewals' ? 'Renovaciones de Mensualidad del Mes' :
                    expandedSection === 'activeAnnual' ? 'Lista de Anualidades Activas' :
                    expandedSection === 'annualExpiring3Days' ? 'Anualidades por Vencer en los Próximos 3 Días' :
                    expandedSection === 'annualExpiringToday' ? 'Anualidades que Vencen Hoy' :
                    expandedSection === 'annualExpiredThisMonth' ? 'Anualidades Vencidas en el Mes Actual' :
                    expandedSection === 'newAnnual' ? 'Nuevas Anualidades del Mes' :
                    expandedSection === 'annualRenewals' ? 'Renovaciones de Anualidad del Mes' :
                    expandedSection === 'allAnnualExpired' ? 'Todas las Anualidades Vencidas (Histórico)' :
                    expandedSection === 'totalClients' ? 'Lista de Clientes Totales' :
                    expandedSection === 'todayVisitors' ? 'Lista de Visitantes del Día' :
                    expandedSection === 'monthVisitors' ? 'Lista de Visitantes del Mes' :
                    expandedSection === 'attendance' ? 'Registro de Asistencias de hoy' : ''
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

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 mt-4">
                    {/* BLOQUE 1 */}
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
                      <ClientRow key={client.id} client={client} onAction={(c) => handleRenew(c, 'monthly')} actionLabel="Renovar" actionVariant="success" actionIcon={<IconCreditCard size={18} />} />
                    ))}

                    {expandedSection === 'expired' && filteredExpired.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay clientes vencidos.'}</p>
                    )}
                    {expandedSection === 'expired' && filteredExpired.map(client => (
                      <ClientRow key={client.id} client={client} onAction={(c) => handleRenew(c, 'monthly')} actionLabel="Renovar" actionVariant="success" actionIcon={<IconCreditCard size={18} />} />
                    ))}

                    {expandedSection === 'newClients' && filteredNewClients.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay clientes nuevos este mes.'}</p>
                    )}
                    {expandedSection === 'newClients' && filteredNewClients.map(client => (
                      <ClientRow key={client.id} client={client} />
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
                            ? `Periodo: ${new Date(renewal.start_date).toLocaleDateString('es-MX')} al ${new Date(renewal.end_date).toLocaleDateString('es-MX')}`
                            : ''
                        }
                      />
                    ))}

                    {/* BLOQUE 2 */}
                    {expandedSection === 'activeAnnual' && filteredActiveAnnual.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay anualidades activas.'}</p>
                    )}
                    {expandedSection === 'activeAnnual' && filteredActiveAnnual.map(client => (
                      <ClientRow key={client.id} client={client} />
                    ))}

                    {expandedSection === 'annualExpiring3Days' && filteredAnnualExpiring3Days.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay anualidades por vencer en los próximos 3 días.'}</p>
                    )}
                    {expandedSection === 'annualExpiring3Days' && filteredAnnualExpiring3Days.map(client => (
                      <ClientRow key={client.id} client={client} onAction={(c) => handleRenew(c, 'enrollment')} actionLabel="Renovar" actionVariant="success" actionIcon={<IconCreditCard size={18} />} />
                    ))}

                    {expandedSection === 'annualExpiringToday' && filteredAnnualExpiringToday.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay anualidades que me ven hoy.'}</p>
                    )}
                    {expandedSection === 'annualExpiringToday' && filteredAnnualExpiringToday.map(client => (
                      <ClientRow key={client.id} client={client} onAction={(c) => handleRenew(c, 'enrollment')} actionLabel="Renovar" actionVariant="success" actionIcon={<IconCreditCard size={18} />} />
                    ))}

                    {expandedSection === 'annualExpiredThisMonth' && filteredAnnualExpiredThisMonth.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay anualidades vencidas este mes.'}</p>
                    )}
                    {expandedSection === 'annualExpiredThisMonth' && filteredAnnualExpiredThisMonth.map(client => (
                      <ClientRow key={client.id} client={client} onAction={(c) => handleRenew(c, 'enrollment')} actionLabel="Renovar" actionVariant="success" actionIcon={<IconCreditCard size={18} />} />
                    ))}

                    {expandedSection === 'newAnnual' && filteredNewAnnual.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay nuevas anualidades este mes.'}</p>
                    )}
                    {expandedSection === 'newAnnual' && filteredNewAnnual.map(client => (
                      <ClientRow key={client.id} client={client} />
                    ))}

                    {expandedSection === 'annualRenewals' && filteredAnnualRenewals.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay renovaciones de anualidad este mes.'}</p>
                    )}
                    {expandedSection === 'annualRenewals' && filteredAnnualRenewals.map(client => (
                      <ClientRow key={client.id} client={client} />
                    ))}

                    {/* BLOQUE 3 */}
                    {expandedSection === 'allAnnualExpired' && filteredAllAnnualExpired.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay anualidades vencidas registradas.'}</p>
                    )}
                    {expandedSection === 'allAnnualExpired' && filteredAllAnnualExpired.map(client => (
                      <ClientRow key={client.id} client={client} onAction={(c) => handleRenew(c, 'enrollment')} actionLabel="Renovar" actionVariant="success" actionIcon={<IconCreditCard size={18} />} />
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

                    {expandedSection === 'monthVisitors' && filteredMonthVisitors.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay visitantes este mes.'}</p>
                    )}
                    {expandedSection === 'monthVisitors' && filteredMonthVisitors.map(visitor => (
                      <ClientRow key={visitor.id} client={visitor} />
                    ))}

                    {expandedSection === 'attendance' && filteredAttendance.length === 0 && (
                      <p className="text-[var(--color-text-muted)]">{searchTerm ? 'No se encontraron resultados.' : 'No hay asistencias registradas hoy.'}</p>
                    )}
                    {expandedSection === 'attendance' && filteredAttendance.map(record => (
                      <AttendanceRow key={record.id} record={record} />
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
    </div>
  );
}