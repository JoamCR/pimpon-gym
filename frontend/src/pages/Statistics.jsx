import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/ui/PageHeader';
import {
  IconTrendingUp,
  IconChartBar,
  IconChartPie,
  IconLoader,
  IconAlertCircle,
  IconMailbox,
  IconDownload,
  IconShare,
  IconSpeakerphone,
  IconMessage,
  IconCalendarEvent,
  IconStethoscope,
  IconUsers
} from '@tabler/icons-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useComprehensiveStats } from '../hooks/useStatistics';
import { GymCard } from '../components/ui/GymCard';
import { GymButton } from '../components/ui/GymButton';
import { SimpleDateInput } from '../components/ui/SimpleDateInput';
import { ZebraTableCard } from '../components/statistics/ZebraTableCard';

const COLORS = ['#0F3E60', '#E29A00', '#16A34A', '#DC2626', '#0D1B2A', '#8B5CF6'];

const chartTypes = [
  { id: 'bar', label: 'Barras', icon: <IconChartBar size={20} /> },
  { id: 'pie', label: 'Pastel', icon: <IconChartPie size={20} /> },
];

const allMetrics = [
  // Subgrupo 1: Gimnasio (Clientes)
  { id: 'clientsByPlan', label: 'Clientes por Plan', category: 'gym' },
  { id: 'gymOnly', label: 'Origen: Solo Gimnasio', category: 'gym' },
  { id: 'nutToGym', label: 'Conversión: Nutrición → Gimnasio', category: 'gym' },
  { id: 'retentionRate', label: 'Retención de Clientes', category: 'gym' },
  { id: 'monthlyIncome', label: 'Ingresos del Mes (Gimnasio)', category: 'gym' },
  { id: 'paymentMethods', label: 'Origen de Ingresos', category: 'gym' },
  { id: 'absentClients', label: 'Clientes Ausentes', category: 'gym' },
  { id: 'alertClients', label: 'Clientes en Alerta', category: 'gym' },
  { id: 'expiredClients', label: 'Anualidad Vencida', category: 'gym' },
  { id: 'sexDistributionClients', label: 'Sexo de Clientes', category: 'gym' },
  { id: 'ageDistributionClients', label: 'Edad de Clientes', category: 'gym' },
  { id: 'attendance', label: 'Asistencia Diaria Gimnasio', category: 'gym' },

  // Subgrupo 2: Nutriología (Pacientes)
  { id: 'nutritionOnly', label: 'Origen: Solo Nutrición', category: 'nutrition' },
  { id: 'gymToNut', label: 'Conversión: Gimnasio → Nutrición', category: 'nutrition' },
  { id: 'nutritionRetention', label: 'Retención de Pacientes', category: 'nutrition' },
  { id: 'nutritionIncome', label: 'Ingresos del Consultorio', category: 'nutrition' },
  { id: 'absentPatients', label: 'Pacientes Ausentes (30+ días)', category: 'nutrition' },
  { id: 'nutritionEvaluations', label: 'Evaluaciones Realizadas', category: 'nutrition' },
  { id: 'nutritionConsultations', label: 'Seguimiento de Pacientes', category: 'nutrition' },
  { id: 'sexDistributionPatients', label: 'Sexo de Pacientes', category: 'nutrition' },
  { id: 'ageDistributionPatients', label: 'Edad de Pacientes', category: 'nutrition' },
  { id: 'appointmentStats', label: 'Control de Citas Nutrición', category: 'nutrition' },
];

