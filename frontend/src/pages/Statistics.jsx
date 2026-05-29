import { useState, useMemo } from 'react';
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
  IconMessage,
  IconInfoCircle,
  IconUsers,
  IconTrendingDown,
  IconCurrencyMxn
} from '@tabler/icons-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line
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
  useNutritionIncomeReal
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
  { id: 'paymentMethods', label: 'Métodos de Pago', category: 'gym' },
  { id: 'attendance', label: 'Asistencia Diaria', category: 'gym' },
  { id: 'monthlyIncome', label: 'Ingresos Mensuales', category: 'gym' },
  { id: 'ageDistribution', label: 'Distribución por Edad', category: 'gym' },
  { id: 'sexDistribution', label: 'Distribución por Sexo', category: 'gym' },
  { id: 'nutritionRetention', label: 'Retención de Consultorio', category: 'nutrition' },
];

export default function Statistics() {
  const [chartType, setChartType] = useState('bar');
  const [selectedMetric, setSelectedMetric] = useState('clientsByPlan');
  const [filterMetric, setFilterMetric] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);

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
  const clients = stats.clients || {};

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

  const ageData = (charts.ageDistribution || []).map(d => ({
    name: d.age_range,
    value: parseInt(d.count, 10) || 0
  }));

  const sexData = (charts.sexDistribution || []).map(d => ({
    name: d.sex,
    value: parseInt(d.count, 10) || 0
  }));

  const incomeMethodData = incomeByMethod.map(d => ({
    name: d.payment_method === 'cash' ? 'Efectivo' : d.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta',
    value: parseFloat(d.total) || 0
  }));

  // Renderizar gráfico
  const renderChart = () => {
    const metricsConfig = {
      clientsByPlan: {
        data: plansData,
        title: 'Distribución de Clientes por Plan',
        dataKey: 'value',
        nameKey: 'name'
      },
      paymentMethods: {
        data: paymentData,
        title: 'Métodos de Pago (%)',
        dataKey: 'value',
        nameKey: 'name'
      },
      attendance: {
        data: attendanceData,
        title: 'Asistencia Diaria (últimos 30 días)',
        dataKey: 'visitantes',
        nameKey: 'date'
      },
      monthlyIncome: {
        data: incomeMethodData,
        title: 'Ingresos por Método de Pago',
        dataKey: 'value',
        nameKey: 'name'
      },
      ageDistribution: {
        data: ageData,
        title: 'Distribución por Edad',
        dataKey: 'value',
        nameKey: 'name'
      },
      sexDistribution: {
        data: sexData,
        title: 'Distribución por Sexo',
        dataKey: 'value',
        nameKey: 'name'
      }
    };

    const config = metricsConfig[selectedMetric] || metricsConfig.clientsByPlan;
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
            <Tooltip formatter={(value) => value.toLocaleString('es-MX')} />
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

      {/* ============ ESTADÍSTICAS DE GIMNASIO ============ */}
      
      <section>
        <div className="mb-4 flex items-center gap-2">
          <div className="w-1.5 h-8 bg-[var(--color-secondary)] rounded-full" />
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Estadísticas del Gimnasio</h2>
        </div>

        {/* KPIs Principales */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {/* Retención */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => setExpandedCard('retention')}
            className="cursor-pointer"
          >
            <GymCard variant="default" noPad>
              <div className="p-5 space-y-2">
                <p className="text-sm font-semibold text-[var(--color-text)]">Tasa de Retención</p>
                <p className="text-3xl font-bold text-[var(--color-secondary)]">
                  {kpis.retention?.retention_percentage || '0'}%
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {kpis.retention?.retained_clients || 0} de {kpis.retention?.total_clients || 0} clientes
                </p>
              </div>
            </GymCard>
          </motion.div>

          {/* Ingreso de Efectivo */}
          <motion.div whileHover={{ scale: 1.02 }} className="cursor-pointer">
            <GymCard variant="success" noPad>
              <div className="p-5 space-y-2">
                <p className="text-sm font-semibold text-[var(--color-text)]">Ingreso del Mes</p>
                <p className="text-3xl font-bold text-[var(--color-success)]">
                  ${totalIncome?.toLocaleString('es-MX') || '0'}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {incomeByMethod.length} métodos de pago
                </p>
              </div>
            </GymCard>
          </motion.div>

          {/* Conversión a Nutrición Pagada */}
          <motion.div whileHover={{ scale: 1.02 }} className="cursor-pointer">
            <GymCard variant="warning" noPad>
              <div className="p-5 space-y-2">
                <p className="text-sm font-semibold text-[var(--color-text)]">Conversión a Nutrición</p>
                <p className="text-3xl font-bold text-[#D97706]">
                  {nutritionConversionPaid?.conversion_rate || '0'}%
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {nutritionConversionPaid?.with_paid_nutrition || 0} clientes pagaron consultas
                </p>
              </div>
            </GymCard>
          </motion.div>

          {/* Clientes en Alerta */}
          <motion.div whileHover={{ scale: 1.02 }} className="cursor-pointer">
            <GymCard variant="danger" noPad>
              <div className="p-5 space-y-2">
                <p className="text-sm font-semibold text-[var(--color-text)]">Clientes en Alerta</p>
                <p className="text-3xl font-bold text-[var(--color-danger)]">
                  {alertClients?.length || 0}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Sin asistencia 15+ días
                </p>
              </div>
            </GymCard>
          </motion.div>
        </section>

        {/* Análisis de Ingresos */}
        <section className="grid gap-6 lg:grid-cols-2 mb-6">
          <GymCard title="Análisis de Ingresos" variant="default">
            <div className="space-y-3">
              {incomeByMethod.map((method, idx) => (
                <div key={idx} className="rounded-lg bg-[var(--color-card-alt)] p-4">
                  <p className="text-sm text-[var(--color-text-muted)] capitalize">
                    {method.payment_method === 'cash' ? 'Efectivo' : method.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta'}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--color-secondary)]">
                    ${parseFloat(method.total).toLocaleString('es-MX')}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {parseInt(method.transaction_count)} transacciones
                  </p>
                </div>
              ))}
              <div className="rounded-lg bg-[rgba(15,62,96,0.1)] p-4 border-l-4 border-[var(--color-secondary)]">
                <p className="text-sm font-semibold text-[var(--color-text)]">Total del Mes</p>
                <p className="mt-2 text-3xl font-bold text-[var(--color-secondary)]">
                  ${totalIncome?.toLocaleString('es-MX')}
                </p>
              </div>
            </div>
          </GymCard>

          {/* Clientes Ausentes */}
          <GymCard title="Clientes Ausentes" variant="warning" subtitle={`${absentClients?.length || 0} clientes`}>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(absentClients || []).length > 0 ? (
                (absentClients || []).slice(0, 8).map((client, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-lg bg-[var(--color-card-alt)] p-3 flex justify-between items-center"
                  >
                    <span className="font-medium text-[var(--color-text)]">
                      {client.first_name} {client.last_name}
                    </span>
                    <span className="text-xs font-semibold text-[var(--color-warning)]">
                      {client.plan_name}
                    </span>
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

      {/* Divisor visual */}
      <div className="my-8 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />

      {/* ============ ESTADÍSTICAS DE NUTRIOLOGÍA ============ */}

      <section>
        <div className="mb-4 flex items-center gap-2">
          <div className="w-1.5 h-8 bg-[#D97706] rounded-full" />
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Estadísticas del Consultorio</h2>
        </div>

        {/* Tarjetas individuales de Nutriología */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          {/* Consultas Gratuitas */}
          <GymCard variant="default" noPad>
            <div className="p-5 space-y-2">
              <p className="text-sm font-semibold text-[var(--color-text)]">Consultas Gratuitas</p>
              <p className="text-3xl font-bold text-[#0F3E60]">
                {kpis.nutritionStats?.free_consults || 0}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Primeras consultas del período
              </p>
            </div>
          </GymCard>

          {/* Consultas Pagadas */}
          <GymCard variant="success" noPad>
            <div className="p-5 space-y-2">
              <p className="text-sm font-semibold text-[var(--color-text)]">Consultas Pagadas</p>
              <p className="text-3xl font-bold text-[var(--color-success)]">
                {kpis.nutritionStats?.paid_consults || 0}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Con pago registrado
              </p>
            </div>
          </GymCard>

          {/* Conversión Gratuita → Pago */}
          <GymCard variant="gold" noPad>
            <div className="p-5 space-y-2">
              <p className="text-sm font-semibold text-[var(--color-text)]">Conversión Gratuita-Pago</p>
              <p className="text-3xl font-bold text-[var(--color-gold)]">
                {kpis.nutritionStats?.free_to_paid_conversion || 0}%
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                De consultas gratuitas a pagadas
              </p>
            </div>
          </GymCard>

          {/* Conversión Pacientes a Clientes */}
          <GymCard variant="warning" noPad>
            <div className="p-5 space-y-2">
              <p className="text-sm font-semibold text-[var(--color-text)]">Pacientes → Clientes</p>
              <p className="text-3xl font-bold text-[#D97706]">
                {(patientsToClients || []).length || 0}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Se convirtieron en miembros del gym
              </p>
            </div>
          </GymCard>

          {/* Retención de Pacientes (3+) */}
          <GymCard variant="default" noPad>
            <div className="p-5 space-y-2">
              <p className="text-sm font-semibold text-[var(--color-text)]">Retención (3+ Consultas)</p>
              <p className="text-3xl font-bold text-[#0F3E60]">
                {(retention3Months || []).length || 0}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Pacientes activos de larga duración
              </p>
            </div>
          </GymCard>

          {/* Ingresos del Consultorio */}
          <GymCard variant="success" noPad>
            <div className="p-5 space-y-2">
              <p className="text-sm font-semibold text-[var(--color-text)]">Ingresos Consultorio</p>
              <p className="text-3xl font-bold text-[var(--color-success)]">
                ${(nutritionIncomeReal?.total || 0).toLocaleString('es-MX')}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Total del mes en pagos
              </p>
            </div>
          </GymCard>
        </section>

        {/* Detalles de Consultas */}
        <section className="grid gap-6 lg:grid-cols-2 mb-6">
          {/* Duración de Consultas */}
          <GymCard title="Duración de Consultas" variant="default">
            <div className="space-y-3">
              <div className="rounded-lg bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">Han Consultado al menos una vez</p>
                <p className="mt-2 text-2xl font-bold text-[#0F3E60]">
                  {consultationDurations?.one_month_active || 0}
                </p>
              </div>
              <div className="rounded-lg bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">2+ Meses activos</p>
                <p className="mt-2 text-2xl font-bold text-[#D97706]">
                  {consultationDurations?.two_months_active || 0}
                </p>
              </div>
              <div className="rounded-lg bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">3+ Meses activos</p>
                <p className="mt-2 text-2xl font-bold text-[var(--color-success)]">
                  {consultationDurations?.three_months_active || 0}
                </p>
              </div>
            </div>
          </GymCard>

          {/* Conversión Gratuita-Pago detalle */}
          <GymCard title="Conversión Gratuita → Pago" variant="gold" subtitle={`${(freeToConversion || []).length} clientes`}>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(freeToConversion || []).length > 0 ? (
                (freeToConversion || []).slice(0, 8).map((client, idx) => (
                  <motion.div
                    key={idx}
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
                        <p className="text-xs font-semibold text-[#D97706]">
                          {client.paid_consults} pagadas
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Gratuitas: {client.free_consults}
                        </p>
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

      {/* Filtros por Período */}
      <GymCard title="Filtrar por Período" variant="default">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Estadística a filtrar</label>
            <select
              value={filterMetric}
              onChange={(e) => setFilterMetric(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
            >
              <option value="all">Todas las estadísticas</option>
              {allMetrics.map(metric => (
                <option key={metric.id} value={metric.id}>{metric.label}</option>
              ))}
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
