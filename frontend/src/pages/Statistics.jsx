import { useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '../components/ui/PageHeader';
import {
  IconTrendingUp,
  IconChartBar,
  IconChartPie,
  IconLoader,
  IconAlertCircle,
  IconMailbox,
  IconSparkles,
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
import {
  useMonthlyIncomeByMethod,
  useAbsentClients,
  useAlertClients,
  useExpiredClients,
  useNutritionPatientsToClients,
  useNutritionRetention3Months,
  useNutritionConsultationDurations,
  useNutritionIncomeReal,
  useMonthlyIncomeDetails,
  useNutritionPaidConsults,
  useRetainedClients,
  useConsistentClients,
  useAcquisitionOriginStats,
  useNutritionAppointmentStats,
  useAbsentPatients,
  useGymOnlyClients,
  useNutritionOnlyPatients,
  useGymToNutritionPatients,
  useNutritionEvaluationsList
} from '../hooks/useStatistics';
import { GymCard } from '../components/ui/GymCard';
import { GymButton } from '../components/ui/GymButton';
import { SimpleDateInput } from '../components/ui/SimpleDateInput';

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
  const [chartType, setChartType] = useState('bar');
  const [selectedMetric, setSelectedMetric] = useState('clientsByPlan');
  const [filterMetric, setFilterMetric] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selección de tarjetas interactiva para Tablas Cebra
  const [selectedGymCard, setSelectedGymCard] = useState('gymOnly');
  const [selectedNutritionCard, setSelectedNutritionCard] = useState('nutritionOnly');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Hooks de datos
  const { data, isLoading, error } = useComprehensiveStats(year, month);
  const { data: monthlyIncomeData } = useMonthlyIncomeByMethod(year, month);
  const { data: absentClients } = useAbsentClients();
  const { data: alertClients } = useAlertClients();
  const { data: expiredClients } = useExpiredClients();
  const { data: patientsToClients } = useNutritionPatientsToClients();
  const { data: retention3Months } = useNutritionRetention3Months();
  const { data: consultationDurations } = useNutritionConsultationDurations();
  const { data: nutritionIncomeReal } = useNutritionIncomeReal(year, month);
  const { data: monthlyIncomeDetails } = useMonthlyIncomeDetails(year, month);
  const { data: nutritionPaidConsults } = useNutritionPaidConsults(year, month);
  const { data: retentionClients } = useRetainedClients();
  const { data: acquisitionOriginData } = useAcquisitionOriginStats();

  // Nuevos hooks para la paridad simétrica y desgloses
  const { data: appointmentStats } = useNutritionAppointmentStats(year, month);
  const { data: absentPatients } = useAbsentPatients();
  const { data: gymOnlyClients } = useGymOnlyClients();
  const { data: nutritionOnlyPatients } = useNutritionOnlyPatients();
  const { data: gymToNutritionPatients } = useGymToNutritionPatients();
  const { data: nutritionEvaluationsList } = useNutritionEvaluationsList(year, month);

  if (error) {
    return (
      <div className="min-h-screen p-6 bg-[var(--color-surface)] flex items-center justify-center">
        <GymCard variant="danger" title="Error al Cargar Datos" noPad>
          <div className="p-6 space-y-4">
            <p className="text-[var(--color-text)] flex items-center gap-2">
              <IconAlertCircle size={24} className="text-red-500" /> {error.message}
            </p>
            <GymButton variant="primary" size="lg">Reintentar</GymButton>
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
    const formatted = typeof dateStr === 'string' && dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    if (startDate && formatted < startDate) return false;
    if (endDate && formatted > endDate) return false;
    return true;
  };

  const filteredAttendanceData = attendanceData.filter(d => isWithinDateRange(d.date));
  const filteredGymOnlyClients = (gymOnlyClients || []).filter(c => isWithinDateRange(c.created_at));
  const filteredNutritionOnlyPatients = (nutritionOnlyPatients || []).filter(p => isWithinDateRange(p.created_at));
  const filteredAbsentClients = (absentClients || []).filter(c => isWithinDateRange(c.created_at || c.last_attendance_date));
  const filteredAlertClients = (alertClients || []).filter(c => isWithinDateRange(c.created_at || c.last_attendance_date));
  const filteredExpiredClients = (expiredClients || []).filter(c => isWithinDateRange(c.end_date || c.created_at));
  const filteredAbsentPatients = (absentPatients || []).filter(p => isWithinDateRange(p.created_at || p.last_consultation_date));
  const filteredPatientsToClients = (patientsToClients || []).filter(p => isWithinDateRange(p.conversion_date || p.created_at));

  const rawEvalsList = Array.isArray(nutritionEvaluationsList) 
    ? nutritionEvaluationsList 
    : (nutritionEvaluationsList?.data || []);
  const filteredNutritionEvaluations = rawEvalsList.filter(e => isWithinDateRange(e.evaluation_date || e.created_at));

  const filteredMonthlyIncomeDetails = (monthlyIncomeDetails || []).filter(p => isWithinDateRange(p.payment_date || p.created_at));

  const filteredIncomeMethodData = isDateFilterActive
    ? (isInvalidRange ? [] : [
        { name: 'Efectivo', value: filteredMonthlyIncomeDetails.filter(d => d.payment_method === 'cash').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0) },
        { name: 'Transferencia', value: filteredMonthlyIncomeDetails.filter(d => d.payment_method === 'transfer').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0) },
        { name: 'Tarjeta', value: filteredMonthlyIncomeDetails.filter(d => d.payment_method === 'card').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0) }
      ].filter(d => d.value > 0))
    : incomeMethodData;

  const totalFilteredIncome = filteredIncomeMethodData.reduce((acc, curr) => acc + curr.value, 0);
  const filteredPaymentData = isDateFilterActive
    ? filteredIncomeMethodData.map(d => ({
        name: d.name,
        value: totalFilteredIncome > 0 ? Math.round((d.value / totalFilteredIncome) * 100) : 0,
        total: d.value
      }))
    : paymentData;

  const filteredPlansData = isDateFilterActive
    ? (isInvalidRange ? [] : (gymOnlyClients || []).filter(c => isWithinDateRange(c.created_at)).reduce((acc, client) => {
        const plan = client.plan_name || 'Sin plan';
        const existing = acc.find(item => item.name === plan);
        if (existing) existing.value += 1;
        else acc.push({ name: plan, value: 1 });
        return acc;
      }, []))
    : plansData;

  const filteredSexDataClients = isDateFilterActive
    ? (isInvalidRange ? [] : (gymOnlyClients || []).filter(c => isWithinDateRange(c.created_at)).reduce((acc, c) => {
        const sex = c.sex === 'M' ? 'Masculino' : c.sex === 'F' ? 'Femenino' : 'Sin dato';
        const existing = acc.find(item => item.name === sex);
        if (existing) existing.value += 1;
        else acc.push({ name: sex, value: 1 });
        return acc;
      }, []))
    : sexDataClients;

  const filteredAgeDataClients = isDateFilterActive
    ? (isInvalidRange ? [] : (gymOnlyClients || []).filter(c => isWithinDateRange(c.created_at)).reduce((acc, c) => {
        const range = c.age ? (c.age < 18 ? '<18' : c.age <= 25 ? '18-25' : c.age <= 35 ? '26-35' : c.age <= 50 ? '36-50' : '50+') : 'Sin dato';
        const existing = acc.find(item => item.name === range);
        if (existing) existing.value += 1;
        else acc.push({ name: range, value: 1 });
        return acc;
      }, []))
    : ageDataClients;

  const filteredSexDataPatients = isDateFilterActive
    ? (isInvalidRange ? [] : (nutritionOnlyPatients || []).filter(p => isWithinDateRange(p.created_at)).reduce((acc, p) => {
        const sex = p.sex === 'M' ? 'Masculino' : p.sex === 'F' ? 'Femenino' : 'Sin dato';
        const existing = acc.find(item => item.name === sex);
        if (existing) existing.value += 1;
        else acc.push({ name: sex, value: 1 });
        return acc;
      }, []))
    : sexDataPatients;

  const filteredAgeDataPatients = isDateFilterActive
    ? (isInvalidRange ? [] : (nutritionOnlyPatients || []).filter(p => isWithinDateRange(p.created_at)).reduce((acc, p) => {
        const range = p.age ? (p.age < 18 ? '<18' : p.age <= 25 ? '18-25' : p.age <= 35 ? '26-35' : p.age <= 50 ? '36-50' : '50+') : 'Sin dato';
        const existing = acc.find(item => item.name === range);
        if (existing) existing.value += 1;
        else acc.push({ name: range, value: 1 });
        return acc;
      }, []))
    : ageDataPatients;

  const chartConfig = {
    // Gimnasio (Clientes)
    clientsByPlan: { data: filteredPlansData, title: 'Distribución de Clientes por Plan', dataKey: 'value', nameKey: 'name' },
    gymOnly: {
      data: [
        { name: 'Solo Gimnasio', value: filteredGymOnlyClients.length },
        { name: 'Otros clientes', value: isDateFilterActive ? 0 : Math.max((acquisitionOriginData?.total_clients || 0) - filteredGymOnlyClients.length, 0) }
      ].filter(d => d.value > 0),
      title: 'Origen: Solo Gimnasio', dataKey: 'value', nameKey: 'name'
    },
    nutToGym: {
      data: [{ name: 'Nutrición → Gimnasio', value: filteredPatientsToClients.length }],
      title: 'Conversión: Nutrición a Gimnasio', dataKey: 'value', nameKey: 'name'
    },
    retentionRate: {
      data: isDateFilterActive
        ? [{ name: 'Retención en período', value: (retentionClients || []).filter(r => isWithinDateRange(r.created_at)).length }]
        : [
            { name: 'Retención', value: parseFloat(kpis.retention?.retention_percentage) || 0 },
            { name: 'No retenidos', value: Math.max((parseFloat(kpis.retention?.total_clients) || 0) - (parseFloat(kpis.retention?.retained_clients) || 0), 0) }
          ],
      title: 'Retención de Clientes', dataKey: 'value', nameKey: 'name'
    },
    monthlyIncome: { data: filteredIncomeMethodData, title: 'Ingresos Efectivos (Gimnasio)', dataKey: 'value', nameKey: 'name' },
    paymentMethods: { data: filteredPaymentData, title: 'Origen de Ingresos', dataKey: 'value', nameKey: 'name' },
    attendance: { data: filteredAttendanceData, title: 'Asistencia Diaria', dataKey: 'visitantes', nameKey: 'date' },
    absentClients: {
      data: filteredAbsentClients.reduce((acc, client) => {
        const plan = client.plan_name || 'Sin plan';
        const existing = acc.find(item => item.name === plan);
        if (existing) existing.value += 1;
        else acc.push({ name: plan, value: 1 });
        return acc;
      }, []),
      title: 'Clientes Ausentes por Plan', dataKey: 'value', nameKey: 'name'
    },
    alertClients: {
      data: filteredAlertClients.reduce((acc, client) => {
        const plan = client.plan_name || 'Sin plan';
        const existing = acc.find(item => item.name === plan);
        if (existing) existing.value += 1;
        else acc.push({ name: plan, value: 1 });
        return acc;
      }, []),
      title: 'Clientes en Alerta por Plan', dataKey: 'value', nameKey: 'name'
    },
    expiredClients: {
      data: filteredExpiredClients.reduce((acc, client) => {
        const plan = client.plan_name || 'Sin plan';
        const existing = acc.find(item => item.name === plan);
        if (existing) existing.value += 1;
        else acc.push({ name: plan, value: 1 });
        return acc;
      }, []),
      title: 'Anualidad Vencida por Plan', dataKey: 'value', nameKey: 'name'
    },
    sexDistributionClients: { data: filteredSexDataClients, title: 'Distribución por Sexo (Clientes)', dataKey: 'value', nameKey: 'name' },
    ageDistributionClients: { data: filteredAgeDataClients, title: 'Distribución por Edad (Clientes)', dataKey: 'value', nameKey: 'name' },

    // Nutriología (Pacientes)
    nutritionOnly: {
      data: [
        { name: 'Solo Nutrición', value: filteredNutritionOnlyPatients.length },
        { name: 'Otros pacientes', value: isDateFilterActive ? 0 : Math.max((acquisitionOriginData?.total_patients || 0) - filteredNutritionOnlyPatients.length, 0) }
      ].filter(d => d.value > 0),
      title: 'Origen: Solo Nutrición', dataKey: 'value', nameKey: 'name'
    },
    gymToNut: {
      data: [{ name: 'Gimnasio → Nutrición', value: isDateFilterActive ? (isInvalidRange ? 0 : (acquisitionOriginData?.gimnasio_to_nutricion || 0)) : (acquisitionOriginData?.gimnasio_to_nutricion || 0) }],
      title: 'Conversión: Gimnasio a Nutrición', dataKey: 'value', nameKey: 'name'
    },
    nutritionRetention: {
      data: isDateFilterActive
        ? [{ name: '3+ Consultas en período', value: (retention3Months || []).filter(r => isWithinDateRange(r.created_at)).length }]
        : [
            { name: '3+ Consultas', value: (retention3Months || []).length },
            { name: 'Resto', value: Math.max((consultationDurations?.total_patients || 0) - (retention3Months || []).length, 0) }
          ],
      title: 'Retención de Pacientes', dataKey: 'value', nameKey: 'name'
    },
    nutritionIncome: {
      data: isDateFilterActive
        ? [{ name: 'Evaluaciones / Consultas', value: filteredNutritionEvaluations.length * 500 }]
        : (nutritionIncomeReal?.by_method?.map(d => ({
            name: d.payment_method === 'cash' ? 'Efectivo' : d.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta',
            value: parseFloat(d.total) || 0
          })) || []),
      title: 'Ingresos del Consultorio (Nutrición)', dataKey: 'value', nameKey: 'name'
    },
    absentPatients: {
      data: [{ name: 'Ausentes (30+ días)', value: filteredAbsentPatients.length }],
      title: 'Pacientes Ausentes (30+ días)', dataKey: 'value', nameKey: 'name'
    },
    nutritionEvaluations: {
      data: [{ name: 'Evaluaciones en Período', value: filteredNutritionEvaluations.length }],
      title: 'Evaluaciones Realizadas en el Período', dataKey: 'value', nameKey: 'name'
    },
    nutritionConsultations: {
      data: [
        { name: 'Evaluaciones en Período', value: filteredNutritionEvaluations.length }
      ],
      title: 'Seguimiento de Pacientes por Tiempo', dataKey: 'value', nameKey: 'name'
    },
    sexDistributionPatients: { data: filteredSexDataPatients, title: 'Distribución por Sexo (Pacientes)', dataKey: 'value', nameKey: 'name' },
    ageDistributionPatients: { data: filteredAgeDataPatients, title: 'Distribución por Edad (Pacientes)', dataKey: 'value', nameKey: 'name' },
    appointmentStats: {
      data: isDateFilterActive
        ? [{ name: 'Consultas / Citas en Período', value: filteredNutritionEvaluations.length }]
        : [
            { name: 'Citas Hoy', value: appointmentStats?.today || 0 },
            { name: 'Citas Mes', value: appointmentStats?.month || 0 },
            { name: 'Citas Año', value: appointmentStats?.year || 0 }
          ],
      title: 'Control de Citas / Agendas Nutrición', dataKey: 'value', nameKey: 'name'
    }
  };

  // Helper para generar los datos de la Tabla Cebra del Gimnasio (Clientes)
  const getGymTableData = () => {
    switch (selectedGymCard) {
      case 'gymOnly':
        return {
          title: 'Origen: Solo Gimnasio',
          headers: ['Cliente', 'Teléfono / Plan', 'Fecha Registro'],
          rows: (gymOnlyClients || []).map(c => ({
            name: `${c.first_name} ${c.last_name || ''}`,
            phone: `${c.phone || 'Sin tel.'} • ${c.plan_name || 'Sin plan'}`,
            detail: new Date(c.created_at).toLocaleDateString('es-MX')
          }))
        };
      case 'nutToGym':
        return {
          title: 'Conversión: Nutrición → Gimnasio',
          headers: ['Cliente', 'Teléfono', 'Consultas Previas'],
          rows: (patientsToClients || []).map(p => ({
            name: `${p.first_name} ${p.last_name || ''}`,
            phone: p.phone || 'Sin teléfono',
            detail: `${p.total_consultations || 0} consulta(s)`
          }))
        };
      case 'retentionRate':
        return {
          title: 'Retención de Clientes',
          headers: ['Cliente', 'Teléfono / Plan', 'Permanencia'],
          rows: (retentionClients || []).map(r => ({
            name: `${r.first_name} ${r.last_name || ''}`,
            phone: `${r.phone || 'Sin tel.'} • ${r.plan_name || 'Sin plan'}`,
            detail: `${r.consecutive_months || 0} meses seguidos`
          }))
        };
      case 'monthlyIncome':
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
      case 'absentClients':
        return {
          title: 'Clientes Ausentes',
          headers: ['Cliente', 'Plan / Anualidad', 'Inasistencia'],
          rows: (absentClients || []).map(a => ({
            name: `${a.first_name} ${a.last_name || ''}`,
            phone: a.plan_name || 'Sin plan',
            detail: `${a.days_without_attendance || 'Sin datos'} días`
          }))
        };
      case 'alertClients':
        return {
          title: 'Clientes en Alerta',
          headers: ['Cliente', 'Teléfono', 'Sin Asistir'],
          rows: (alertClients || []).map(a => ({
            name: `${a.first_name} ${a.last_name || ''}`,
            phone: a.phone || 'Sin teléfono',
            detail: `${a.days_without_attendance || 0} días`
          }))
        };
      case 'expiredClients':
        return {
          title: 'Anualidad Vencida',
          headers: ['Cliente', 'Teléfono', 'Estado'],
          rows: (expiredClients || []).map(e => ({
            name: `${e.first_name} ${e.last_name || ''}`,
            phone: e.phone || 'Sin teléfono',
            detail: e.plan_name || 'Vencido'
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
    switch (selectedNutritionCard) {
      case 'nutritionOnly':
        return {
          title: 'Origen: Solo Nutrición',
          headers: ['Paciente', 'Teléfono', 'Fecha Registro'],
          rows: (nutritionOnlyPatients || []).map(p => ({
            name: `${p.first_name} ${p.last_name || ''}`,
            phone: p.phone || 'Sin teléfono',
            detail: new Date(p.created_at).toLocaleDateString('es-MX')
          }))
        };
      case 'gymToNut':
        return {
          title: 'Conversión: Gimnasio → Nutrición',
          headers: ['Paciente', 'Teléfono', 'Origen'],
          rows: (gymToNutritionPatients || []).map(p => ({
            name: `${p.first_name} ${p.last_name || ''}`,
            phone: p.phone || 'Sin teléfono',
            detail: 'Cliente Gimnasio'
          }))
        };
      case 'nutritionRetention':
        return {
          title: 'Retención de Pacientes',
          headers: ['Paciente', 'Teléfono', 'Consultas'],
          rows: (retention3Months || []).map(r => ({
            name: `${r.first_name} ${r.last_name || ''}`,
            phone: r.phone || 'Sin teléfono',
            detail: `${r.total_consults || 0} consulta(s)`
          }))
        };
      case 'nutritionIncome':
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
      case 'absentPatients':
        return {
          title: 'Pacientes Ausentes (30+ días)',
          headers: ['Paciente', 'Teléfono', 'Sin Consulta'],
          rows: (absentPatients || []).map(a => ({
            name: `${a.first_name} ${a.last_name || ''}`,
            phone: a.phone || 'Sin teléfono',
            detail: a.status_text || 'Sin consulta reciente'
          }))
        };
      case 'nutritionEvaluations':
        const rawEvals = Array.isArray(nutritionEvaluationsList) 
          ? nutritionEvaluationsList 
          : (nutritionEvaluationsList?.data || []);

        return {
          title: 'Evaluaciones Realizadas en el Mes',
          headers: ['Paciente', 'Teléfono / Detalle', 'Fecha de Evaluación'],
          rows: rawEvals.map(e => ({
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

  const exportAllStatisticsCSV = () => {
    const lines = [];

    // Metadatos de cabecera
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
    lines.push(`Origen: Solo Gimnasio,${acquisitionOriginData?.gimnasio_only || 0},${acquisitionOriginData?.percentages?.gimnasio_only || 0}% del total`);
    lines.push(`Nutrición -> Gimnasio,${acquisitionOriginData?.nutricion_to_gimnasio || 0},${acquisitionOriginData?.percentages?.nutricion_to_gimnasio || 0}% conversiones`);
    lines.push(`Retención de Clientes,${kpis.retention?.retention_percentage || 0}%,${kpis.retention?.retained_clients || 0} clientes retenidos`);
    lines.push(`Ingresos del Mes (Gimnasio),$${(totalIncome || 0).toLocaleString('es-MX')},${incomeByMethod.length} métodos de pago`);
    lines.push(`Clientes Ausentes,${absentClients?.length || 0},Anualidad activa sin mensualidad`);
    lines.push(`Clientes en Alerta,${alertClients?.length || 0},15+ días sin asistir`);
    lines.push(`Anualidad Vencida,${expiredClients?.length || 0},Sin renovación`);
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
    lines.push(`Origen: Solo Nutrición,${acquisitionOriginData?.nutricion_only || 0},${acquisitionOriginData?.percentages?.nutricion_only || 0}% del total`);
    lines.push(`Gimnasio -> Nutrición,${acquisitionOriginData?.gimnasio_to_nutricion || 0},${acquisitionOriginData?.percentages?.gimnasio_to_nutricion || 0}% conversiones`);
    lines.push(`Retención de Pacientes,${(retention3Months || []).length || 0},3+ consultas realizadas`);
    lines.push(`Ingresos del Mes (Consultorio),$${(nutritionIncomeReal?.total || 0).toLocaleString('es-MX')},Pagos reales consultorio`);
    lines.push(`Pacientes Ausentes,${absentPatients?.length || 0},30+ días sin consulta`);
    lines.push(`Evaluaciones Realizadas,${kpis.nutritionStats?.total_evaluations || 0},Evaluaciones registradas en el mes`);
    lines.push(`Seguimiento Pacientes,${consultationDurations?.consulted_patients || 0},Con al menos 1 consulta`);
    lines.push('');

    // DESGLOSE DE INGRESOS CONSULTORIO POR MÉTODO DE PAGO
    lines.push(`--- DESGLOSE DE INGRESOS CONSULTORIO NUTRICIÓN ---`);
    lines.push(`Método de Pago,Transacciones,Monto Total`);
    (nutritionIncomeReal?.by_method || []).forEach(b => {
      const method = b.payment_method === 'cash' ? 'Efectivo' : b.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta';
      lines.push(`${method},${b.count || 0},$${parseFloat(b.total || 0).toLocaleString('es-MX')}`);
    });
    lines.push('');

    // LISTADO DETALLADO DE CLIENTES SOLO GIMNASIO
    lines.push(`--- LISTADO DE CLIENTES (SOLO GIMNASIO) ---`);
    lines.push(`Nombre,Teléfono,Plan,Fecha Registro`);
    (gymOnlyClients || []).forEach(c => {
      lines.push(`"${c.first_name} ${c.last_name || ''}","${c.phone || 'Sin tel.'}","${c.plan_name || 'Sin plan'}","${c.created_at ? new Date(c.created_at).toLocaleDateString('es-MX') : ''}"`);
    });
    lines.push('');

    // LISTADO DETALLADO DE PACIENTES SOLO NUTRICIÓN
    lines.push(`--- LISTADO DE PACIENTES (SOLO NUTRICIÓN) ---`);
    lines.push(`Nombre,Teléfono,Fecha Registro`);
    (nutritionOnlyPatients || []).forEach(p => {
      lines.push(`"${p.first_name} ${p.last_name || ''}","${p.phone || 'Sin tel.'}","${p.created_at ? new Date(p.created_at).toLocaleDateString('es-MX') : ''}"`);
    });
    lines.push('');

    // LISTADO DETALLADO DE EVALUACIONES REALIZADAS
    lines.push(`--- LISTADO DE EVALUACIONES DE NUTRICIÓN REALIZADAS ---`);
    lines.push(`Nombre,Teléfono,IMC,Fecha Evaluación`);
    const rawEvals = Array.isArray(nutritionEvaluationsList) ? nutritionEvaluationsList : (nutritionEvaluationsList?.data || []);
    rawEvals.forEach(e => {
      lines.push(`"${e.first_name} ${e.last_name || ''}","${e.phone || 'Sin tel.'}","${e.bmi || 'N/A'}","${e.evaluation_date ? new Date(e.evaluation_date).toLocaleDateString('es-MX') : ''}"`);
    });

    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Estadisticas_Generales_PimponGym_${year}_${month}.csv`);
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
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <motion.div whileHover={{ scale: 1.02 }}>
              <GymCard title="Visitas del Día" subtitle="Asistencias registradas hoy" variant="success" noPad>
                <div className="p-5">
                  <p className="text-3xl font-bold text-[var(--color-text)]">{kpis.visitStats?.today || 0}</p>
                </div>
              </GymCard>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }}>
              <GymCard title="Visitas del Mes" subtitle="Asistencias acumuladas del mes" variant="success" noPad>
                <div className="p-5">
                  <p className="text-3xl font-bold text-[var(--color-text)]">{kpis.visitStats?.month || 0}</p>
                </div>
              </GymCard>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }}>
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
                value: acquisitionOriginData?.gimnasio_only || 0,
                subtitle: `${acquisitionOriginData?.percentages?.gimnasio_only || 0}% del total`,
                variant: 'default',
                color: 'text-[var(--color-secondary)]'
              },
              {
                id: 'nutToGym',
                title: 'Nutrición → Gimnasio',
                value: acquisitionOriginData?.nutricion_to_gimnasio || 0,
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
                subtitle: `${incomeByMethod.length} métodos`,
                variant: 'success',
                color: 'text-[var(--color-success)]'
              },
              {
                id: 'absentClients',
                title: 'Clientes Ausentes',
                value: absentClients?.length || 0,
                subtitle: 'Anualidad sin mensualidad',
                variant: 'default',
                color: 'text-[var(--color-secondary)]'
              },
              {
                id: 'alertClients',
                title: 'Clientes en Alerta',
                value: alertClients?.length || 0,
                subtitle: '15+ días sin asistir',
                variant: 'danger',
                color: 'text-red-500'
              },
              {
                id: 'expiredClients',
                title: 'Anualidad Vencida',
                value: expiredClients?.length || 0,
                subtitle: 'Sin renovación',
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

          {/* Tabla Cebra Dinámica de Clientes (Columna Derecha) */}
          <div className="lg:col-span-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden shadow-sm sticky top-6">
            <div className="bg-[var(--color-surface)] p-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h4 className="font-bold text-[var(--color-text)] flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-secondary)]" />
                {gymTableData.title}
              </h4>
              <span className="text-xs font-semibold px-2 py-1 rounded bg-[rgba(15,62,96,0.1)] text-[var(--color-secondary)]">
                {gymTableData.rows.length} cliente(s)
              </span>
            </div>

            {gymTableData.rows.length === 0 ? (
              <div className="p-8 text-center text-[var(--color-text-muted)] text-sm space-y-2">
                <IconUsers size={32} className="mx-auto opacity-40" />
                <p>Selecciona una tarjeta para ver el listado detallado de clientes.</p>
              </div>
            ) : (
              <div className="max-h-[520px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-[var(--color-card-alt)] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">{gymTableData.headers[0]}</th>
                      <th className="py-3 px-4">{gymTableData.headers[1]}</th>
                      <th className="py-3 px-4 text-right">{gymTableData.headers[2]}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {gymTableData.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`${
                          idx % 2 === 0 ? 'bg-[var(--color-card)]' : 'bg-[var(--color-card-alt)]/50'
                        } hover:bg-[rgba(15,62,96,0.08)] transition-colors`}
                      >
                        <td className="py-3 px-4 font-semibold text-[var(--color-text)]">{row.name}</td>
                        <td className="py-3 px-4 text-[var(--color-text-muted)]">{row.phone}</td>
                        <td className="py-3 px-4 text-right font-medium text-[var(--color-secondary)]">{row.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <motion.div whileHover={{ scale: 1.02 }}>
              <GymCard title="Citas del Día" subtitle="Consultas agendadas hoy" variant="default" noPad>
                <div className="p-5">
                  <p className="text-3xl font-bold text-[var(--color-secondary)]">{appointmentStats?.today || 0}</p>
                </div>
              </GymCard>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }}>
              <GymCard title="Citas del Mes" subtitle="Consultas acumuladas del mes" variant="default" noPad>
                <div className="p-5">
                  <p className="text-3xl font-bold text-[var(--color-secondary)]">{appointmentStats?.month || 0}</p>
                </div>
              </GymCard>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }}>
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
                value: acquisitionOriginData?.nutricion_only || 0,
                subtitle: `${acquisitionOriginData?.percentages?.nutricion_only || 0}% del total`,
                variant: 'default',
                color: 'text-[var(--color-secondary)]'
              },
              {
                id: 'gymToNut',
                title: 'Gimnasio → Nutrición',
                value: acquisitionOriginData?.gimnasio_to_nutricion || 0,
                subtitle: `${acquisitionOriginData?.percentages?.gimnasio_to_nutricion || 0}% conversiones`,
                variant: 'success',
                color: 'text-[var(--color-success)]'
              },
              {
                id: 'nutritionRetention',
                title: 'Retención de Pacientes',
                value: (retention3Months || []).length || 0,
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
                value: absentPatients?.length || 0,
                subtitle: '30+ días sin consulta',
                variant: 'default',
                color: 'text-[var(--color-secondary)]'
              },
              {
                id: 'nutritionEvaluations',
                title: 'Evaluaciones Realizadas',
                value: kpis.nutritionStats?.total_evaluations || 0,
                subtitle: 'Evaluaciones en el mes',
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

          {/* Tabla Cebra Dinámica de Pacientes (Columna Derecha) */}
          <div className="lg:col-span-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden shadow-sm sticky top-6">
            <div className="bg-[var(--color-surface)] p-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h4 className="font-bold text-[var(--color-text)] flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-secondary)]" />
                {nutritionTableData.title}
              </h4>
              <span className="text-xs font-semibold px-2 py-1 rounded bg-[rgba(16,185,129,0.1)] text-[var(--color-secondary)]">
                {nutritionTableData.rows.length} paciente(s)
              </span>
            </div>

            {nutritionTableData.rows.length === 0 ? (
              <div className="p-8 text-center text-[var(--color-text-muted)] text-sm space-y-2">
                <IconStethoscope size={32} className="mx-auto opacity-40" />
                <p>Selecciona una tarjeta para ver el listado detallado de pacientes.</p>
              </div>
            ) : (
              <div className="max-h-[520px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-[var(--color-card-alt)] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">{nutritionTableData.headers[0]}</th>
                      <th className="py-3 px-4">{nutritionTableData.headers[1]}</th>
                      <th className="py-3 px-4 text-right">{nutritionTableData.headers[2]}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {nutritionTableData.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`${
                          idx % 2 === 0 ? 'bg-[var(--color-card)]' : 'bg-[var(--color-card-alt)]/50'
                        } hover:bg-[rgba(16,185,129,0.08)] transition-colors`}
                      >
                        <td className="py-3 px-4 font-semibold text-[var(--color-text)]">{row.name}</td>
                        <td className="py-3 px-4 text-[var(--color-text-muted)]">{row.phone}</td>
                        <td className="py-3 px-4 text-right font-medium text-[var(--color-secondary)]">{row.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
          {/* Cabecera integrada: Tipo de Gráfico y Filtrado por Período lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end pb-4 border-b border-[var(--color-border)]">
            {/* Tipo de Gráfico (Izquierda) */}
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

            {/* Filtrado por Período (Derecha) usando SimpleDateInput */}
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

          {/* Selección de Métricas agrupadas lado a lado */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[var(--color-text)]">Seleccionar Métrica a Graficar</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {/* Panel Gimnasio (Clientes) */}
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

              {/* Panel Nutriología (Pacientes) */}
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
          <GymButton variant="primary" size="lg">
            <span className="flex items-center justify-center gap-2"><IconShare size={20} /> Compartir KPI</span>
          </GymButton>
          <GymButton variant="gold" size="lg">
            <span className="flex items-center justify-center gap-2"><IconSpeakerphone size={20} /> Promociones</span>
          </GymButton>
          <GymButton variant="warning" size="lg">
            <span className="flex items-center justify-center gap-2"><IconMessage size={20} /> Contactar Ausentes</span>
          </GymButton>
        </div>
      </GymCard>
    </div>
  );
}
