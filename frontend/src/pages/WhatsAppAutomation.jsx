import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { GymCard } from '../components/ui/GymCard';
import { GymButton } from '../components/ui/GymButton';
import {
  IconBrandWhatsapp,
  IconCheck,
  IconAlertCircle,
  IconSend,
  IconRefresh,
  IconBuildingStore,
  IconStethoscope,
  IconHistory,
  IconSettings,
  IconPlayerPlay,
  IconCalendar,
  IconClock,
  IconUser,
  IconShieldCheck,
  IconGift,
  IconUserX,
  IconCake,
  IconPhoto,
  IconUsers,
  IconMessage
} from '@tabler/icons-react';

const renderGroupIcon = (iconKey) => {
  const props = { className: "text-white shrink-0", size: 20 };
  switch (iconKey) {
    case 'clock': return <IconClock {...props} />;
    case 'calendar': return <IconCalendar {...props} />;
    case 'alert': return <IconAlertCircle {...props} />;
    case 'send': return <IconSend {...props} />;
    case 'userX': return <IconUserX {...props} />;
    case 'cake': return <IconCake {...props} />;
    case 'stethoscope': return <IconStethoscope {...props} />;
    default: return <IconBrandWhatsapp {...props} />;
  }
};

// Esquema de las 11 Tarjetas Fijadas por Clasificación (Separando Mensualidad y Anualidad)
const FIXED_GROUPS_SCHEMA = [
  {
    id: 'expiring_3d_monthly',
    title: 'Mensualidades por Vencer (1 a 3 Días)',
    subtitle: 'Clientes cuya mensualidad caduca entre 1 y 3 días futuros',
    type: 'CLIENT_EXPIRING_3D_MONTHLY',
    entity_type: 'gym',
    iconKey: 'clock',
    default_template: 'Hola {{name}}! 🏋️ Te recordamos que tu mensualidad en Pimpon Gym vence pronto. ¡Renueva a tiempo para seguir entrenando!',
  },
  {
    id: 'expiring_3d_annual',
    title: 'Anualidades por Vencer (1 a 3 Días)',
    subtitle: 'Socios cuya anualidad caduca entre 1 y 3 días futuros',
    type: 'CLIENT_EXPIRING_3D_ANNUAL',
    entity_type: 'gym',
    iconKey: 'calendar',
    default_template: 'Hola {{name}}! 🏆 Te recordamos que tu anualidad en Pimpon Gym vence pronto. ¡Gracias por formar parte de nuestra familia! Acércate a recepción para renovarla.',
  },
  {
    id: 'expired_today_monthly',
    title: 'Mensualidades que Vencen Hoy',
    subtitle: 'Clientes cuya mensualidad vence el día de hoy exacto',
    type: 'CLIENT_EXPIRED_TODAY_MONTHLY',
    entity_type: 'gym',
    iconKey: 'alert',
    default_template: 'Hola {{name}}! ⚠️ Tu mensualidad en Pimpon Gym vence el día de hoy. Acércate a recepción o contáctanos para renovar tu acceso.',
  },
  {
    id: 'expired_today_annual',
    title: 'Anualidades que Vencen Hoy',
    subtitle: 'Socios cuya anualidad vence el día de hoy exacto',
    type: 'CLIENT_EXPIRED_TODAY_ANNUAL',
    entity_type: 'gym',
    iconKey: 'alert',
    default_template: 'Hola {{name}}! 🎉 Hoy se cumple tu año de entrenamiento en Pimpon Gym. Pasa a recepción para renovar tu anualidad.',
  },
  {
    id: 'expired_past_monthly',
    title: 'Mensualidades Vencidas (Pasadas)',
    subtitle: 'Clientes cuya mensualidad venció en días pasados y no han renovado',
    type: 'CLIENT_RENEWAL_PROMO',
    entity_type: 'gym',
    iconKey: 'send',
    default_template: 'Hola {{name}}! 💪 Te extrañamos en Pimpon Gym. Tu mensualidad se encuentra vencida. ¡Tenemos una promoción especial para que vuelvas a entrenar hoy!',
  },
  {
    id: 'expired_past_annual',
    title: 'Anualidades Vencidas (Pasadas)',
    subtitle: 'Socios cuya anualidad venció en días pasados y no han renovado',
    type: 'CLIENT_RENEWAL_PROMO',
    entity_type: 'gym',
    iconKey: 'send',
    default_template: 'Hola {{name}}! 🏆 Te extrañamos en Pimpon Gym. Tu anualidad se encuentra vencida. ¡Contáctanos para renovarla con beneficio especial!',
  },
  {
    id: 'inactivity_15d',
    title: 'Inactividad de 15+ Días (Gimnasio)',
    subtitle: 'Socios sin asistencias registradas en los últimos 15 días',
    type: 'CLIENT_INACTIVITY_15D',
    entity_type: 'gym',
    iconKey: 'userX',
    default_template: 'Hola {{name}}! 👋 Notamos que hace más de 15 días no nos visitas en Pimpon Gym. ¿Todo bien? ¡Te esperamos de vuelta!',
  },
  {
    id: 'birthdays_clients',
    title: 'Cumpleaños de Hoy (Clientes)',
    subtitle: 'Socios del gimnasio que cumplen años hoy',
    type: 'CLIENT_BIRTHDAY',
    entity_type: 'gym',
    iconKey: 'cake',
    default_template: '🎂 ¡Feliz Cumpleaños {{name}}! Todo el equipo de Pimpon Gym te desea un excelente día lleno de salud y energía.',
  },
  {
    id: 'appointments_1d',
    title: 'Citas de Nutrición Mañana (Pacientes)',
    subtitle: 'Pacientes con cita agendada para el día de mañana',
    type: 'PATIENT_APPOINTMENT_1D',
    entity_type: 'consultorio',
    iconKey: 'stethoscope',
    default_template: 'Hola {{name}}! 🍏 Te recordamos tu cita de nutrición agendada para mañana en Pimpon Consultorio. Por favor confírmanos tu asistencia.',
  },
  {
    id: 'appointments_today',
    title: 'Citas de Nutrición Hoy (Pacientes)',
    subtitle: 'Pacientes con cita programada para el día de hoy',
    type: 'PATIENT_APPOINTMENT_TODAY',
    entity_type: 'consultorio',
    iconKey: 'stethoscope',
    default_template: 'Hola {{name}}! ⏰ Hoy es tu cita de nutrición en Pimpon Consultorio. ¡Te esperamos puntual!',
  },
  {
    id: 'birthdays_patients',
    title: 'Cumpleaños de Hoy (Pacientes)',
    subtitle: 'Pacientes del consultorio que cumplen años hoy',
    type: 'PATIENT_BIRTHDAY',
    entity_type: 'consultorio',
    iconKey: 'cake',
    default_template: '🎂 ¡Feliz Cumpleaños {{name}}! Tu equipo de nutrición en Pimpon te desea un año repleto de salud, metas cumplidas y gran bienestar.',
  },
];

