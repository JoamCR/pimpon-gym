import { useState } from 'react';
import { motion } from 'framer-motion';
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
  IconMessage
} from '@tabler/icons-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useComprehensiveStats } from '../hooks/useStatistics';
import {
  useMonthlyIncomeByMethod,
  useNutritionConversionPaid,
  useAbsentClients,
  useAlertClients,
  useNutritionFreeToConversion,
  useNutritionPatientsToClients,
  useNutritionRetention3Months,
  useNutritionConsultationDurations,
  useNutritionIncomeReal,
  useMonthlyIncomeDetails,
  useRetainedClients,
  useNutritionFreeConsults,
  useNutritionPaidConsults,
  useConsistentClients
} from '../hooks/useStatistics';
import { GymCard } from '../components/ui/GymCard';
import { GymButton } from '../components/ui/GymButton';

const COLORS = ['#0F3E60', '#E29A00', '#16A34A', '#DC2626', '#0D1B2A', '#8B5CF6'];

const chartTypes = [
  { id: 'bar', label: 'Barras', icon: <IconChartBar size={20} /> },
  { id: 'pie', label: 'Pastel', icon: <IconChartPie size={20} /> },
];

const allMetrics = [
  { id: 'clientsByPlan', label: 'Clientes por Plan', category: 'gym' },
  { id: 'retentionRate', label: 'Retención de Clientes', category: 'gym' },
  { id: 'monthlyIncome', label: 'Ingreso de Efectivo del Mes', category: 'gym' },
  { id: 'paymentMethods', label: 'Origen de Ingresos', category: 'gym' },
  { id: 'ageDistributionClients', label: 'Edad de Clientes', category: 'gym' },
  { id: 'sexDistributionClients', label: 'Sexo de Clientes', category: 'gym' },
  { id: 'ageDistributionPatients', label: 'Edad de Pacientes', category: 'nutrition' },
  { id: 'sexDistributionPatients', label: 'Sexo de Pacientes', category: 'nutrition' },
  { id: 'absentClients', label: 'Clientes Ausentes', category: 'gym' },
  { id: 'alertClients', label: 'Clientes en Alerta', category: 'gym' },
  { id: 'nutritionFreeConsults', label: 'Consultas Gratuitas', category: 'nutrition' },
  { id: 'nutritionPaidConsults', label: 'Consultas Pagadas', category: 'nutrition' },
  { id: 'nutritionFreePaidConversion', label: 'Conversión Gratuita → Pago', category: 'nutrition' },
  { id: 'nutritionPatientsToClients', label: 'Pacientes → Clientes', category: 'nutrition' },
  { id: 'nutritionRetention', label: 'Retención de Pacientes', category: 'nutrition' },
  { id: 'nutritionIncome', label: 'Ingresos del Consultorio', category: 'nutrition' },
];