export default function Statistics() {
  const navigate = useNavigate();
  const [chartType, setChartType] = useState('bar');
  const [selectedMetric, setSelectedMetric] = useState('clientsByPlan');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selección de tarjetas interactiva para Tablas Cebra
  const [selectedGymCard, setSelectedGymCard] = useState('gymOnly');
  const [selectedNutritionCard, setSelectedNutritionCard] = useState('nutritionOnly');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const derivedYear = startDate 
    ? parseInt(startDate.split('-')[0], 10) 
    : (endDate ? parseInt(endDate.split('-')[0], 10) : currentYear);

  const derivedMonth = startDate 
    ? parseInt(startDate.split('-')[1], 10) 
    : (endDate ? parseInt(endDate.split('-')[1], 10) : currentMonth);

  const selectedYear = derivedYear || currentYear;
  const selectedMonth = derivedMonth || currentMonth;

  // Un solo hook consolidado que trae todos los KPIs, gráficos y listas en 1 petición HTTP
  const { data, isLoading, error, refetch } = useComprehensiveStats(selectedYear, selectedMonth, startDate, endDate);

  if (error) {
    return (
      <div className="min-h-screen p-6 bg-[var(--color-surface)] flex items-center justify-center">
        <GymCard variant="danger" title="Error al Cargar Datos" noPad>
          <div className="p-6 space-y-4">
            <p className="text-[var(--color-text)] flex items-center gap-2">
              <IconAlertCircle size={24} className="text-red-500" /> {error.message}
            </p>
            <GymButton variant="primary" size="lg" onClick={() => refetch()}>Reintentar</GymButton>
          </div>
        </GymCard>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 bg-[var(--color-surface)] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="text-4xl text-[var(--color-secondary)]"
        >
          <IconLoader size={40} />
        </motion.div>
        <p className="ml-4 text-[var(--color-text-muted)]">Cargando estadísticas simétricas...</p>
      </div>
    );
  }

  const stats = data || {};
  const kpis = stats.kpis || {};
  const charts = stats.charts || {};
  const lists = stats.lists || {};

  const monthlyIncomeData = lists.monthlyIncomeData || { total: 0, payment_breakdown: [] };
  const absentClients = lists.absentClients || [];
  const alertClients = lists.alertClients || [];
  const expiredClients = lists.expiredClients || [];
  const patientsToClients = lists.patientsToClients || [];
  const retention3Months = lists.retention3Months || [];
  const consultationDurations = lists.consultationDurations || {};
  const nutritionIncomeReal = lists.nutritionIncomeReal || { total: 0, by_method: [], details: [] };
  const monthlyIncomeDetails = lists.monthlyIncomeDetails || [];
  const retentionClients = lists.retentionClients || [];
  const acquisitionOriginData = lists.acquisitionOriginData || kpis.acquisitionOrigin || {};
  const appointmentStats = lists.appointmentStats || kpis.appointmentStats || { today: 0, month: 0, year: 0 };
  const absentPatients = lists.absentPatients || [];
  const gymOnlyClients = lists.gymOnlyClients || [];
  const nutritionOnlyPatients = lists.nutritionOnlyPatients || [];
  const gymToNutritionPatients = lists.gymToNutritionPatients || [];
  const nutritionEvaluationsList = lists.nutritionEvaluationsList || [];
  const visitsDetails = lists.visitsDetails || { today: [], month: [], year: [] };
  const nutritionApptDetails = lists.nutritionApptDetails || { today: [], month: [], year: [] };

  const totalIncome = monthlyIncomeData?.total || 0;
  const incomeByMethod = monthlyIncomeData?.payment_breakdown || [];

  const paymentData = (charts.paymentMethods || []).map(d => ({
    name: d.payment_method === 'cash' ? 'Efectivo' : d.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta',
    value: parseFloat(d.percentage) || 0,
    total: parseFloat(d.total) || 0
  })).filter(d => d.value > 0);

  const plansData = (charts.clientsByPlan || []).map(d => ({
    name: d.name,
    value: parseInt(d.client_count) || 0
  })).filter(d => d.value > 0);

  const attendanceData = (charts.dailyAttendance || []).slice(0, 30).map(d => ({
    date: d.date ? d.date.split('T')[0] : d.date,
    visitantes: parseInt(d.daily_count) || 0,
    clientes_unicos: parseInt(d.unique_clients) || 0
  }));

  const ageDataClients = (charts.ageDistributionClients || []).map(d => ({
    name: d.age_range,
    value: parseInt(d.count, 10) || 0
  }));

  const sexDataClients = (charts.sexDistributionClients || []).map(d => ({
    name: d.sex === 'M' ? 'Masculino' : d.sex === 'F' ? 'Femenino' : (d.sex || 'Sin dato'),
    value: parseInt(d.count, 10) || 0
  }));

  const ageDataPatients = (charts.ageDistributionPatients || []).map(d => ({
    name: d.age_range,
    value: parseInt(d.count, 10) || 0
  }));

  const sexDataPatients = (charts.sexDistributionPatients || []).map(d => ({
    name: d.sex === 'M' ? 'Masculino' : d.sex === 'F' ? 'Femenino' : (d.sex || 'Sin dato'),
    value: parseInt(d.count, 10) || 0
  }));

  const incomeMethodData = incomeByMethod.map(d => ({
    name: d.payment_method === 'cash' ? 'Efectivo' : d.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta',
    value: parseFloat(d.total) || 0
  }));

  // Helper para evaluar si una fecha cae dentro del rango seleccionado (Desde / Hasta)
  const isDateFilterActive = Boolean(startDate || endDate);
  const isInvalidRange = Boolean(startDate && endDate && startDate > endDate);

  const isWithinDateRange = (dateStr) => {
    if (isInvalidRange) return false;
    if (!startDate && !endDate) return true;
    if (!dateStr) return false;
    const formatted = typeof dateStr === 'string' && dateStr.includes('T') ? dateStr.split('T')[0] : String(dateStr).slice(0, 10);
    if (startDate && formatted < startDate) return false;
    if (endDate && formatted > endDate) return false;
    return true;
  };

  const filteredAttendanceData = attendanceData.filter(d => isWithinDateRange(d.date));
  const filteredGymOnlyClients = gymOnlyClients.filter(c => isWithinDateRange(c.created_at));
  const filteredNutritionOnlyPatients = nutritionOnlyPatients.filter(p => isWithinDateRange(p.created_at));
  const filteredAbsentClients = absentClients.filter(c => isWithinDateRange(c.last_attendance_date || c.last_attendance || c.created_at));
  const filteredAlertClients = alertClients.filter(c => isWithinDateRange(c.last_attendance_date || c.last_attendance || c.created_at));
  const filteredExpiredClients = expiredClients.filter(c => isWithinDateRange(c.end_date || c.last_end_date || c.created_at));
  const filteredAbsentPatients = absentPatients.filter(p => isWithinDateRange(p.last_consultation_date || p.created_at));
  const filteredPatientsToClients = patientsToClients.filter(p => isWithinDateRange(p.conversion_date || p.created_at));
  const filteredGymToNutritionPatients = gymToNutritionPatients.filter(p => isWithinDateRange(p.conversion_date || p.created_at));

  const rawEvalsList = Array.isArray(nutritionEvaluationsList) 
    ? nutritionEvaluationsList 
    : (nutritionEvaluationsList?.data || []);
  const filteredNutritionEvaluations = rawEvalsList.filter(e => isWithinDateRange(e.evaluation_date || e.created_at));

  const filteredMonthlyIncomeDetails = monthlyIncomeDetails.filter(p => isWithinDateRange(p.paid_at || p.payment_date || p.created_at));

  const detailedIncomeByMethod = [
    { name: 'Efectivo', value: filteredMonthlyIncomeDetails.filter(d => d.payment_method === 'cash').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0) },
    { name: 'Transferencia', value: filteredMonthlyIncomeDetails.filter(d => d.payment_method === 'transfer').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0) },
    { name: 'Tarjeta', value: filteredMonthlyIncomeDetails.filter(d => d.payment_method === 'card').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0) }
  ].filter(d => d.value > 0);

  const filteredIncomeMethodData = isInvalidRange
    ? []
    : (detailedIncomeByMethod.length > 0 ? detailedIncomeByMethod : incomeMethodData);

  const totalFilteredIncome = filteredIncomeMethodData.reduce((acc, curr) => acc + curr.value, 0);
  const filteredPaymentData = totalFilteredIncome > 0
    ? filteredIncomeMethodData.map(d => ({
        name: d.name,
        value: totalFilteredIncome > 0 ? Math.round((d.value / totalFilteredIncome) * 100) : 0,
        total: d.value
      }))
    : paymentData;

  const filteredPlansData = isInvalidRange ? [] : plansData;
  const filteredSexDataClients = isInvalidRange ? [] : sexDataClients;
  const filteredAgeDataClients = isInvalidRange ? [] : ageDataClients;
  const filteredSexDataPatients = isInvalidRange ? [] : sexDataPatients;
  const filteredAgeDataPatients = isInvalidRange ? [] : ageDataPatients;

  const absentClientsList = isDateFilterActive ? filteredAbsentClients : absentClients;
  const alertClientsList = isDateFilterActive ? filteredAlertClients : alertClients;
  const expiredClientsList = isDateFilterActive ? filteredExpiredClients : expiredClients;
  const absentPatientsList = isDateFilterActive ? filteredAbsentPatients : absentPatients;

  const nutritionIncomeByMethod = (nutritionIncomeReal?.by_method || []).map(d => ({
    name: d.payment_method === 'cash' ? 'Efectivo' : d.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta',
    value: parseFloat(d.total) || 0
  })).filter(d => d.value > 0);

  const chartConfig = {
    // Gimnasio (Clientes)
    clientsByPlan: { data: filteredPlansData, title: 'Distribución de Clientes Activos por Plan', dataKey: 'value', nameKey: 'name' },
    gymOnly: {
      data: [
        { name: 'Solo Gimnasio', value: filteredGymOnlyClients.length },
        { name: 'Vinculados a Nutrición', value: Math.max((acquisitionOriginData?.total_clients || 0) - filteredGymOnlyClients.length, 0) }
      ].filter(d => d.value > 0),
      title: 'Origen: Solo Gimnasio', dataKey: 'value', nameKey: 'name'
    },
    nutToGym: {
      data: [{ name: 'Nutrición → Gimnasio', value: filteredPatientsToClients.length }].filter(d => d.value > 0),
      title: 'Conversión: Nutrición a Gimnasio', dataKey: 'value', nameKey: 'name'
    },
    retentionRate: {
      data: [
        { name: 'Retenidos (6+ meses)', value: parseFloat(kpis.retention?.retained_clients) || retentionClients.length || 0 },
        { name: 'Menos de 6 meses', value: Math.max((parseFloat(kpis.retention?.total_clients) || 0) - (parseFloat(kpis.retention?.retained_clients) || retentionClients.length || 0), 0) }
      ].filter(d => d.value > 0),
      title: 'Retención de Clientes', dataKey: 'value', nameKey: 'name'
    },
    monthlyIncome: { data: filteredIncomeMethodData, title: 'Ingresos Efectivos (Gimnasio)', dataKey: 'value', nameKey: 'name' },
    paymentMethods: { data: filteredPaymentData, title: 'Origen de Ingresos (Gimnasio)', dataKey: 'value', nameKey: 'name' },
    attendance: { data: filteredAttendanceData, title: 'Asistencia Diaria', dataKey: 'visitantes', nameKey: 'date' },
    absentClients: {
      data: absentClientsList.reduce((acc, client) => {
        const plan = client.plan_name || 'Sin plan';
        const existing = acc.find(item => item.name === plan);
        if (existing) existing.value += 1;
        else acc.push({ name: plan, value: 1 });
        return acc;
      }, []).filter(d => d.value > 0),
      title: 'Clientes Ausentes (15+ días) por Plan', dataKey: 'value', nameKey: 'name'
    },
    alertClients: {
      data: alertClientsList.reduce((acc, client) => {
        const plan = client.plan_name || 'Sin plan';
        const existing = acc.find(item => item.name === plan);
        if (existing) existing.value += 1;
        else acc.push({ name: plan, value: 1 });
        return acc;
      }, []).filter(d => d.value > 0),
      title: 'Clientes en Alerta (7 a 14 días) por Plan', dataKey: 'value', nameKey: 'name'
    },
    expiredClients: {
      data: expiredClientsList.reduce((acc, client) => {
        const plan = client.plan_name || 'Sin plan';
        const existing = acc.find(item => item.name === plan);
        if (existing) existing.value += 1;
        else acc.push({ name: plan, value: 1 });
        return acc;
      }, []).filter(d => d.value > 0),
      title: 'Anualidad Vencida por Plan', dataKey: 'value', nameKey: 'name'
    },
    sexDistributionClients: { data: filteredSexDataClients, title: 'Distribución por Sexo (Clientes)', dataKey: 'value', nameKey: 'name' },
    ageDistributionClients: { data: filteredAgeDataClients, title: 'Distribución por Edad (Clientes)', dataKey: 'value', nameKey: 'name' },

    // Nutriología (Pacientes)
    nutritionOnly: {
      data: [
        { name: 'Solo Nutrición', value: filteredNutritionOnlyPatients.length },
        { name: 'Vinculados a Gimnasio', value: Math.max((acquisitionOriginData?.total_patients || 0) - filteredNutritionOnlyPatients.length, 0) }
      ].filter(d => d.value > 0),
      title: 'Origen: Solo Nutrición', dataKey: 'value', nameKey: 'name'
    },
    gymToNut: {
      data: [{ name: 'Gimnasio → Nutrición', value: filteredGymToNutritionPatients.length }].filter(d => d.value > 0),
      title: 'Conversión: Gimnasio a Nutrición', dataKey: 'value', nameKey: 'name'
    },
    nutritionRetention: {
      data: [
        { name: '3+ Consultas', value: retention3Months.length },
        { name: 'Resto', value: Math.max((consultationDurations?.total_patients || 0) - retention3Months.length, 0) }
      ].filter(d => d.value > 0),
      title: 'Retención de Pacientes', dataKey: 'value', nameKey: 'name'
    },
    nutritionIncome: {
      data: nutritionIncomeByMethod.length > 0
        ? nutritionIncomeByMethod
        : (parseFloat(nutritionIncomeReal?.total) > 0
            ? [{ name: 'Ingresos Consultorio', value: parseFloat(nutritionIncomeReal.total) }]
            : []),
      title: 'Ingresos del Consultorio (Nutrición)', dataKey: 'value', nameKey: 'name'
    },
    absentPatients: {
      data: [{ name: 'Ausentes (30+ días)', value: absentPatientsList.length }].filter(d => d.value > 0),
      title: 'Pacientes Ausentes (30+ días)', dataKey: 'value', nameKey: 'name'
    },
    nutritionEvaluations: {
      data: [
        { 
          name: 'Evaluaciones en Período', 
          value: filteredNutritionEvaluations.length
        }
      ].filter(d => d.value > 0),
      title: 'Evaluaciones Realizadas en el Período', dataKey: 'value', nameKey: 'name'
    },
    nutritionConsultations: {
      data: [
        { name: '1 mes seguimiento', value: consultationDurations?.one_month_exact || 0 },
        { name: '2 meses seguimiento', value: consultationDurations?.two_months_exact || 0 },
        { name: '3+ meses constante', value: consultationDurations?.three_months_plus || 0 }
      ].filter(d => d.value > 0),
      title: 'Seguimiento de Pacientes por Tiempo', dataKey: 'value', nameKey: 'name'
    },
    sexDistributionPatients: { data: filteredSexDataPatients, title: 'Distribución por Sexo (Pacientes)', dataKey: 'value', nameKey: 'name' },
    ageDistributionPatients: { data: filteredAgeDataPatients, title: 'Distribución por Edad (Pacientes)', dataKey: 'value', nameKey: 'name' },
    appointmentStats: {
      data: isDateFilterActive
        ? [
            { name: 'Citas en Período', value: appointmentStats?.month || nutritionApptDetails?.month?.length || 0 }
          ].filter(d => d.value > 0)
        : [
            { name: 'Citas Hoy', value: appointmentStats?.today || 0 },
            { name: 'Citas Mes', value: appointmentStats?.month || 0 },
            { name: 'Citas Año', value: appointmentStats?.year || 0 }
          ].filter(d => d.value > 0),
      title: 'Control de Citas / Agendas Nutrición', dataKey: 'value', nameKey: 'name'
    }
  };

  // Helper para generar los datos de la Tabla Cebra del Gimnasio (Clientes)
  const getGymTableData = () => {
    if (selectedGymCard === 'visitToday') {
      const rows = (visitsDetails?.today || []).map(v => ({
        name: `${v.first_name} ${v.last_name || ''}`.trim() || 'Sin nombre',
        phone: `${v.phone || 'Sin tel.'} • ${v.plan_name || 'Visita'}`,
        detail: new Date(v.visit_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      }));
      return { title: 'Visitas del Día', headers: ['Cliente', 'Plan', 'Hora'], rows };
    }
    if (selectedGymCard === 'visitMonth') {
      const rows = (visitsDetails?.month || []).map(v => ({
        name: `${v.first_name} ${v.last_name || ''}`.trim() || 'Sin nombre',
        phone: `${v.phone || 'Sin tel.'} • ${v.plan_name || 'Visita'}`,
        detail: new Date(v.visit_time).toLocaleDateString('es-MX')
      }));
      return { title: 'Visitas del Mes', headers: ['Cliente', 'Plan', 'Fecha'], rows };
    }
    if (selectedGymCard === 'visitYear') {
      const rows = (visitsDetails?.year || []).map(v => ({
        name: `${v.first_name} ${v.last_name || ''}`.trim() || 'Sin nombre',
        phone: `${v.phone || 'Sin tel.'} • ${v.plan_name || 'Visita'}`,
        detail: new Date(v.visit_time).toLocaleDateString('es-MX')
      }));
      return { title: 'Visitas del Año', headers: ['Cliente', 'Plan', 'Fecha'], rows };
    }

    switch (selectedGymCard) {
      case 'gymOnly':
        return {
          title: 'Origen: Solo Gimnasio',
          headers: ['Cliente', 'Teléfono / Plan', 'Fecha Registro'],
          rows: filteredGymOnlyClients.map(c => ({
            name: `${c.first_name} ${c.last_name || ''}`,
            phone: `${c.phone || 'Sin tel.'} • ${c.plan_name || 'Sin plan'}`,
            detail: new Date(c.created_at).toLocaleDateString('es-MX')
          }))
        };
      case 'nutToGym':
        return {
          title: 'Conversión: Nutrición → Gimnasio',
          headers: ['Cliente', 'Teléfono', 'Consultas Previas'],
          rows: filteredPatientsToClients.map(p => ({
            name: `${p.first_name} ${p.last_name || ''}`,
            phone: p.phone || 'Sin teléfono',
            detail: `${p.total_consultations || 0} consulta(s)`
          }))
        };
      case 'retentionRate':
        return {
          title: 'Retención de Clientes',
          headers: ['Cliente', 'Teléfono / Plan', 'Permanencia'],
          rows: retentionClients.map(r => ({
            name: `${r.first_name} ${r.last_name || ''}`,
            phone: `${r.phone || 'Sin tel.'} • ${r.plan_name || 'Sin plan'}`,
            detail: `${r.consecutive_months || 0} meses seguidos`
          }))
        };
      case 'monthlyIncome': {
        const breakdownRows = (monthlyIncomeData?.payment_breakdown || []).map(b => ({
          name: b.payment_method === 'cash' ? 'Efectivo' : b.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta',
          phone: `${b.transaction_count || 0} transacción(es)`,
          detail: `$${parseFloat(b.total || 0).toLocaleString('es-MX')}`
        }));
        return {
          title: 'Ingresos Efectivos del Mes (Gimnasio)',
          headers: ['Método de Pago', 'Transacciones', 'Monto Total'],
          rows: breakdownRows
        };
      }
      case 'absentClients':
        return {
          title: 'Clientes Ausentes (15+ días sin asistir)',
          headers: ['Cliente', 'Teléfono / Plan', 'Inasistencia'],
          rows: absentClientsList.map(a => ({
            name: `${a.first_name} ${a.last_name || ''}`,
            phone: `${a.phone || 'Sin tel.'} • ${a.plan_name || 'Sin plan'}`,
            detail: `${a.days_without_attendance ?? 0} días${!a.last_attendance ? ' (sin asistencias)' : ''}`
          }))
        };
      case 'alertClients':
        return {
          title: 'Clientes en Alerta (7 a 14 días sin asistir)',
          headers: ['Cliente', 'Teléfono / Plan', 'Sin Asistir'],
          rows: alertClientsList.map(a => ({
            name: `${a.first_name} ${a.last_name || ''}`,
            phone: `${a.phone || 'Sin tel.'} • ${a.plan_name || 'Sin plan'}`,
            detail: `${a.days_without_attendance ?? 0} días${!a.last_attendance ? ' (sin asistencias)' : ''}`
          }))
        };
      case 'expiredClients':
        return {
          title: 'Anualidad Vencida',
          headers: ['Cliente', 'Teléfono / Plan', 'Venció el'],
          rows: expiredClientsList.map(e => ({
            name: `${e.first_name} ${e.last_name || ''}`,
            phone: `${e.phone || 'Sin tel.'} • ${e.plan_name || 'Sin plan'}`,
            detail: e.enrollment_expires_at ? new Date(e.enrollment_expires_at).toLocaleDateString('es-MX') : 'Vencida'
          }))
        };
      case 'sexDistributionClients':
        return {
          title: 'Sexo de Clientes',
          headers: ['Género', 'Cantidad', 'Distribución'],
          rows: sexDataClients.map(s => ({
            name: s.name,
            phone: `${s.value} clientes`,
            detail: `${Math.round((s.value / (sexDataClients.reduce((a,b)=>a+b.value,0)||1))*100)}%`
          }))
        };
      case 'ageDistributionClients':
        return {
          title: 'Edad de Clientes',
          headers: ['Rango de Edad', 'Cantidad', 'Distribución'],
          rows: ageDataClients.map(a => ({
            name: a.name,
            phone: `${a.value} clientes`,
            detail: `${Math.round((a.value / (ageDataClients.reduce((x,y)=>x+y.value,0)||1))*100)}%`
          }))
        };
      default:
        return { title: 'Selecciona una tarjeta', headers: ['Cliente', 'Contacto', 'Detalle'], rows: [] };
    }
  };

  // Helper para generar los datos de la Tabla Cebra de Nutriología (Pacientes)
  const getNutritionTableData = () => {
    if (selectedNutritionCard === 'apptToday') {
      const rows = (nutritionApptDetails?.today || []).map(a => ({
        name: `${a.first_name} ${a.last_name || ''}`.trim() || 'Sin nombre',
        phone: `${a.phone || 'Sin tel.'} • ${a.source || 'Agenda'}`,
        detail: new Date(a.appointment_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      }));
      return { title: 'Citas del Día', headers: ['Paciente', 'Fuente', 'Hora'], rows };
    }
    if (selectedNutritionCard === 'apptMonth') {
      const rows = (nutritionApptDetails?.month || []).map(a => ({
        name: `${a.first_name} ${a.last_name || ''}`.trim() || 'Sin nombre',
        phone: `${a.phone || 'Sin tel.'} • ${a.source || 'Agenda'}`,
        detail: new Date(a.appointment_time).toLocaleDateString('es-MX')
      }));
      return { title: 'Citas del Mes', headers: ['Paciente', 'Fuente', 'Fecha'], rows };
    }
    if (selectedNutritionCard === 'apptYear') {
      const rows = (nutritionApptDetails?.year || []).map(a => ({
        name: `${a.first_name} ${a.last_name || ''}`.trim() || 'Sin nombre',
        phone: `${a.phone || 'Sin tel.'} • ${a.source || 'Agenda'}`,
        detail: new Date(a.appointment_time).toLocaleDateString('es-MX')
      }));
      return { title: 'Citas del Año', headers: ['Paciente', 'Fuente', 'Fecha'], rows };
    }

    switch (selectedNutritionCard) {
      case 'nutritionOnly':
        return {
          title: 'Origen: Solo Nutrición',
          headers: ['Paciente', 'Teléfono', 'Fecha Registro'],
          rows: filteredNutritionOnlyPatients.map(p => ({
            name: `${p.first_name} ${p.last_name || ''}`,
            phone: p.phone || 'Sin teléfono',
            detail: new Date(p.created_at).toLocaleDateString('es-MX')
          }))
        };
      case 'gymToNut':
        return {
          title: 'Conversión: Gimnasio → Nutrición',
          headers: ['Paciente', 'Teléfono', 'Conversión'],
          rows: filteredGymToNutritionPatients.map(p => ({
            name: `${p.first_name} ${p.last_name || ''}`,
            phone: p.phone || 'Sin teléfono',
            detail: p.created_at ? new Date(p.created_at).toLocaleDateString('es-MX') : 'Cliente Gimnasio'
          }))
        };
      case 'nutritionRetention':
        return {
          title: 'Retención de Pacientes',
          headers: ['Paciente', 'Teléfono', 'Consultas'],
          rows: retention3Months.map(r => ({
            name: `${r.first_name} ${r.last_name || ''}`,
            phone: r.phone || 'Sin teléfono',
            detail: `${r.total_consults || 0} consulta(s)`
          }))
        };
      case 'nutritionIncome': {
        const rawByMethod = Array.isArray(nutritionIncomeReal?.by_method) ? nutritionIncomeReal.by_method : [];
        const nutBreakdownRows = rawByMethod.map(i => ({
          name: i.payment_method === 'cash' ? 'Efectivo' : i.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta',
          phone: `${i.transaction_count || 1} transacción(es)`,
          detail: `$${parseFloat(i.total || 0).toLocaleString('es-MX')}`
        }));
        return {
          title: 'Ingresos Efectivos del Mes (Nutrición)',
          headers: ['Método de Pago', 'Transacciones', 'Monto Total'],
          rows: nutBreakdownRows
        };
      }
      case 'absentPatients':
        return {
          title: 'Pacientes Ausentes (30+ días)',
          headers: ['Paciente', 'Teléfono', 'Sin Consulta'],
          rows: absentPatientsList.map(a => ({
            name: `${a.first_name} ${a.last_name || ''}`,
            phone: a.phone || 'Sin teléfono',
            detail: a.status_text || 'Sin consulta reciente'
          }))
        };
      case 'nutritionEvaluations':
        return {
          title: 'Evaluaciones Realizadas',
          headers: ['Paciente', 'Teléfono / Detalle', 'Fecha de Evaluación'],
          rows: filteredNutritionEvaluations.map(e => ({
            name: `${e.first_name} ${e.last_name || ''}`,
            phone: `${e.phone || 'Sin teléfono'} ${e.bmi ? `• IMC: ${e.bmi}` : ''}`,
            detail: e.evaluation_date ? new Date(e.evaluation_date).toLocaleDateString('es-MX') : 'Sin fecha'
          }))
        };
      case 'nutritionConsultations':
        return {
          title: 'Seguimiento de Pacientes por Tiempo',
          headers: ['Etapa de Consulta', 'Detalle', 'Pacientes'],
          rows: [
            { name: 'Al menos 1 consulta', phone: 'Registrado', detail: `${consultationDurations?.consulted_patients || 0} pac.` },
            { name: '1 mes exacto', phone: 'Seguimiento inicial', detail: `${consultationDurations?.one_month_exact || 0} pac.` },
            { name: '2 meses exactos', phone: 'Seguimiento medio', detail: `${consultationDurations?.two_months_exact || 0} pac.` },
            { name: '3+ meses', phone: 'Seguimiento constante', detail: `${consultationDurations?.three_months_plus || 0} pac.` }
          ]
        };
      case 'sexDistributionPatients':
        return {
          title: 'Sexo de Pacientes',
          headers: ['Género', 'Cantidad', 'Distribución'],
          rows: sexDataPatients.map(s => ({
            name: s.name,
            phone: `${s.value} pacientes`,
            detail: `${Math.round((s.value / (sexDataPatients.reduce((a,b)=>a+b.value,0)||1))*100)}%`
          }))
        };
      case 'ageDistributionPatients':
        return {
          title: 'Edad de Pacientes',
          headers: ['Rango de Edad', 'Cantidad', 'Distribución'],
          rows: ageDataPatients.map(a => ({
            name: a.name,
            phone: `${a.value} pacientes`,
            detail: `${Math.round((a.value / (ageDataPatients.reduce((x,y)=>x+y.value,0)||1))*100)}%`
          }))
        };
      default:
        return { title: 'Selecciona una tarjeta', headers: ['Paciente', 'Contacto', 'Detalle'], rows: [] };
    }
  };

  const gymTableData = getGymTableData();
  const nutritionTableData = getNutritionTableData();

  const renderChart = () => {
    const config = chartConfig[selectedMetric] || chartConfig.clientsByPlan;
    const chartData = config.data || [];

    return (
      <div className="space-y-4">
        {(startDate || endDate) && (
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[rgba(16,185,129,0.1)] text-[var(--color-secondary)] border border-[rgba(16,185,129,0.2)]">
            <IconCalendarEvent size={16} />
            Filtro de fechas activo: {startDate || 'Inicio'} → {endDate || 'Hoy'}
          </div>
        )}

        {!chartData || chartData.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-[var(--color-text-muted)] gap-2">
            <IconMailbox size={48} className="opacity-50" />
            <span>No hay datos disponibles en el rango seleccionado</span>
          </div>
        ) : chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.nameKey} />
              <YAxis />
              <Tooltip formatter={(value) => typeof value === 'number' ? value.toLocaleString('es-MX') : value} />
              <Legend />
              <Bar dataKey={config.dataKey} fill="#0F3E60" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value.toLocaleString('es-MX')}`}
                outerRadius={120}
                fill="#8884d8"
                dataKey={config.dataKey}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => typeof value === 'number' ? value.toLocaleString('es-MX') : value} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  };

  const handleShareKPIs = async () => {
    const summaryText = [
      `📊 Resumen de Estadísticas Pimpon Gym (${selectedMonth}/${selectedYear})`,
      `🏋️ Gimnasio:`,
      `- Clientes activos: ${kpis.activeClients || 0}`,
      `- Visitas hoy / mes: ${kpis.visitStats?.today || 0} / ${kpis.visitStats?.month || 0}`,
      `- Ingresos del mes: $${(totalIncome || 0).toLocaleString('es-MX')}`,
      `- Clientes en alerta (7-14d): ${alertClientsList.length} | Ausentes (15+d): ${absentClientsList.length}`,
      `🍏 Consultorio Nutrición:`,
      `- Citas hoy / mes: ${appointmentStats?.today || 0} / ${appointmentStats?.month || 0}`,
      `- Ingresos consultorio: $${(nutritionIncomeReal?.total || 0).toLocaleString('es-MX')}`,
      `- Evaluaciones en el periodo: ${filteredNutritionEvaluations.length}`
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summaryText);
      toast.success('Resumen de KPIs copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  };

  const exportAllStatisticsCSV = () => {
    const lines = [];

    lines.push(`REPORTES_ESTADISTICAS_PIMPON_GYM`);
    lines.push(`Fecha de generación: "${new Date().toLocaleString('es-MX')}"`);
    lines.push(`Filtros aplicados: ${startDate || endDate ? `Desde ${startDate || 'Inicio'} Hasta ${endDate || 'Hoy'}` : 'Sin filtro (Mes completo)'}`);
    lines.push('');

    // SECCIÓN 1: ESTADÍSTICAS DEL GIMNASIO (CLIENTES)
    lines.push(`=== SECCIÓN 1: ESTADÍSTICAS DEL GIMNASIO (CLIENTES) ===`);
    lines.push(`Métrica,Valor,Detalle / Notas`);
    lines.push(`Visitas del Día,${kpis.visitStats?.today || 0},Asistencias hoy`);
    lines.push(`Visitas del Mes,${kpis.visitStats?.month || 0},Asistencias este mes`);
    lines.push(`Visitas del Año,${kpis.visitStats?.year || 0},Asistencias acumuladas año`);
    lines.push(`Origen: Solo Gimnasio,${filteredGymOnlyClients.length},${acquisitionOriginData?.percentages?.gimnasio_only || 0}% del total`);
    lines.push(`Nutrición -> Gimnasio,${filteredPatientsToClients.length},${acquisitionOriginData?.percentages?.nutricion_to_gimnasio || 0}% conversiones`);
    lines.push(`Retención de Clientes,${kpis.retention?.retention_percentage || 0}%,${kpis.retention?.retained_clients || 0} clientes retenidos`);
    lines.push(`Ingresos del Mes (Gimnasio),$${(totalIncome || 0).toLocaleString('es-MX')},${incomeByMethod.length} métodos de pago`);
    lines.push(`Clientes Ausentes,${absentClientsList.length},15+ días sin asistir`);
    lines.push(`Clientes en Alerta,${alertClientsList.length},7 a 14 días sin asistir`);
    lines.push(`Anualidad Vencida,${expiredClientsList.length},Inscripción anual vencida`);
    lines.push('');

    // DESGLOSE DE INGRESOS GIMNASIO POR MÉTODO DE PAGO
    lines.push(`--- DESGLOSE DE INGRESOS GIMNASIO ---`);
    lines.push(`Método de Pago,Transacciones,Monto Total`);
    (incomeByMethod || []).forEach(b => {
      const method = b.payment_method === 'cash' ? 'Efectivo' : b.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta';
      lines.push(`${method},${b.transaction_count || 0},$${parseFloat(b.total || 0).toLocaleString('es-MX')}`);
    });
    lines.push('');

    // SECCIÓN 2: NUTRIOLOGÍA (PACIENTES)
    lines.push(`=== SECCIÓN 2: ESTADÍSTICAS DE NUTRIOLOGÍA (PACIENTES) ===`);
    lines.push(`Métrica,Valor,Detalle / Notas`);
    lines.push(`Citas del Día,${appointmentStats?.today || 0},Consultas agendadas hoy`);
    lines.push(`Citas del Mes,${appointmentStats?.month || 0},Consultas acumuladas mes`);
    lines.push(`Citas del Año,${appointmentStats?.year || 0},Consultas acumuladas año`);
    lines.push(`Origen: Solo Nutrición,${filteredNutritionOnlyPatients.length},${acquisitionOriginData?.percentages?.nutricion_only || 0}% del total`);
    lines.push(`Gimnasio -> Nutrición,${filteredGymToNutritionPatients.length},${acquisitionOriginData?.percentages?.gimnasio_to_nutricion || 0}% conversiones`);
    lines.push(`Retención de Pacientes,${retention3Months.length || 0},3+ consultas realizadas`);
    lines.push(`Ingresos del Mes (Consultorio),$${(nutritionIncomeReal?.total || 0).toLocaleString('es-MX')},Pagos reales consultorio`);
    lines.push(`Pacientes Ausentes,${absentPatientsList.length},30+ días sin consulta`);
    lines.push(`Evaluaciones Realizadas,${filteredNutritionEvaluations.length},Evaluaciones registradas en el período`);
    lines.push(`Seguimiento Pacientes,${consultationDurations?.consulted_patients || 0},Con al menos 1 consulta`);
    lines.push('');

    // DESGLOSE DE INGRESOS CONSULTORIO POR MÉTODO DE PAGO
    lines.push(`--- DESGLOSE DE INGRESOS CONSULTORIO NUTRICIÓN ---`);
    lines.push(`Método de Pago,Transacciones,Monto Total`);
    (nutritionIncomeReal?.by_method || []).forEach(b => {
      const method = b.payment_method === 'cash' ? 'Efectivo' : b.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta';
      lines.push(`${method},${b.transaction_count || 0},$${parseFloat(b.total || 0).toLocaleString('es-MX')}`);
    });
    lines.push('');

    // LISTADO DETALLADO DE CLIENTES SOLO GIMNASIO
    lines.push(`--- LISTADO DE CLIENTES (SOLO GIMNASIO) ---`);
    lines.push(`Nombre,Teléfono,Plan,Fecha Registro`);
    filteredGymOnlyClients.forEach(c => {
      lines.push(`"${c.first_name} ${c.last_name || ''}","${c.phone || 'Sin tel.'}","${c.plan_name || 'Sin plan'}","${c.created_at ? new Date(c.created_at).toLocaleDateString('es-MX') : ''}"`);
    });
    lines.push('');

    // LISTADO DETALLADO DE PACIENTES SOLO NUTRICIÓN
    lines.push(`--- LISTADO DE PACIENTES (SOLO NUTRICIÓN) ---`);
    lines.push(`Nombre,Teléfono,Fecha Registro`);
    filteredNutritionOnlyPatients.forEach(p => {
      lines.push(`"${p.first_name} ${p.last_name || ''}","${p.phone || 'Sin tel.'}","${p.created_at ? new Date(p.created_at).toLocaleDateString('es-MX') : ''}"`);
    });
    lines.push('');

    // LISTADO DETALLADO DE EVALUACIONES REALIZADAS
    lines.push(`--- LISTADO DE EVALUACIONES DE NUTRICIÓN REALIZADAS ---`);
    lines.push(`Nombre,Teléfono,IMC,Fecha Evaluación`);
    filteredNutritionEvaluations.forEach(e => {
      lines.push(`"${e.first_name} ${e.last_name || ''}","${e.phone || 'Sin tel.'}","${e.bmi || 'N/A'}","${e.evaluation_date ? new Date(e.evaluation_date).toLocaleDateString('es-MX') : ''}"`);
    });

    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Estadisticas_Generales_PimponGym_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen p-6 bg-[var(--color-surface)] space-y-8">
      {/* Header */}
      <PageHeader
        icon={<IconTrendingUp size={18} />}
        tag="Inteligencia de Negocio Simétrica"
        title="Estadísticas Estratégicas"
        subtitle="Análisis simétrico y ordenado para Gimnasio (Clientes) y Nutriología (Pacientes)"
      />

      {/* ==========================================
          SECCIÓN 1: ESTADÍSTICAS DEL GIMNASIO (CLIENTES)
         ========================================== */}
      <div className="relative my-6">
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[var(--color-text-muted)] to-transparent" />
        <div className="relative mx-auto inline-flex items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-sm text-[var(--color-text-muted)] shadow-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-[#0F3E60]" />
          <span className="uppercase tracking-[0.2em] font-bold text-[var(--color-secondary)]">Sección del Gimnasio</span>
        </div>
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-8 bg-[var(--color-secondary)] rounded-full" />
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Estadísticas del Gimnasio (Clientes)</h2>
        </div>

        {/* Subsección 1: Control de Visitas */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <IconCalendarEvent size={20} className="text-[var(--color-success)]" />
            <h3 className="text-lg font-bold text-[var(--color-text)]">Control de Visitas del Gimnasio</h3>
            <span className="text-xs text-[var(--color-text-muted)] ml-1">(clic para ver listado)</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <motion.div whileHover={{ scale: 1.02 }} onClick={() => setSelectedGymCard('visitToday')} className={`cursor-pointer transition-all ${selectedGymCard === 'visitToday' ? 'ring-2 ring-[var(--color-success)] rounded-xl shadow-md' : ''}`}>
              <GymCard title="Visitas del Día" subtitle="Asistencias registradas hoy" variant="success" noPad>
                <div className="p-5">
                  <p className="text-3xl font-bold text-[var(--color-text)]">{kpis.visitStats?.today || 0}</p>
                </div>
              </GymCard>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} onClick={() => setSelectedGymCard('visitMonth')} className={`cursor-pointer transition-all ${selectedGymCard === 'visitMonth' ? 'ring-2 ring-[var(--color-success)] rounded-xl shadow-md' : ''}`}>
              <GymCard title="Visitas del Mes" subtitle="Asistencias acumuladas del mes" variant="success" noPad>
                <div className="p-5">
                  <p className="text-3xl font-bold text-[var(--color-text)]">{kpis.visitStats?.month || 0}</p>
                </div>
              </GymCard>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} onClick={() => setSelectedGymCard('visitYear')} className={`cursor-pointer transition-all ${selectedGymCard === 'visitYear' ? 'ring-2 ring-[var(--color-success)] rounded-xl shadow-md' : ''}`}>
              <GymCard title="Visitas del Año" subtitle="Asistencias acumuladas del año" variant="success" noPad>
                <div className="p-5">
                  <p className="text-3xl font-bold text-[var(--color-text)]">{kpis.visitStats?.year || 0}</p>
                </div>
              </GymCard>
            </motion.div>
          </div>
        </div>

        {/* Subsección 2: Grid de 9 Tarjetas + Tabla Cebra Lateral */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Grid de 9 Tarjetas (Columna Izquierda) */}
          <div className="lg:col-span-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                id: 'gymOnly',
                title: 'Origen: Solo Gimnasio',
                value: filteredGymOnlyClients.length,
                subtitle: `${acquisitionOriginData?.percentages?.gimnasio_only || 0}% del total`,
                variant: 'default',
                color: 'text-[var(--color-secondary)]'
              },
              {
                id: 'nutToGym',
                title: 'Nutrición → Gimnasio',
                value: filteredPatientsToClients.length,
                subtitle: `${acquisitionOriginData?.percentages?.nutricion_to_gimnasio || 0}% conversiones`,
                variant: 'success',
                color: 'text-[var(--color-success)]'
              },
              {
                id: 'retentionRate',
                title: 'Retención de Clientes',
                value: `${kpis.retention?.retention_percentage || 0}%`,
                subtitle: `${kpis.retention?.retained_clients || 0} retenidos`,
                variant: 'default',
                color: 'text-[#0F3E60]'
              },
              {
                id: 'monthlyIncome',
                title: 'Ingresos del Mes',
                value: `$${(totalIncome || 0).toLocaleString('es-MX')}`,
                subtitle: `${incomeByMethod.length} métodos (solo gym)`,
                variant: 'success',
                color: 'text-[var(--color-success)]'
              },
              {
                id: 'absentClients',
                title: 'Clientes Ausentes',
                value: absentClientsList.length,
                subtitle: '15+ días sin asistir',
                variant: 'danger',
                color: 'text-red-500'
              },
              {
                id: 'alertClients',
                title: 'Clientes en Alerta',
                value: alertClientsList.length,
                subtitle: '7 a 14 días sin asistir',
                variant: 'default',
                color: 'text-[var(--color-secondary)]'
              },
              {
                id: 'expiredClients',
                title: 'Anualidad Vencida',
                value: expiredClientsList.length,
                subtitle: 'Inscripción anual vencida',
                variant: 'danger',
                color: 'text-red-600'
              },
              {
                id: 'sexDistributionClients',
                title: 'Sexo del Cliente',
                value: `${sexDataClients.length} géneros`,
                subtitle: 'Distribución por sexo',
                variant: 'default',
                color: 'text-[var(--color-secondary)]'
              },
              {
                id: 'ageDistributionClients',
                title: 'Edad del Cliente',
                value: `${ageDataClients.length} rangos`,
                subtitle: 'Rangos de edad',
                variant: 'default',
                color: 'text-[var(--color-secondary)]'
              }
            ].map(card => (
              <motion.div
                key={card.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedGymCard(card.id)}
                className={`cursor-pointer transition-all ${
                  selectedGymCard === card.id ? 'ring-2 ring-[var(--color-secondary)] rounded-xl shadow-md' : ''
                }`}
              >
                <GymCard title={card.title} subtitle={card.subtitle} variant={card.variant} noPad>
                  <div className="p-4">
                    <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                  </div>
                </GymCard>
              </motion.div>
            ))}
          </div>

          <ZebraTableCard
            title={gymTableData.title}
            headers={gymTableData.headers}
            rows={gymTableData.rows}
            countLabel="cliente(s)"
            emptyIcon={<IconUsers size={32} className="mx-auto opacity-40" />}
            emptyText="No hay registros que coincidan con la tarjeta o filtro seleccionado."
          />
        </div>
      </section>

      {/* ==========================================
          SECCIÓN 2: ESTADÍSTICAS DE NUTRIOLOGÍA (PACIENTES)
         ========================================== */}
      <div className="relative my-10">
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[var(--color-text-muted)] to-transparent" />
        <div className="relative mx-auto inline-flex items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-sm text-[var(--color-text-muted)] shadow-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-secondary)]" />
          <span className="uppercase tracking-[0.2em] font-bold text-[var(--color-secondary)]">Sección de Nutriología</span>
        </div>
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-8 bg-[var(--color-secondary)] rounded-full" />
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Estadísticas del Consultorio (Pacientes)</h2>
        </div>

        {/* Subsección 1: Control de Citas */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <IconStethoscope size={20} className="text-[var(--color-secondary)]" />
            <h3 className="text-lg font-bold text-[var(--color-text)]">Control de Citas / Agendas de Nutriología</h3>
            <span className="text-xs text-[var(--color-text-muted)] ml-1">(clic para ver listado)</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <motion.div whileHover={{ scale: 1.02 }} onClick={() => setSelectedNutritionCard('apptToday')} className={`cursor-pointer transition-all ${selectedNutritionCard === 'apptToday' ? 'ring-2 ring-[var(--color-secondary)] rounded-xl shadow-md' : ''}`}>
              <GymCard title="Citas del Día" subtitle="Consultas agendadas hoy" variant="default" noPad>
                <div className="p-5">
                  <p className="text-3xl font-bold text-[var(--color-secondary)]">{appointmentStats?.today || 0}</p>
                </div>
              </GymCard>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} onClick={() => setSelectedNutritionCard('apptMonth')} className={`cursor-pointer transition-all ${selectedNutritionCard === 'apptMonth' ? 'ring-2 ring-[var(--color-secondary)] rounded-xl shadow-md' : ''}`}>
              <GymCard title="Citas del Mes" subtitle="Consultas acumuladas del mes" variant="default" noPad>
                <div className="p-5">
                  <p className="text-3xl font-bold text-[var(--color-secondary)]">{appointmentStats?.month || 0}</p>
                </div>
              </GymCard>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} onClick={() => setSelectedNutritionCard('apptYear')} className={`cursor-pointer transition-all ${selectedNutritionCard === 'apptYear' ? 'ring-2 ring-[var(--color-secondary)] rounded-xl shadow-md' : ''}`}>
              <GymCard title="Citas del Año" subtitle="Consultas acumuladas del año" variant="default" noPad>
                <div className="p-5">
                  <p className="text-3xl font-bold text-[var(--color-secondary)]">{appointmentStats?.year || 0}</p>
                </div>
              </GymCard>
            </motion.div>
          </div>
        </div>

        {/* Subsección 2: Grid de 9 Tarjetas + Tabla Cebra Lateral */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Grid de 9 Tarjetas (Columna Izquierda) */}
          <div className="lg:col-span-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                id: 'nutritionOnly',
                title: 'Origen: Solo Nutrición',
                value: filteredNutritionOnlyPatients.length,
                subtitle: `${acquisitionOriginData?.percentages?.nutricion_only || 0}% del total`,
                variant: 'default',
                color: 'text-[var(--color-secondary)]'
              },
              {
                id: 'gymToNut',
                title: 'Gimnasio → Nutrición',
                value: filteredGymToNutritionPatients.length,
                subtitle: `${acquisitionOriginData?.percentages?.gimnasio_to_nutricion || 0}% conversiones`,
                variant: 'success',
                color: 'text-[var(--color-success)]'
              },
              {
                id: 'nutritionRetention',
                title: 'Retención de Pacientes',
                value: retention3Months.length || 0,
                subtitle: '3+ consultas realizadas',
                variant: 'default',
                color: 'text-[var(--color-secondary)]'
              },
              {
                id: 'nutritionIncome',
                title: 'Ingresos del Mes',
                value: `$${(nutritionIncomeReal?.total || 0).toLocaleString('es-MX')}`,
                subtitle: 'Pagos reales consultorio',
                variant: 'success',
                color: 'text-[var(--color-success)]'
              },
              {
                id: 'absentPatients',
                title: 'Pacientes Ausentes',
                value: absentPatientsList.length,
                subtitle: '30+ días sin consulta',
                variant: 'default',
                color: 'text-[var(--color-secondary)]'
              },
              {
                id: 'nutritionEvaluations',
                title: 'Evaluaciones Realizadas',
                value: filteredNutritionEvaluations.length,
                subtitle: 'Evaluaciones en el período',
                variant: 'default',
                color: 'text-[var(--color-secondary)]'
              },
              {
                id: 'nutritionConsultations',
                title: 'Seguimiento Pacientes',
                value: consultationDurations?.consulted_patients || 0,
                subtitle: 'Con al menos 1 consulta',
                variant: 'default',
                color: 'text-[var(--color-secondary)]'
              },
              {
                id: 'sexDistributionPatients',
                title: 'Sexo del Paciente',
                value: `${sexDataPatients.length} géneros`,
                subtitle: 'Distribución por sexo',
                variant: 'default',
                color: 'text-[var(--color-secondary)]'
              },
              {
                id: 'ageDistributionPatients',
                title: 'Edad del Paciente',
                value: `${ageDataPatients.length} rangos`,
                subtitle: 'Rangos de edad',
                variant: 'default',
                color: 'text-[var(--color-secondary)]'
              }
            ].map(card => (
              <motion.div
                key={card.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedNutritionCard(card.id)}
                className={`cursor-pointer transition-all ${
                  selectedNutritionCard === card.id ? 'ring-2 ring-[var(--color-secondary)] rounded-xl shadow-md' : ''
                }`}
              >
                <GymCard title={card.title} subtitle={card.subtitle} variant={card.variant} noPad>
                  <div className="p-4">
                    <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                  </div>
                </GymCard>
              </motion.div>
            ))}
          </div>

          <ZebraTableCard
            title={nutritionTableData.title}
            headers={nutritionTableData.headers}
            rows={nutritionTableData.rows}
            countLabel="paciente(s)"
            emptyIcon={<IconStethoscope size={32} className="mx-auto opacity-40" />}
            emptyText="No hay registros que coincidan con la tarjeta o filtro seleccionado."
            accentClass="bg-[rgba(16,185,129,0.1)] text-[var(--color-secondary)]"
            hoverClass="hover:bg-[rgba(16,185,129,0.08)]"
          />
        </div>
      </section>

      {/* ==========================================
          SECCIÓN 3: FILTROS Y VISUALIZADOR DE GRÁFICOS
         ========================================== */}
      <div className="relative my-10">
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[var(--color-text-muted)] to-transparent" />
        <div className="relative mx-auto inline-flex items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-sm text-[var(--color-text-muted)] shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[var(--color-secondary)]" />
          <span className="uppercase tracking-[0.2em] font-semibold text-[var(--color-text-muted)]">Visualización de Gráficos</span>
        </div>
      </div>

      <GymCard title="Visualización de Gráficos" variant="default">
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end pb-4 border-b border-[var(--color-border)]">
            <div className="lg:col-span-4 space-y-2">
              <p className="text-sm font-semibold text-[var(--color-text)]">Tipo de Gráfico</p>
              <div className="flex flex-wrap gap-2">
                {chartTypes.map(type => (
                  <motion.button
                    key={type.id}
                    onClick={() => setChartType(type.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm flex items-center gap-2 ${
                      chartType === type.id
                        ? 'bg-[var(--color-secondary)] text-white'
                        : 'bg-[var(--color-card-alt)] text-[var(--color-text)] hover:bg-[rgba(15,62,96,0.1)]'
                    }`}
                  >
                    {type.icon} {type.label}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-8 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--color-text)]">Filtrado por Período</p>
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="text-xs font-semibold text-red-500 hover:underline"
                  >
                    Limpiar Fechas
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <SimpleDateInput
                  label="Desde"
                  value={startDate}
                  onChange={(val) => setStartDate(val)}
                />
                <SimpleDateInput
                  label="Hasta"
                  value={endDate}
                  onChange={(val) => setEndDate(val)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-[var(--color-text)]">Seleccionar Métrica a Graficar</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              <div className="space-y-2.5 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-secondary)]" />
                  Gimnasio (Clientes)
                </div>
                <div className="flex flex-wrap gap-2">
                  {allMetrics.filter(m => m.category === 'gym').map(metric => (
                    <motion.button
                      key={metric.id}
                      onClick={() => setSelectedMetric(metric.id)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selectedMetric === metric.id
                          ? 'bg-[var(--color-secondary)] text-white shadow-sm ring-2 ring-[var(--color-secondary)]'
                          : 'bg-[var(--color-card)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[rgba(16,185,129,0.1)]'
                      }`}
                    >
                      {metric.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-secondary)]" />
                  Nutriología (Pacientes)
                </div>
                <div className="flex flex-wrap gap-2">
                  {allMetrics.filter(m => m.category === 'nutrition').map(metric => (
                    <motion.button
                      key={metric.id}
                      onClick={() => setSelectedMetric(metric.id)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selectedMetric === metric.id
                          ? 'bg-[var(--color-secondary)] text-white shadow-sm ring-2 ring-[var(--color-secondary)]'
                          : 'bg-[var(--color-card)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[rgba(16,185,129,0.1)]'
                      }`}
                    >
                      {metric.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-[var(--color-card-alt)] p-6 overflow-x-auto">
            {renderChart()}
          </div>
        </div>
      </GymCard>

      <GymCard title="Acciones Rápidas" variant="default">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <GymButton variant="secondary" size="lg" onClick={exportAllStatisticsCSV}>
            <span className="flex items-center justify-center gap-2"><IconDownload size={20} /> Exportar Reporte</span>
          </GymButton>
          <GymButton variant="primary" size="lg" onClick={handleShareKPIs}>
            <span className="flex items-center justify-center gap-2"><IconShare size={20} /> Compartir KPI</span>
          </GymButton>
          <GymButton variant="gold" size="lg" onClick={() => navigate('/whatsapp')}>
            <span className="flex items-center justify-center gap-2"><IconSpeakerphone size={20} /> Promociones</span>
          </GymButton>
          <GymButton variant="warning" size="lg" onClick={() => navigate('/whatsapp')}>
            <span className="flex items-center justify-center gap-2"><IconMessage size={20} /> Contactar Ausentes</span>
          </GymButton>
        </div>
      </GymCard>
    </div>
  );
}