export default function WhatsAppAutomation() {
  const [activeTab, setActiveTab] = useState('pending_queues');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingPhone, setTestingPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [manualTriggering, setManualTriggering] = useState(false);

  // Configuración de WhatsApp
  const [config, setConfig] = useState({
    enabled: true,
    mode: 'test_mode',
    sendScheduleTime: '08:30',
    metaConfig: {
      accessToken: '',
      phoneNumberId: '',
      wabaId: ''
    },
    rules: {
      CLIENT_EXPIRING_3D_MONTHLY: { enabled: true, name: 'Recordatorio 3 días antes de vencer mensualidad' },
      CLIENT_EXPIRING_3D_ANNUAL: { enabled: true, name: 'Recordatorio 3 días antes de vencer anualidad' },
      CLIENT_EXPIRED_TODAY_MONTHLY: { enabled: true, name: 'Aviso de vencimiento de mensualidad el mismo día' },
      CLIENT_EXPIRED_TODAY_ANNUAL: { enabled: true, name: 'Aviso de vencimiento de anualidad el mismo día' },
      CLIENT_RENEWAL_PROMO: { enabled: true, name: 'Promoción de reenganche para membresías vencidas' },
      CLIENT_STREAK_6M: { enabled: true, name: 'Incentivo por 6 meses consecutivos ininterrumpidos' },
      CLIENT_INACTIVITY_15D: { enabled: true, name: 'Seguimiento por inactividad (>15 días sin asistencias)' },
      CLIENT_BIRTHDAY: { enabled: true, name: 'Felicitación de cumpleaños a clientes del gimnasio' },
      CLIENT_PROMO_EVENT: { enabled: true, name: 'Difusión de promociones y eventos generales' },
      PATIENT_APPOINTMENT_1D: { enabled: true, name: 'Recordatorio de cita de nutrición 1 día antes' },
      PATIENT_APPOINTMENT_TODAY: { enabled: true, name: 'Recordatorio de cita de nutrición el mismo día' },
      PATIENT_NUTRITION_PLAN_JPG: { enabled: true, name: 'Envío de plan nutricional en JPG descargable' },
      PATIENT_EXERCISE_PLAN_JPG: { enabled: true, name: 'Envío de plan de ejercicios en JPG descargable' },
      PATIENT_BIRTHDAY: { enabled: true, name: 'Felicitación de cumpleaños a pacientes del consultorio' },
      PATIENT_PROMO_EVENT: { enabled: true, name: 'Avisos de promociones y eventos para pacientes' }
    }
  });

  // Historial de envíos
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Listas de destinatarios pendientes
  const [pendingGroups, setPendingGroups] = useState(() =>
    FIXED_GROUPS_SCHEMA.map(schema => ({ ...schema, items: [] }))
  );
  const [loadingPending, setLoadingPending] = useState(false);
  const [selectedItemsMap, setSelectedItemsMap] = useState({}); // { [groupId]: Set(itemId) }
  const [sendingGroupMap, setSendingGroupMap] = useState({}); // { [groupId]: boolean }
  const [customMsgMap, setCustomMsgMap] = useState({}); // { [groupId]: string }

  useEffect(() => {
    fetchConfig();
    fetchHistory();
    fetchPendingTargets();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/config/whatsapp');
      if (res.data?.data) {
        setConfig((prev) => ({
          ...prev,
          ...res.data.data,
          metaConfig: {
            ...prev.metaConfig,
            ...(res.data.data.metaConfig || {})
          },
          rules: {
            ...prev.rules,
            ...(res.data.data.rules || {})
          }
        }));
      }
    } catch (err) {
      console.error('Error al cargar configuración:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get('/notifications/history?limit=50');
      if (res.data?.data) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.error('Error al cargar historial:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchPendingTargets = async () => {
    try {
      setLoadingPending(true);
      const res = await api.get('/notifications/pending');
      
      const serverGroups = res.data?.data?.groups || [];
      const serverGroupMap = {};
      serverGroups.forEach(g => { serverGroupMap[g.id] = g; });

      // Fusionar asegurando que LAS 11 TARJETAS PERMANEZCAN SIEMPRE FIJAS
      const mergedGroups = FIXED_GROUPS_SCHEMA.map(schema => {
        const found = serverGroupMap[schema.id];
        return {
          ...schema,
          title: (found?.title || schema.title).replace(/^📌\s*/, ''),
          subtitle: found?.subtitle || schema.subtitle,
          type: found?.type || schema.type,
          entity_type: found?.entity_type || schema.entity_type,
          default_template: found?.default_template || schema.default_template,
          items: found?.items || [],
        };
      });

      setPendingGroups(mergedGroups);

      // Inicializar plantilla personalizable por defecto si no ha sido editada
      const initialCustomMsgMap = { ...customMsgMap };
      mergedGroups.forEach(group => {
        if (initialCustomMsgMap[group.id] === undefined) {
          initialCustomMsgMap[group.id] = group.default_template || '';
        }
      });
      setCustomMsgMap(initialCustomMsgMap);

      // Por defecto, seleccionar todos los ítems disponibles en cada tarjeta
      const initialSelectedMap = {};
      mergedGroups.forEach(group => {
        const itemIds = new Set(group.items.map(item => item.id));
        initialSelectedMap[group.id] = itemIds;
      });
      setSelectedItemsMap(initialSelectedMap);

    } catch (err) {
      console.error('Error al cargar listas pendientes:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleSaveConfig = async (newConfig = config) => {
    try {
      setSaving(true);
      const res = await api.put('/config/whatsapp', newConfig);
      if (res.status === 200 || res.data?.data) {
        toast.success('Configuración guardada correctamente');
        if (res.data?.data) {
          setConfig((prev) => ({ ...prev, ...res.data.data }));
        }
      }
    } catch (err) {
      console.error('Error al guardar:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Error al guardar la configuración';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = (ruleKey) => {
    const updatedRules = {
      ...config.rules,
      [ruleKey]: {
        ...config.rules[ruleKey],
        enabled: !config.rules[ruleKey]?.enabled
      }
    };
    const updatedConfig = { ...config, rules: updatedRules };
    setConfig(updatedConfig);
    handleSaveConfig(updatedConfig);
  };

  const handleSendTest = async (useTemplate = false) => {
    if (!testingPhone) {
      toast.error('Ingresa un número celular para la prueba');
      return;
    }
    try {
      setTestSending(true);
      const res = await api.post('/notifications/test', { phone: testingPhone, useTemplate });
      if (res.data?.success) {
        toast.success(useTemplate ? '¡Plantilla hello_world enviada con éxito!' : '¡Mensaje de prueba enviado con éxito!');
        fetchHistory();
      } else {
        toast.error(res.data?.error || 'Error enviando mensaje de prueba');
      }
    } catch (err) {
      console.error('Error enviando prueba:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Error al enviar prueba';
      toast.error(errorMsg);
    } finally {
      setTestSending(false);
    }
  };

  const handleTriggerManualCron = async () => {
    try {
      setManualTriggering(true);
      const res = await api.post('/config/whatsapp/trigger-cron');
      if (res.data?.success) {
        toast.success('Automatizaciones ejecutadas manualmente. Revisa el historial.');
        setTimeout(() => {
          fetchHistory();
          fetchPendingTargets();
        }, 1500);
      } else {
        toast.error(res.data?.error || 'Error al ejecutar automatizaciones');
      }
    } catch (err) {
      console.error('Error al ejecutar cron manual:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Fallo de conexión';
      toast.error(errorMsg);
    } finally {
      setManualTriggering(false);
    }
  };

  // Manejo de Selección Multicasilla por Tarjeta
  const handleToggleSelectAllGroup = (groupId, groupItems) => {
    const currentSelected = selectedItemsMap[groupId] || new Set();
    const newSelected = new Set();

    if (currentSelected.size < groupItems.length) {
      groupItems.forEach(item => newSelected.add(item.id));
    }

    setSelectedItemsMap({
      ...selectedItemsMap,
      [groupId]: newSelected
    });
  };

  const handleToggleSelectItem = (groupId, itemId) => {
    const currentSelected = new Set(selectedItemsMap[groupId] || []);
    if (currentSelected.has(itemId)) {
      currentSelected.delete(itemId);
    } else {
      currentSelected.add(itemId);
    }
    setSelectedItemsMap({
      ...selectedItemsMap,
      [groupId]: currentSelected
    });
  };

  // Envío Masivo para una Tarjeta Especifica
  const handleBulkSendGroup = async (group) => {
    const selectedIds = selectedItemsMap[group.id] || new Set();
    const itemsToSend = group.items.filter(item => selectedIds.has(item.id));

    if (itemsToSend.length === 0) {
      toast.error('Selecciona al menos un destinatario de la lista para enviar.');
      return;
    }

    try {
      setSendingGroupMap(prev => ({ ...prev, [group.id]: true }));
      const res = await api.post('/notifications/send-bulk', {
        items: itemsToSend,
        custom_message: customMsgMap[group.id] || group.default_template || null,
      });

      if (res.data?.data) {
        toast.success(`¡Enviados ${res.data.data.success_count} de ${res.data.data.total} mensajes correctamente!`);
        fetchHistory();
        fetchPendingTargets();
      } else {
        toast.error('Error al realizar el envío masivo');
      }
    } catch (err) {
      console.error('Error al enviar masivo:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Fallo de conexión en envío masivo';
      toast.error(errorMsg);
    } finally {
      setSendingGroupMap(prev => ({ ...prev, [group.id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-[var(--color-surface)] flex flex-col items-center justify-center gap-3">
        <IconRefresh className="animate-spin text-[var(--color-gold)]" size={36} />
        <p className="text-sm font-semibold text-[var(--color-text-muted)]">Cargando Automatizaciones de WhatsApp...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-[var(--color-surface)] space-y-6">
      {/* HEADER DE LA PÁGINA */}
      <PageHeader
        icon={<IconBrandWhatsapp size={18} />}
        tag="Canal de Notificaciones"
        title="Automatizaciones de WhatsApp"
        subtitle="Recordatorios automáticos, renovación de membresías, citas, inactividad y cumpleaños."
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border ${config.mode === 'meta_cloud_api' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}`}>
              {config.mode === 'meta_cloud_api' ? '● Meta Cloud API (Oficial)' : '● Modo Prueba / Simulación'}
            </span>

            <GymButton
              variant="warning"
              size="sm"
              loading={manualTriggering}
              icon={<IconPlayerPlay size={16} />}
              onClick={handleTriggerManualCron}
            >
              Ejecutar Automatizaciones Ahora
            </GymButton>
          </div>
        }
      />

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('pending_queues')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-xs font-bold transition-all cursor-pointer ${activeTab === 'pending_queues' ? 'bg-[var(--color-gold)] text-white shadow-sm font-extrabold' : 'bg-[var(--color-card-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'}`}
        >
          <IconUsers size={18} />
          <span>Envíos Masivos & Listas</span>
        </button>

        <button
          onClick={() => setActiveTab('rules_gym')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-xs font-bold transition-all cursor-pointer ${activeTab === 'rules_gym' ? 'bg-[var(--color-gold)] text-white shadow-sm font-extrabold' : 'bg-[var(--color-card-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'}`}
        >
          <IconBuildingStore size={18} />
          <span>Gimnasio (Clientes)</span>
        </button>

        <button
          onClick={() => setActiveTab('rules_patient')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-xs font-bold transition-all cursor-pointer ${activeTab === 'rules_patient' ? 'bg-[var(--color-gold)] text-white shadow-sm font-extrabold' : 'bg-[var(--color-card-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'}`}
        >
          <IconStethoscope size={18} />
          <span>Consultorio (Pacientes)</span>
        </button>

        <button
          onClick={() => setActiveTab('credentials')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-xs font-bold transition-all cursor-pointer ${activeTab === 'credentials' ? 'bg-[var(--color-gold)] text-white shadow-sm font-extrabold' : 'bg-[var(--color-card-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'}`}
        >
          <IconSettings size={18} />
          <span>Conexión & Meta API</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-xs font-bold transition-all cursor-pointer ${activeTab === 'history' ? 'bg-[var(--color-gold)] text-white shadow-sm font-extrabold' : 'bg-[var(--color-card-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'}`}
        >
          <IconHistory size={18} />
          <span>Historial de Envíos</span>
        </button>
      </div>

      {/* PESTAÑA: ENVÍOS MASIVOS Y LISTAS CON TARJETAS FIJADAS Y PLANTILLA DE MENSAJE EDITABLE */}
      {activeTab === 'pending_queues' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-[var(--color-card-alt)] p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <IconUsers className="text-[var(--color-gold)]" size={24} />
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text)]">Tarjetas de Envíos por Clasificación</h3>
                <p className="text-xs text-[var(--color-text-muted)]">Cada tarjeta representa una regla de envío con su plantilla editable. Marca los destinatarios y presiona "Enviar a Seleccionados".</p>
              </div>
            </div>

            <GymButton
              variant="secondary"
              size="sm"
              loading={loadingPending}
              icon={<IconRefresh size={16} />}
              onClick={fetchPendingTargets}
            >
              Actualizar Listas
            </GymButton>
          </div>

          {/* TARJETAS FIJAS EN GRID CON ÍCONOS TABLER NATIVOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pendingGroups.map((group) => {
              const selectedSet = selectedItemsMap[group.id] || new Set();
              const allSelected = group.items.length > 0 && selectedSet.size === group.items.length;
              const isSending = sendingGroupMap[group.id] || false;

              return (
                <GymCard
                  key={group.id}
                  title={
                    <div className="flex items-center gap-2 text-white">
                      {renderGroupIcon(group.iconKey)}
                      <span className="font-bold text-white">{group.title}</span>
                    </div>
                  }
                  subtitle={group.subtitle}
                  variant="default"
                  headerAction={
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${group.items.length > 0 ? 'bg-white/20 text-white border border-white/30' : 'bg-white/10 text-white/70 border border-white/20'}`}>
                        {group.items.length} pendientes
                      </span>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    {/* Plantilla de Mensaje Editable por Tarjeta */}
                    <div className="bg-[var(--color-surface)] p-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-bold">
                        <span className="flex items-center gap-1.5">
                          <IconMessage size={14} className="text-[var(--color-gold)]" />
                          <span>Plantilla del Mensaje a Enviar:</span>
                        </span>
                        <span className="text-[11px] text-[var(--color-text-muted)] font-mono font-normal">Variable: &#123;&#123;name&#125;&#125;</span>
                      </div>
                      <textarea
                        rows={2}
                        value={customMsgMap[group.id] !== undefined ? customMsgMap[group.id] : (group.default_template || '')}
                        onChange={(e) => setCustomMsgMap({ ...customMsgMap, [group.id]: e.target.value })}
                        className="w-full text-xs bg-[var(--color-card-alt)] border border-[var(--color-border)] text-[var(--color-text)] rounded-[var(--radius-sm)] p-2 focus:border-[var(--color-gold)] focus:outline-none"
                        placeholder="Escribe la plantilla del mensaje para esta tarjeta..."
                      />
                    </div>

                    {/* Controles de la Tarjeta (Seleccionar Todos / Enviar a Todos) */}
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] gap-2 flex-wrap">
                      <label className="flex items-center gap-2 text-xs font-bold text-[var(--color-text)] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          disabled={group.items.length === 0}
                          onChange={() => handleToggleSelectAllGroup(group.id, group.items)}
                          className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-gold)] focus:ring-[var(--color-gold)] cursor-pointer disabled:opacity-40"
                        />
                        <span>Marcar / Seleccionar Todos ({selectedSet.size}/{group.items.length})</span>
                      </label>

                      <GymButton
                        variant="warning"
                        size="xs"
                        disabled={selectedSet.size === 0}
                        loading={isSending}
                        icon={<IconSend size={14} />}
                        onClick={() => handleBulkSendGroup(group)}
                      >
                        Enviar a Seleccionados ({selectedSet.size})
                      </GymButton>
                    </div>

                    {/* Lista de Destinatarios con Casillas Individuales */}
                    {group.items.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[var(--color-text-muted)] italic bg-[var(--color-card-alt)]/30 rounded-[var(--radius-sm)] border border-[var(--color-border)]/50">
                        No hay clientes ni pacientes pendientes en esta clasificación hoy.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                        {group.items.map((item) => {
                          const isChecked = selectedSet.has(item.id);

                          return (
                            <div
                              key={item.id}
                              onClick={() => handleToggleSelectItem(group.id, item.id)}
                              className={`p-3 rounded-[var(--radius-sm)] border transition-all flex items-center justify-between gap-3 cursor-pointer ${isChecked ? 'bg-[var(--color-card-alt)] border-[var(--color-border)]' : 'bg-transparent border-transparent opacity-60 hover:opacity-100'}`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleToggleSelectItem(group.id, item.id);
                                  }}
                                  className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-gold)] focus:ring-[var(--color-gold)] cursor-pointer shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-[var(--color-text)] truncate">{item.name}</p>
                                  <p className="text-[11px] text-[var(--color-text-muted)] truncate">{item.details}</p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[11px] font-mono text-[var(--color-text-muted)] block">{item.phone}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </GymCard>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 1: REGLAS DE GIMNASIO (CLIENTES) */}
      {activeTab === 'rules_gym' && (
        <GymCard title="Reglas para Clientes del Gimnasio" subtitle="Recordatorios y fidelización" variant="default">
          <div className="space-y-4">
            <div className="p-4 rounded-[var(--radius-md)] bg-amber-500/10 border border-amber-500/20 text-xs text-[var(--color-text)] flex items-center gap-3">
              <IconShieldCheck size={24} className="shrink-0 text-[var(--color-gold)]" />
              <span>
                Las notificaciones para clientes se evalúan automáticamente todos los días a las <strong>{config.sendScheduleTime || '08:30'} AM</strong>. Activa o desactiva las reglas según lo requieras.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RuleItemCard
                icon={<IconClock size={20} className="text-[var(--color-gold)]" />}
                title="Vencimiento a 3 Días (Mensualidad)"
                desc="Notifica al cliente 3 días antes de que caduque su mensualidad para prevenir atrasos."
                enabled={config.rules?.CLIENT_EXPIRING_3D_MONTHLY?.enabled}
                onToggle={() => toggleRule('CLIENT_EXPIRING_3D_MONTHLY')}
              />

              <RuleItemCard
                icon={<IconCalendar size={20} className="text-[var(--color-gold)]" />}
                title="Vencimiento a 3 Días (Anualidad)"
                desc="Recordatorio amable a los socios anuales 3 días antes del fin de su anualidad."
                enabled={config.rules?.CLIENT_EXPIRING_3D_ANNUAL?.enabled}
                onToggle={() => toggleRule('CLIENT_EXPIRING_3D_ANNUAL')}
              />

              <RuleItemCard
                icon={<IconAlertCircle size={20} className="text-[var(--color-gold)]" />}
                title="Vence Hoy (Mensualidad)"
                desc="Mensaje urgente enviado el día exacto en que vence la membresía mensual."
                enabled={config.rules?.CLIENT_EXPIRED_TODAY_MONTHLY?.enabled}
                onToggle={() => toggleRule('CLIENT_EXPIRED_TODAY_MONTHLY')}
              />

              <RuleItemCard
                icon={<IconAlertCircle size={20} className="text-[var(--color-gold)]" />}
                title="Vence Hoy (Anualidad)"
                desc="Aviso de conclusión de anualidad el día exacto del vencimiento."
                enabled={config.rules?.CLIENT_EXPIRED_TODAY_ANNUAL?.enabled}
                onToggle={() => toggleRule('CLIENT_EXPIRED_TODAY_ANNUAL')}
              />

              <RuleItemCard
                icon={<IconSend size={20} className="text-emerald-500" />}
                title="Promoción para Membresías Vencidas"
                desc="Envío de oferta de reenganche a socios que llevan más de 7 días con mensualidad/anualidad vencida."
                enabled={config.rules?.CLIENT_RENEWAL_PROMO?.enabled}
                onToggle={() => toggleRule('CLIENT_RENEWAL_PROMO')}
              />

              <RuleItemCard
                icon={<IconGift size={20} className="text-purple-500" />}
                title="Incentivo por Racha de 6 Meses"
                desc="Premia a los clientes que hayan pagado 6 meses consecutivos ininterrumpidos con un aviso para reclamar su regalo en recepción."
                enabled={config.rules?.CLIENT_STREAK_6M?.enabled}
                onToggle={() => toggleRule('CLIENT_STREAK_6M')}
              />

              <RuleItemCard
                icon={<IconUserX size={20} className="text-red-500" />}
                title="Seguimiento por Inactividad (15+ días)"
                desc="Envía un mensaje cariñoso a clientes activos que no han registrado asistencia en el gym en más de 15 días."
                enabled={config.rules?.CLIENT_INACTIVITY_15D?.enabled}
                onToggle={() => toggleRule('CLIENT_INACTIVITY_15D')}
              />

              <RuleItemCard
                icon={<IconCake size={20} className="text-pink-500" />}
                title="Felicitación de Cumpleaños"
                desc="Mensaje automático en el día exacto del cumpleaños de los clientes del gimnasio."
                enabled={config.rules?.CLIENT_BIRTHDAY?.enabled}
                onToggle={() => toggleRule('CLIENT_BIRTHDAY')}
              />
            </div>
          </div>
        </GymCard>
      )}

      {/* TAB 2: REGLAS DE CONSULTORIO (PACIENTES) */}
      {activeTab === 'rules_patient' && (
        <GymCard title="Reglas para Pacientes del Consultorio" subtitle="Citas y envío de planes nutricionales" variant="default">
          <div className="space-y-4">
            <div className="p-4 rounded-[var(--radius-md)] bg-emerald-500/10 border border-emerald-500/20 text-xs text-[var(--color-text)] flex items-center gap-3">
              <IconStethoscope size={24} className="shrink-0 text-emerald-500" />
              <span>
                Gestión de recordatorios de citas y envío automático de planes de nutrición y ejercicio para pacientes.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RuleItemCard
                icon={<IconClock size={20} className="text-emerald-500" />}
                title="Recordatorio de Cita (1 Día Antes)"
                desc="Recordatorio enviado automáticamente 24 horas antes del horario de la cita de nutrición."
                enabled={config.rules?.PATIENT_APPOINTMENT_1D?.enabled}
                onToggle={() => toggleRule('PATIENT_APPOINTMENT_1D')}
              />

              <RuleItemCard
                icon={<IconCalendar size={20} className="text-emerald-500" />}
                title="Recordatorio de Cita (El Mismo Día)"
                desc="Aviso por la mañana el día de la cita con el horario programado del paciente."
                enabled={config.rules?.PATIENT_APPOINTMENT_TODAY?.enabled}
                onToggle={() => toggleRule('PATIENT_APPOINTMENT_TODAY')}
              />

              <RuleItemCard
                icon={<IconPhoto size={20} className="text-[var(--color-gold)]" />}
                title="Envío de Plan Nutricional (Imagen JPG)"
                desc="Permite enviar la imagen/PDF del plan de alimentación descargable por WhatsApp al paciente."
                enabled={config.rules?.PATIENT_NUTRITION_PLAN_JPG?.enabled}
                onToggle={() => toggleRule('PATIENT_NUTRITION_PLAN_JPG')}
              />

              <RuleItemCard
                icon={<IconPhoto size={20} className="text-purple-500" />}
                title="Envío de Plan de Ejercicios (Imagen JPG)"
                desc="Permite enviar el plan de rutinas en formato JPG descargable directamente al WhatsApp."
                enabled={config.rules?.PATIENT_EXERCISE_PLAN_JPG?.enabled}
                onToggle={() => toggleRule('PATIENT_EXERCISE_PLAN_JPG')}
              />

              <RuleItemCard
                icon={<IconCake size={20} className="text-pink-500" />}
                title="Felicitación de Cumpleaños a Pacientes"
                desc="Envía una felicitación en la fecha de nacimiento registrada del paciente."
                enabled={config.rules?.PATIENT_BIRTHDAY?.enabled}
                onToggle={() => toggleRule('PATIENT_BIRTHDAY')}
              />

              <RuleItemCard
                icon={<IconSend size={20} className="text-blue-500" />}
                title="Avisos y Promociones de Nutrición"
                desc="Permite difundir avisos de ofertas y nuevos servicios del consultorio a pacientes."
                enabled={config.rules?.PATIENT_PROMO_EVENT?.enabled}
                onToggle={() => toggleRule('PATIENT_PROMO_EVENT')}
              />
            </div>
          </div>
        </GymCard>
      )}

      {/* TAB 3: CONEXIÓN & META API CREDENTIALS */}
      {activeTab === 'credentials' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <GymCard title="Configuración de Meta WhatsApp Cloud API (Oficial)" subtitle="Datos de acceso a la Graph API de Meta" variant="default">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text)] mb-2">Modo de Operación</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...config, mode: 'test_mode' };
                        setConfig(updated);
                        handleSaveConfig(updated);
                      }}
                      className={`p-3.5 rounded-[var(--radius-md)] border text-xs font-bold transition-all text-left flex flex-col gap-1 cursor-pointer ${config.mode === 'test_mode' ? 'bg-amber-500/10 border-[var(--color-gold)] text-[var(--color-text)]' : 'bg-[var(--color-card-alt)] border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
                    >
                      <span>🧪 Modo Prueba / Simulación</span>
                      <span className="text-[11px] font-normal text-[var(--color-text-muted)]">Registra envíos en consola e historial sin consumir API real. Ideal para desarrollo.</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...config, mode: 'meta_cloud_api' };
                        setConfig(updated);
                        handleSaveConfig(updated);
                      }}
                      className={`p-3.5 rounded-[var(--radius-md)] border text-xs font-bold transition-all text-left flex flex-col gap-1 cursor-pointer ${config.mode === 'meta_cloud_api' ? 'bg-emerald-500/10 border-emerald-500 text-[var(--color-text)]' : 'bg-[var(--color-card-alt)] border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
                    >
                      <span>🚀 Meta Cloud API (Oficial)</span>
                      <span className="text-[11px] font-normal text-[var(--color-text-muted)]">Envío 100% oficial mediante WhatsApp Business Cloud API. 0% riesgo de baneo.</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-text)] mb-1">Access Token de Meta (Permanente o Temporal)</label>
                  <input
                    type="password"
                    value={config.metaConfig?.accessToken || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      metaConfig: { ...config.metaConfig, accessToken: e.target.value }
                    })}
                    placeholder="EAAG..."
                    className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] text-[var(--color-text)] text-xs focus:border-[var(--color-gold)] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text)] mb-1">Phone Number ID</label>
                    <input
                      type="text"
                      value={config.metaConfig?.phoneNumberId || ''}
                      onChange={(e) => setConfig({
                        ...config,
                        metaConfig: { ...config.metaConfig, phoneNumberId: e.target.value }
                      })}
                      placeholder="1049..."
                      className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] text-[var(--color-text)] text-xs focus:border-[var(--color-gold)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text)] mb-1">WABA Account ID (Opcional)</label>
                    <input
                      type="text"
                      value={config.metaConfig?.wabaId || ''}
                      onChange={(e) => setConfig({
                        ...config,
                        metaConfig: { ...config.metaConfig, wabaId: e.target.value }
                      })}
                      placeholder="1002..."
                      className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] text-[var(--color-text)] text-xs focus:border-[var(--color-gold)] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <GymButton
                    variant="primary"
                    className="w-full"
                    loading={saving}
                    onClick={() => handleSaveConfig()}
                  >
                    Guardar Credenciales de Meta
                  </GymButton>
                </div>
              </div>
            </GymCard>
          </div>

          {/* TARJETA DE PRUEBA DE ENVÍO DIRECTO */}
          <div>
            <GymCard title="Probar Envío de WhatsApp" subtitle="Prueba inmediata de canal" variant="default">
              <div className="space-y-4">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Envía un mensaje de prueba al número ingresado para verificar el correcto funcionamiento del canal.
                </p>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-text)] mb-1">Número Celular de Prueba</label>
                  <input
                    type="text"
                    value={testingPhone}
                    onChange={(e) => setTestingPhone(e.target.value)}
                    placeholder="Ej: 5512345678"
                    className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] text-[var(--color-text)] text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <GymButton
                    variant="success"
                    className="w-full text-xs"
                    loading={testSending}
                    icon={<IconSend size={16} />}
                    onClick={() => handleSendTest(false)}
                  >
                    Enviar Mensaje de Prueba
                  </GymButton>

                  <button
                    type="button"
                    disabled={testSending}
                    onClick={() => handleSendTest(true)}
                    className="w-full py-2 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>📑 Probar Plantilla Meta (hello_world)</span>
                  </button>
                </div>
              </div>
            </GymCard>
          </div>
        </div>
      )}

      {/* TAB 4: HISTORIAL DE ENVÍOS */}
      {activeTab === 'history' && (
        <GymCard title="Registro de Notificaciones Enviadas" subtitle="Logs en tiempo real" variant="default">
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <button
                onClick={fetchHistory}
                className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-card-alt)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-border)] transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                title="Recargar historial"
              >
                <IconRefresh size={16} className={loadingHistory ? 'animate-spin' : ''} />
                <span>Actualizar</span>
              </button>
            </div>

            {history.length === 0 ? (
              <div className="py-12 text-center text-[var(--color-text-muted)] text-xs">
                No hay registros de notificaciones enviadas aún.
              </div>
            ) : (
              <div className="overflow-x-auto border border-[var(--color-border)] rounded-[var(--radius-md)]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-card-alt)] border-b border-[var(--color-border)] text-[var(--color-text-muted)] font-bold">
                      <th className="py-3.5 px-4">Fecha y Hora</th>
                      <th className="py-3.5 px-4">Destinatario</th>
                      <th className="py-3.5 px-4">Teléfono</th>
                      <th className="py-3.5 px-4">Tipo</th>
                      <th className="py-3.5 px-4">Mensaje</th>
                      <th className="py-3.5 px-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text)]">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-[var(--color-card-alt)]/50 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-[var(--color-text-muted)] font-mono">
                          {new Date(item.sent_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3 px-4 font-bold text-[var(--color-text)]">
                          {item.recipient_name || 'Desconocido'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--color-text-muted)]">
                          {item.phone || item.target_phone || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[11px] font-mono text-[var(--color-gold)] font-bold">
                            {item.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-[var(--color-text-muted)]" title={item.message}>
                          {item.message}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${item.status === 'sent' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                            {item.status === 'sent' ? 'Enviado' : 'Fallido'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </GymCard>
      )}
    </div>
  );
}

// COMPONENTE ITEM DE REGLA
function RuleItemCard({ icon, title, desc, enabled, onToggle }) {
  return (
    <div className={`p-4 rounded-[var(--radius-md)] border transition-all flex items-start justify-between gap-4 ${enabled ? 'bg-[var(--color-card-alt)] border-[var(--color-border)]' : 'bg-[var(--color-card-alt)]/40 border-[var(--color-border)]/50 opacity-60'}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-gold)] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          {React.cloneElement(icon, { className: 'text-white shrink-0', size: 18 })}
        </div>
        <div>
          <h3 className="text-sm font-bold text-[var(--color-text)]">{title}</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">{desc}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${enabled ? 'bg-[var(--color-gold)]' : 'bg-gray-400'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