export default function Statistics() {
  const [chartType, setChartType] = useState('bar');
  const [selectedMetric, setSelectedMetric] = useState('clientsByPlan');
  const [filterMetric, setFilterMetric] = useState('all');
  const [selectedCard, setSelectedCard] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entityType, setEntityType] = useState('clients');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Cargar todos los datos
  const { data, isLoading, error } = useComprehensiveStats(year, month);
  const { data: monthlyIncomeData } = useMonthlyIncomeByMethod(year, month);
  const { data: nutritionConversionPaid } = useNutritionConversionPaid();
  const { data: absentClients } = useAbsentClients();
  const { data: alertClients } = useAlertClients();
  const { data: freeToConversion } = useNutritionFreeToConversion();
  const { data: patientsToClients } = useNutritionPatientsToClients();
  const { data: retention3Months } = useNutritionRetention3Months();
  const { data: consultationDurations } = useNutritionConsultationDurations();
  const { data: nutritionIncomeReal } = useNutritionIncomeReal(year, month);
  const { data: monthlyIncomeDetails } = useMonthlyIncomeDetails(year, month);
  const { data: nutritionFreeConsults } = useNutritionFreeConsults(year, month);
  const { data: nutritionPaidConsults } = useNutritionPaidConsults(year, month);
  const { data: retentionClients } = useRetainedClients();
  const { data: consistentClients } = useConsistentClients(6);

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
        <p className="ml-4 text-[var(--color-text-muted)]">Cargando estadísticas...</p>
      </div>
    );
  }

  const stats = data || {};
  const kpis = stats.kpis || {};
  const charts = stats.charts || {};

  // Calcular totales
  const totalIncome = monthlyIncomeData?.total || 0;
  const incomeByMethod = monthlyIncomeData?.payment_breakdown || [];

  // Preparar datos para gráficos
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
    name: d.sex,
    value: parseInt(d.count, 10) || 0
  }));

  const ageDataPatients = (charts.ageDistributionPatients || []).map(d => ({
    name: d.age_range,
    value: parseInt(d.count, 10) || 0
  }));

  const sexDataPatients = (charts.sexDistributionPatients || []).map(d => ({
    name: d.sex,
    value: parseInt(d.count, 10) || 0
  }));

  const incomeMethodData = incomeByMethod.map(d => ({
    name: d.payment_method === 'cash' ? 'Efectivo' : d.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta',
    value: parseFloat(d.total) || 0
  }));

  const chartConfig = {
    clientsByPlan: {
      data: plansData,
      title: 'Distribución de Clientes por Plan',
      dataKey: 'value',
      nameKey: 'name'
    },
    retentionRate: {
      data: [
        { name: 'Retención', value: parseFloat(kpis.retention?.retention_percentage) || 0 },
        { name: 'No retenidos', value: Math.max((parseFloat(kpis.retention?.total_clients) || 0) - (parseFloat(kpis.retention?.retained_clients) || 0), 0) }
      ],
      title: 'Retención de Clientes',
      dataKey: 'value',
      nameKey: 'name'
    },
    monthlyIncome: {
      data: incomeMethodData,
      title: 'Ingreso de Efectivo del Mes',
      dataKey: 'value',
      nameKey: 'name'
    },
    paymentMethods: {
      data: paymentData,
      title: 'Origen de Ingresos',
      dataKey: 'value',
      nameKey: 'name'
    },
    attendance: {
      data: attendanceData,
      title: 'Asistencia Diaria (últimos 30 días)',
      dataKey: 'visitantes',
      nameKey: 'date'
    },
    ageDistributionClients: {
      data: ageDataClients,
      title: 'Distribución por Edad (Clientes)',
      dataKey: 'value',
      nameKey: 'name'
    },
    sexDistributionClients: {
      data: sexDataClients,
      title: 'Distribución por Sexo (Clientes)',
      dataKey: 'value',
      nameKey: 'name'
    },
    ageDistributionPatients: {
      data: ageDataPatients,
      title: 'Distribución por Edad (Pacientes)',
      dataKey: 'value',
      nameKey: 'name'
    },
    sexDistributionPatients: {
      data: sexDataPatients,
      title: 'Distribución por Sexo (Pacientes)',
      dataKey: 'value',
      nameKey: 'name'
    },
    absentClients: {
      data: (absentClients || []).reduce((acc, client) => {
        const plan = client.plan_name || 'Sin plan';
        const existing = acc.find(item => item.name === plan);
        if (existing) existing.value += 1;
        else acc.push({ name: plan, value: 1 });
        return acc;
      }, []),
      title: 'Clientes Ausentes por Plan',
      dataKey: 'value',
      nameKey: 'name'
    },
    alertClients: {
      data: (alertClients || []).reduce((acc, client) => {
        const plan = client.plan_name || 'Sin plan';
        const existing = acc.find(item => item.name === plan);
        if (existing) existing.value += 1;
        else acc.push({ name: plan, value: 1 });
        return acc;
      }, []),
      title: 'Clientes en Alerta por Plan',
      dataKey: 'value',
      nameKey: 'name'
    },
    nutritionFreeConsults: {
      data: [{ name: 'Gratuitas', value: kpis.nutritionStats?.free_consults || 0 }],
      title: 'Consultas Gratuitas',
      dataKey: 'value',
      nameKey: 'name'
    },
    nutritionPaidConsults: {
      data: [{ name: 'Pagadas', value: kpis.nutritionStats?.paid_consults || 0 }],
      title: 'Consultas Pagadas',
      dataKey: 'value',
      nameKey: 'name'
    },
    nutritionFreePaidConversion: {
      data: [
        { name: 'Convertidos', value: nutritionConversionPaid?.with_paid_nutrition || 0 },
        { name: 'No convertidos', value: Math.max((nutritionConversionPaid?.total_gym_clients || 0) - (nutritionConversionPaid?.with_paid_nutrition || 0), 0) }
      ],
      title: 'Conversión Gratuita → Pago',
      dataKey: 'value',
      nameKey: 'name'
    },
    nutritionPatientsToClients: {
      data: [
        { name: 'Convertidos', value: (patientsToClients || []).length },
        { name: 'Resto de pacientes', value: 0 }
      ],
      title: 'Pacientes → Clientes',
      dataKey: 'value',
      nameKey: 'name'
    },
    nutritionRetention: {
      data: [
        { name: '3+ Consultas', value: (retention3Months || []).length },
        { name: 'Resto', value: Math.max((consultationDurations?.total_patients || 0) - (retention3Months || []).length, 0) }
      ],
      title: 'Retención de Pacientes',
      dataKey: 'value',
      nameKey: 'name'
    },
    nutritionIncome: {
      data: nutritionIncomeReal?.by_method?.map(d => ({
        name: d.payment_method === 'cash' ? 'Efectivo' : d.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta',
        value: parseFloat(d.total) || 0
      })) || [],
      title: 'Ingresos del Consultorio',
      dataKey: 'value',
      nameKey: 'name'
    }
  };

  const renderSelectedDetail = () => {
    const sharedLists = {
      absentClients,
      alertClients,
      nutritionFreePaidConversion: freeToConversion,
      nutritionPatientsToClients: patientsToClients,
      nutritionRetention: retention3Months
    };

    if (selectedCard === 'monthlyIncome') {
      const payments = monthlyIncomeDetails || [];
      if (payments.length === 0) {
        return (
          <div className="py-8 text-center text-[var(--color-text-muted)]">
            No hay pagos registrados para este mes.
          </div>
        );
      }

      return payments.slice(0, 10).map((item, idx) => (
        <motion.div
          key={item.id || idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
          className="rounded-lg bg-[var(--color-card-alt)] p-4 flex justify-between items-start gap-4"
        >
          <div>
            <p className="font-semibold text-[var(--color-text)]">
              {item.first_name ? `${item.first_name} ${item.last_name}` : 'Cliente desconocido'}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">{item.payment_type || 'Pago'} • {item.payment_method === 'cash' ? 'Efectivo' : item.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta'}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{item.phone || 'Sin teléfono'}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{new Date(item.paid_at).toLocaleDateString('es-MX')}</p>
          </div>
          <p className="text-right font-semibold text-[var(--color-success)]">${parseFloat(item.amount || 0).toLocaleString('es-MX')}</p>
        </motion.div>
      ));
    }

    if (selectedCard === 'retentionRate') {
      const list = retentionClients || [];
      if (list.length === 0) {
        return (
          <div className="py-8 text-center text-[var(--color-text-muted)]">
            No hay clientes retenidos actualmente.
          </div>
        );
      }

      return list.slice(0, 10).map((client, idx) => (
        <motion.div
          key={client.id || idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
          className="rounded-lg bg-[var(--color-card-alt)] p-4 flex justify-between items-start gap-4"
        >
          <div>
            <p className="font-semibold text-[var(--color-text)]">{client.first_name} {client.last_name}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{client.plan_name || 'Sin plan'}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{client.phone || 'Sin teléfono'}</p>
          </div>
          <div className="text-right text-xs text-[var(--color-text-muted)]">
            <p>{client.consecutive_months} meses consecutivos</p>
          </div>
        </motion.div>
      ));
    }

    if (selectedCard === 'nutritionFreeConsults') {
      const list = nutritionFreeConsults || [];
      if (list.length === 0) {
        return (
          <div className="py-8 text-center text-[var(--color-text-muted)]">
            No hay consultas gratuitas registradas para este mes.
          </div>
        );
      }

      return list.slice(0, 10).map((item, idx) => (
        <motion.div
          key={item.id || idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
          className="rounded-lg bg-[var(--color-card-alt)] p-4 flex justify-between items-start gap-4"
        >
          <div>
            <p className="font-semibold text-[var(--color-text)]">{item.first_name} {item.last_name}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{item.phone || 'Sin teléfono'}</p>
          </div>
          <div className="text-right text-xs text-[var(--color-text-muted)]">
            <p>{item.consult_count} consulta(s)</p>
            <p>{new Date(item.first_consult_date).toLocaleDateString('es-MX')}</p>
          </div>
        </motion.div>
      ));
    }

    if (selectedCard === 'nutritionPaidConsults') {
      const list = nutritionPaidConsults || [];
      if (list.length === 0) {
        return (
          <div className="py-8 text-center text-[var(--color-text-muted)]">
            No hay consultas pagadas registradas para este mes.
          </div>
        );
      }

      return list.slice(0, 10).map((item, idx) => (
        <motion.div
          key={item.id || idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
          className="rounded-lg bg-[var(--color-card-alt)] p-4 flex justify-between items-start gap-4"
        >
          <div>
            <p className="font-semibold text-[var(--color-text)]">{item.first_name} {item.last_name}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{item.phone || 'Sin teléfono'}</p>
          </div>
          <div className="text-right text-xs text-[var(--color-text-muted)]">
            <p>{item.total_paid ? `$${parseFloat(item.total_paid).toLocaleString('es-MX')}` : 'Sin pago'}</p>
            <p>{item.consult_count} consulta(s)</p>
          </div>
        </motion.div>
      ));
    }

    if (selectedCard === 'nutritionIncome') {
      const list = nutritionIncomeReal?.by_method || [];
      if (list.length === 0) {
        return (
          <div className="py-8 text-center text-[var(--color-text-muted)]">
            No hay ingresos del consultorio registrados para este mes.
          </div>
        );
      }

      return list.map((item, idx) => (
        <motion.div
          key={item.payment_method || idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
          className="rounded-lg bg-[var(--color-card-alt)] p-4 flex justify-between items-start gap-4"
        >
          <div>
            <p className="font-semibold text-[var(--color-text)]">
              {item.payment_method === 'cash' ? 'Efectivo' : item.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta'}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">Método de pago</p>
          </div>
          <p className="text-right font-semibold text-[var(--color-success)]">${parseFloat(item.total || 0).toLocaleString('es-MX')}</p>
        </motion.div>
      ));
    }

    const list = sharedLists[selectedCard] || [];
    if (!list || list.length === 0) {
      return (
        <div className="py-8 text-center text-[var(--color-text-muted)]">
          No hay clientes disponibles para esta estadística.
        </div>
      );
    }

    return list.slice(0, 10).map((item, idx) => (
      <motion.div
        key={item.id || idx}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.03 }}
        className="rounded-lg bg-[var(--color-card-alt)] p-4 flex justify-between items-start gap-4"
      >
        <div>
          <p className="font-semibold text-[var(--color-text)]">
            {item.first_name ? `${item.first_name} ${item.last_name}` : item.name || 'Sin nombre'}
          </p>
          {item.plan_name && <p className="text-xs text-[var(--color-text-muted)]">{item.plan_name}</p>}
          {item.phone && <p className="text-xs text-[var(--color-text-muted)]">{item.phone}</p>}
        </div>
        <div className="text-right text-xs text-[var(--color-text-muted)]">
          {selectedCard === 'nutritionFreePaidConversion' && (
            <>
              <p>{item.paid_consults} pagadas</p>
              <p>{item.free_consults} gratuitas</p>
            </>
          )}
          {selectedCard === 'nutritionPatientsToClients' && item.total_consultations != null && <p>{item.total_consultations} consultas</p>}
          {selectedCard === 'nutritionRetention' && item.total_consults != null && <p>{item.total_consults} consultas</p>}
          {selectedCard === 'alertClients' && item.days_without_attendance != null && <p>{item.days_without_attendance} días sin asistir</p>}
          {selectedCard === 'absentClients' && item.days_without_attendance != null && <p>{item.days_without_attendance} días sin asistir</p>}
        </div>
      </motion.div>
    ));
  };

  const renderChart = () => {
    const config = chartConfig[selectedMetric] || chartConfig.clientsByPlan;
    const chartData = config.data || [];

    if (!chartData || chartData.length === 0) {
      return (
        <div className="h-96 flex flex-col items-center justify-center text-[var(--color-text-muted)] gap-2">
          <IconMailbox size={48} className="opacity-50" />
          <span>No hay datos disponibles</span>
        </div>
      );
    }

    if (chartType === 'bar') {
      return (
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
      );
    }

    if (chartType === 'pie') {
      return (
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
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen p-6 bg-[var(--color-surface)] space-y-6">
      {/* Header */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-3 rounded-full bg-[rgba(226,154,0,0.12)] px-4 py-2 text-sm font-semibold text-[var(--color-secondary)]">
          <IconTrendingUp size={20} /> Estadísticas Estratégicas
        </div>
        <div>
          <h1 className="text-4xl font-[var(--font-display)] font-bold text-[var(--color-text)]">
            Inteligencia del Gimnasio
          </h1>
          <p className="text-[var(--color-text-muted)] mt-2">
            KPIs financieros, operativos y de retención en tiempo real
          </p>
        </div>
      </header>

      <div className="relative my-8">
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[var(--color-text-muted)] to-transparent" />
        <div className="relative mx-auto inline-flex items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-sm text-[var(--color-text-muted)] shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[#0F3E60]" />
          <span className="uppercase tracking-[0.2em]">Sección de Gimnasio</span>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <div className="w-1.5 h-8 bg-[var(--color-secondary)] rounded-full" />
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Estadísticas del Gimnasio</h2>
        </div>

        {/* KPIs Principales */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          {[
            {
              key: 'retentionRate',
              title: 'Retención de Clientes',
              value: `${kpis.retention?.retention_percentage || 0}%`,
              subtitle: `${kpis.retention?.retained_clients || 0} de ${kpis.retention?.total_clients || 0} clientes`,
              variant: 'default'
            },
            {
              key: 'monthlyIncome',
              title: 'Ingreso de Efectivo del Mes',
              value: `$${(totalIncome || 0).toLocaleString('es-MX')}`,
              subtitle: `${incomeByMethod.length} métodos de pago`,
              variant: 'success'
            },
            {
              key: 'nutritionFreePaidConversion',
              title: 'Conversión a Nutrición Pagada',
              value: `${nutritionConversionPaid?.conversion_rate || 0}%`,
              subtitle: `${nutritionConversionPaid?.with_paid_nutrition || 0} clientes`,
              variant: 'warning'
            },
            {
              key: 'absentClients',
              title: 'Clientes Ausentes',
              value: `${absentClients?.length || 0}`,
              subtitle: 'Anualidad pagada sin mensualidad actual',
              variant: 'gold'
            },
            {
              key: 'alertClients',
              title: 'Clientes en Alerta',
              value: `${alertClients?.length || 0}`,
              subtitle: 'Sin asistencia en 15+ días',
              variant: 'danger'
            },
          ].map(card => (
            <motion.div
              key={card.key}
              whileHover={{ scale: 1.02 }}
              className={`cursor-pointer ${selectedCard === card.key ? 'ring-2 ring-[var(--color-secondary)]' : ''}`}
              onClick={() => setSelectedCard(selectedCard === card.key ? null : card.key)}
            >
              <GymCard title={card.title} subtitle={card.subtitle} variant={card.variant} noPad>
                <div className="p-5">
                  <p className="text-3xl font-bold text-[var(--color-text)]">{card.value}</p>
                </div>
              </GymCard>
              {selectedCard === card.key && (
                <div className="mt-4">
                  {renderSelectedDetail()}
                </div>
              )}
            </motion.div>
          ))}
        </section>

        {/* Análisis de Ingresos */}
        <section className="grid gap-6 lg:grid-cols-2 mb-6">
          <GymCard title="Análisis de Ingresos" variant="default">
            <div className="space-y-4">
              <div className="rounded-lg bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">Total recaudado desde el día 1 del mes</p>
                <p className="mt-2 text-3xl font-bold text-[var(--color-secondary)]">
                  ${totalIncome?.toLocaleString('es-MX')}
                </p>
              </div>
              {incomeByMethod.map((method, idx) => (
                <div key={idx} className="rounded-lg bg-[var(--color-card-alt)] p-4 grid gap-2">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-[var(--color-text-muted)] capitalize">
                      {method.payment_method === 'cash' ? 'Efectivo' : method.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta'}
                    </p>
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      ${parseFloat(method.total).toLocaleString('es-MX')}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {parseInt(method.transaction_count)} transacciones
                  </p>
                </div>
              ))}
            </div>
          </GymCard>

          <GymCard title="Clientes Ausentes" variant="warning" subtitle={`${absentClients?.length || 0} clientes`}>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(absentClients || []).length > 0 ? (
                (absentClients || []).slice(0, 8).map((client, idx) => (
                  <motion.div
                    key={client.id || idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-lg bg-[var(--color-card-alt)] p-3"
                  >
                    <p className="font-medium text-[var(--color-text)]">
                      {client.first_name} {client.last_name}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">{client.plan_name}</p>
                    <p className="text-xs text-[var(--color-danger)]">
                      {client.days_without_attendance || 'Sin datos'} días sin asistir
                    </p>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center text-[var(--color-text-muted)] py-8 gap-2">
                  <IconSparkles size={32} className="text-[var(--color-success)]" />
                  <span>¡Excelente! No hay clientes ausentes</span>
                </div>
              )}
            </div>
          </GymCard>
        </section>
      </section>

      <div className="relative my-10">
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[var(--color-text-muted)] to-transparent" />
        <div className="relative mx-auto inline-flex items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-sm text-[var(--color-text-muted)] shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[#D97706]" />
          <span className="uppercase tracking-[0.2em]">Sección Nutriología</span>
        </div>
      </div>

      {/* ============ ESTADÍSTICAS DE NUTRIOLOGÍA ============ */}

      <section>
        <div className="mb-4 flex items-center gap-2">
          <div className="w-1.5 h-8 bg-[#D97706] rounded-full" />
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Estadísticas del Consultorio</h2>
        </div>

        {/* Tarjetas individuales de Nutriología */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`cursor-pointer ${selectedCard === 'nutritionFreeConsults' ? 'ring-2 ring-[#D97706] rounded-[var(--radius-lg)]' : ''}`}
            onClick={() => setSelectedCard(selectedCard === 'nutritionFreeConsults' ? null : 'nutritionFreeConsults')}
          >
            <GymCard title="Consultas Gratuitas" subtitle="Primera consulta gratis" variant="default" noPad>
              <div className="p-5">
                <p className="text-3xl font-bold text-[#0F3E60]">{kpis.nutritionStats?.free_consults || 0}</p>
              </div>
            </GymCard>
            {selectedCard === 'nutritionFreeConsults' && (
              <div className="mt-4">{renderSelectedDetail()}</div>
            )}
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`cursor-pointer ${selectedCard === 'nutritionPaidConsults' ? 'ring-2 ring-[var(--color-success)] rounded-[var(--radius-lg)]' : ''}`}
            onClick={() => setSelectedCard(selectedCard === 'nutritionPaidConsults' ? null : 'nutritionPaidConsults')}
          >
            <GymCard title="Consultas Pagadas" subtitle="Pagos registrados en Pacientes" variant="success" noPad>
              <div className="p-5">
                <p className="text-3xl font-bold text-[var(--color-success)]">{kpis.nutritionStats?.paid_consults || 0}</p>
              </div>
            </GymCard>
            {selectedCard === 'nutritionPaidConsults' && (
              <div className="mt-4">{renderSelectedDetail()}</div>
            )}
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`cursor-pointer ${selectedCard === 'nutritionFreePaidConversion' ? 'ring-2 ring-[var(--color-gold)] rounded-[var(--radius-lg)]' : ''}`}
            onClick={() => setSelectedCard(selectedCard === 'nutritionFreePaidConversion' ? null : 'nutritionFreePaidConversion')}
          >
            <GymCard title="Conversión Gratuita → Pago" subtitle="Clientes gym que ya pagan consultas" variant="gold" noPad>
              <div className="p-5">
                <p className="text-3xl font-bold text-[var(--color-gold)]">{kpis.nutritionStats?.free_to_paid_conversion || 0}%</p>
              </div>
            </GymCard>
            {selectedCard === 'nutritionFreePaidConversion' && (
              <div className="mt-4">{renderSelectedDetail()}</div>
            )}
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`cursor-pointer ${selectedCard === 'nutritionPatientsToClients' ? 'ring-2 ring-[var(--color-warning)] rounded-[var(--radius-lg)]' : ''}`}
            onClick={() => setSelectedCard(selectedCard === 'nutritionPatientsToClients' ? null : 'nutritionPatientsToClients')}
          >
            <GymCard title="Pacientes → Clientes" subtitle="Quienes pasaron del consultorio al gym" variant="warning" noPad>
              <div className="p-5">
                <p className="text-3xl font-bold text-[#D97706]">{(patientsToClients || []).length || 0}</p>
              </div>
            </GymCard>
            {selectedCard === 'nutritionPatientsToClients' && (
              <div className="mt-4">{renderSelectedDetail()}</div>
            )}
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`cursor-pointer ${selectedCard === 'nutritionRetention' ? 'ring-2 ring-[var(--color-secondary)] rounded-[var(--radius-lg)]' : ''}`}
            onClick={() => setSelectedCard(selectedCard === 'nutritionRetention' ? null : 'nutritionRetention')}
          >
            <GymCard title="Retención de Pacientes" subtitle="Pacientes con 3+ consultas" variant="default" noPad>
              <div className="p-5">
                <p className="text-3xl font-bold text-[#0F3E60]">{(retention3Months || []).length || 0}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {(consultationDurations?.total_patients || 0) > 0
                    ? `${Math.round(((retention3Months || []).length / consultationDurations.total_patients) * 100)}% del total`
                    : 'No hay datos suficientes'}
                </p>
              </div>
            </GymCard>
            {selectedCard === 'nutritionRetention' && (
              <div className="mt-4">{renderSelectedDetail()}</div>
            )}
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`cursor-pointer ${selectedCard === 'nutritionIncome' ? 'ring-2 ring-[var(--color-success)] rounded-[var(--radius-lg)]' : ''}`}
            onClick={() => setSelectedCard(selectedCard === 'nutritionIncome' ? null : 'nutritionIncome')}
          >
            <GymCard title="Ingresos del Consultorio" subtitle="Pagos reales registrados en Pacientes" variant="success" noPad>
              <div className="p-5">
                <p className="text-3xl font-bold text-[var(--color-success)]">${(nutritionIncomeReal?.total || 0).toLocaleString('es-MX')}</p>
              </div>
            </GymCard>
            {selectedCard === 'nutritionIncome' && (
              <div className="mt-4">{renderSelectedDetail()}</div>
            )}
          </motion.div>
        </section>

        {/* Detalles de Consultas */}
        <section className="grid gap-6 lg:grid-cols-2 mb-6">
          <GymCard title="Pacientes por tiempo de consulta" variant="default">
            <div className="space-y-3">
              <div className="rounded-lg bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">Han consultado al menos una vez</p>
                <p className="mt-2 text-2xl font-bold text-[#0F3E60]">{consultationDurations?.consulted_patients || 0}</p>
              </div>
              <div className="rounded-lg bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">Exactamente 1 mes</p>
                <p className="mt-2 text-2xl font-bold text-[#D97706]">{consultationDurations?.one_month_exact || 0}</p>
              </div>
              <div className="rounded-lg bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">Exactamente 2 meses</p>
                <p className="mt-2 text-2xl font-bold text-[var(--color-secondary)]">{consultationDurations?.two_months_exact || 0}</p>
              </div>
              <div className="rounded-lg bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">3+ meses</p>
                <p className="mt-2 text-2xl font-bold text-[var(--color-success)]">{consultationDurations?.three_months_plus || 0}</p>
              </div>
            </div>
          </GymCard>

          <GymCard title="Conversión Gratuita → Pago" variant="gold" subtitle={`${(freeToConversion || []).length} clientes`}>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(freeToConversion || []).length > 0 ? (
                (freeToConversion || []).slice(0, 8).map((client, idx) => (
                  <motion.div
                    key={client.id || idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-lg bg-[var(--color-card-alt)] p-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-medium text-[var(--color-text)] truncate">
                        {client.first_name} {client.last_name}
                      </p>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-[#D97706]">{client.paid_consults} pagadas</p>
                        <p className="text-xs text-[var(--color-text-muted)]">Gratuitas: {client.free_consults}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex items-center justify-center text-[var(--color-text-muted)] py-8">
                  <IconMailbox size={32} className="opacity-50" />
                </div>
              )}
            </div>
          </GymCard>
        </section>
      </section>

      {/* ============ FILTROS Y VISUALIZACIÓN ============ */}

      <div className="relative my-10">
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[var(--color-text-muted)] to-transparent" />
        <div className="relative mx-auto inline-flex items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-sm text-[var(--color-text-muted)] shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[#0F3E60]" />
          <span className="uppercase tracking-[0.2em]">Sección de Filtro de Datos</span>
        </div>
      </div>

      {/* Filtros por Período */}
      <GymCard title="Filtrar por Período" variant="default">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Estadística a filtrar</label>
            <select
              value={filterMetric}
              onChange={(e) => {
                setFilterMetric(e.target.value);
                if (e.target.value !== 'all') {
                  setSelectedMetric(e.target.value);
                }
              }}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
            >
              <option value="all">Todas las estadísticas</option>
              <optgroup label="Estadísticas de Gimnasio">
                {allMetrics.filter(metric => metric.category === 'gym').map(metric => (
                  <option key={metric.id} value={metric.id}>{metric.label}</option>
                ))}
              </optgroup>
              <optgroup label="Estadísticas de Nutriología">
                {allMetrics.filter(metric => metric.category === 'nutrition').map(metric => (
                  <option key={metric.id} value={metric.id}>{metric.label}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Desde</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
            />
          </div>
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="px-4 py-2 rounded-lg bg-[rgba(15,62,96,0.1)] text-[var(--color-secondary)] font-medium hover:bg-[rgba(15,62,96,0.2)] transition"
          >
            Limpiar
          </button>
        </div>
      </GymCard>

      <div className="relative my-10">
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[var(--color-text-muted)] to-transparent" />
        <div className="relative mx-auto inline-flex items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-sm text-[var(--color-text-muted)] shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[#0F3E60]" />
          <span className="uppercase tracking-[0.2em]">Sección de Visualizador</span>
        </div>
      </div>

      {/* Visualización de Datos */}
      <GymCard title="Visualización de Datos" variant="default">
        <div className="space-y-6">
          {/* Selector de Tipo de Gráfico */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[var(--color-text)]">Tipo de Gráfico</p>
            <div className="flex flex-wrap gap-2">
              {chartTypes.map(type => (
                <motion.button
                  key={type.id}
                  onClick={() => setChartType(type.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
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

          {/* Selector de Métrica */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[var(--color-text)]">Métrica a Mostrar</p>
            <div className="flex flex-wrap gap-2">
              {allMetrics.map(metric => (
                <motion.button
                  key={metric.id}
                  onClick={() => setSelectedMetric(metric.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedMetric === metric.id
                      ? 'bg-[var(--color-secondary)] text-white'
                      : 'bg-[var(--color-card-alt)] text-[var(--color-text)] hover:bg-[rgba(15,62,96,0.1)]'
                  }`}
                >
                  {metric.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Gráfico */}
          <div className="rounded-lg bg-[var(--color-card-alt)] p-6 overflow-x-auto">
            {renderChart()}
          </div>
        </div>
      </GymCard>

      {/* Acciones Rápidas */}
      <GymCard title="Acciones Rápidas" variant="default">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <GymButton variant="secondary" size="lg">
            <span className="flex items-center justify-center gap-2"><IconDownload size={20} /> Exportar</span>
          </GymButton>
          <GymButton variant="primary" size="lg">
            <span className="flex items-center justify-center gap-2"><IconShare size={20} /> Compartir</span>
          </GymButton>
          <GymButton variant="gold" size="lg">
            <span className="flex items-center justify-center gap-2"><IconSpeakerphone size={20} /> Promociones</span>
          </GymButton>
          <GymButton variant="warning" size="lg">
            <span className="flex items-center justify-center gap-2"><IconMessage size={20} /> Contactar</span>
          </GymButton>
        </div>
      </GymCard>
    </div>
  );
}
