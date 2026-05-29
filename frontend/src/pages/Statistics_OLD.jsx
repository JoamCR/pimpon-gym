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
  IconInfoCircle
} from '@tabler/icons-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useComprehensiveStats } from '../hooks/useStatistics';
import { GymCard } from '../components/ui/GymCard';
import { GymButton } from '../components/ui/GymButton';

const COLORS = ['#0F3E60', '#E29A00', '#16A34A', '#DC2626', '#0D1B2A', '#8B5CF6'];

const chartTypes = [
  { id: 'bar', label: 'Barras', icon: <IconChartBar size={20} /> },
  { id: 'pie', label: 'Pastel', icon: <IconChartPie size={20} /> },
  // { id: 'line', label: 'Línea', icon: <IconChartLine size={20} /> },
  // { id: 'area', label: 'Área', icon: <IconChartArea size={20} /> },
  // { id: 'scatter', label: 'Puntos', icon: <IconChartDots size={20} /> },
  // { id: 'radar', label: 'Radar', icon: <IconRadar size={20} /> },
];

const metricInfo = {
  clientsByPlan: {
    label: 'Clientes por Plan',
    description: 'Distribución de clientes activos por plan, basada en sus suscripciones actuales.'
  },
  paymentMethods: {
    label: 'Métodos de Pago',
    description: 'Porcentaje de ingresos por cada método de pago registrado en el período.'
  },
  attendance: {
    label: 'Asistencia Diaria',
    description: 'Visitantes y clientes únicos registrados por día durante el mes seleccionado.'
  },
  monthlyIncome: {
    label: 'Ingresos Mensuales',
    description: 'Total de ingresos del mes con desglose por método de pago.'
  },
  ageDistribution: {
    label: 'Distribución por Edad',
    description: 'Cantidad de clientes activos agrupados por rangos de edad.'
  },
  sexDistribution: {
    label: 'Distribución por Sexo',
    description: 'Conteo de clientes por sexo cuando la información está disponible en los datos.'
  },
  consultorioRetention: {
    label: 'Retención de Consultorio',
    description: 'Pacientes de consultorio con consultas en meses consecutivos y duración de la serie.'
  }
};

export default function Statistics() {
  const [chartType, setChartType] = useState('bar');
  const [selectedMetric, setSelectedMetric] = useState('clientsByPlan');
  const [filterMetric, setFilterMetric] = useState('attendance');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const now = new Date();
  const { data, isLoading, error } = useComprehensiveStats(now.getFullYear(), now.getMonth() + 1);

  // Filtrar datos por fecha si se especifican
  const filteredData = useMemo(() => {
    if (!data) return null;
    if (!startDate && !endDate) return data;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const filterByDate = (items) => {
      if (!Array.isArray(items)) return items;
      return items.filter(item => {
        const itemDate = item.date || item.cutoff_date || item.evaluation_date;
        if (!itemDate) return true;
        const parsed = new Date(itemDate);
        if (start && parsed < start) return false;
        if (end && parsed > end) return false;
        return true;
      });
    };

    const filterMetrics = ['attendance', 'monthlyIncome'];
    const filteredCharts = { ...data.charts };

    if (filterMetrics.includes(filterMetric)) {
      filteredCharts[filterMetric] = filterByDate(data.charts?.[filterMetric]);
    }

    return {
      ...data,
      charts: filteredCharts
    };
  }, [data, startDate, endDate, filterMetric]);

  if (error) {
    return (
      <div className="min-h-screen p-6 bg-[var(--color-surface)] flex items-center justify-center">
        <GymCard variant="danger" title="Error al Cargar Datos" noPad>
          <div className="p-6 space-y-4">
            <p className="text-[var(--color-text)] flex items-center gap-2">
              <IconAlertCircle size={24} className="text-red-500" /> {error.message}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Asegúrate de que el servidor backend esté corriendo en http://localhost:4000
            </p>
            <GymButton variant="primary" size="lg">
              Reintentar
            </GymButton>
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

  const stats = filteredData || {};
  const kpis = stats.kpis || {};
  const charts = stats.charts || {};
  const clients = stats.clients || {};

  // Preparar datos para gráficos - con validaciones
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

  const incomeData = (charts.monthlyIncome || []).map(d => ({
    date: d.month ? `${now.getFullYear()}-${String(d.month).padStart(2, '0')}-01` : null,
    mes: `M${d.month}`,
    total: parseFloat(d.total) || 0,
    metodo: d.payment_method
  }));

  const ageData = (charts.ageDistribution || []).map(d => ({
    name: d.age_range,
    value: parseInt(d.count, 10) || 0
  }));

  const sexData = (charts.sexDistribution || []).map(d => ({
    name: d.sex,
    value: parseInt(d.count, 10) || 0
  }));

  const consultorioRetentionData = (charts.nutritionRetention || []).slice(0, 10).map(d => ({
    name: `${d.first_name} ${d.last_name}`,
    value: parseInt(d.consecutive_months, 10) || 0
  }));

  const nutritionRetentionCount = charts.nutritionRetention?.length || 0;
  const nutritionRetentionMax = consultorioRetentionData.reduce((max, item) => Math.max(max, item.value), 0);

  const ghostClientsData = (clients.ghostClients || []).slice(0, 10).map(c => ({
    nombre: `${c.first_name} ${c.last_name}`,
    dias_sin_asistencia: c.days_without_attendance || 0
  }));

  // Renderizar gráfico basado en tipo y métrica seleccionada
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
        data: incomeData,
        title: 'Ingresos Mensuales',
        dataKey: 'total',
        nameKey: 'mes'
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
      },
      consultorioRetention: {
        data: consultorioRetentionData,
        title: 'Retención del Consultorio',
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
          <span>No hay datos disponibles para esta estadística</span>
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

    return (
      <div className="h-96 flex flex-col items-center justify-center text-[var(--color-text-muted)] gap-2">
        <IconInfoCircle size={48} className="opacity-50" />
        <span>Este tipo de gráfico no está disponible para la métrica seleccionada</span>
      </div>
    );
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
            KPIs financieros, operativos y clínicos en tiempo real
          </p>
        </div>
      </header>

      {/* KPIs Principales */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GymCard variant="default" noPad>
          <div className="p-5 space-y-2">
            <p className="text-sm font-semibold text-[var(--color-text)]">Tasa de Retención</p>
            <p className="text-xs text-[var(--color-text-muted)]">Clientes del gimnasio con 6 meses de vínculo activo, comparando activos vs churn.</p>
            <p className="text-3xl font-bold text-[var(--color-secondary)]">
              {kpis.retention?.retention_percentage || '0'}%
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {kpis.retention?.active_count || 0} activos de {kpis.retention?.total_clients || 0}
            </p>
          </div>
        </GymCard>

        <GymCard variant="success" noPad>
          <div className="p-5 space-y-2">
            <p className="text-sm font-semibold text-[var(--color-text)]">Ticket Promedio</p>
            <p className="text-xs text-[var(--color-text-muted)]">Promedio de ingreso por cliente durante el período seleccionado.</p>
            <p className="text-3xl font-bold text-[var(--color-success)]">
              ${kpis.avgTicket?.avg_ticket?.toLocaleString('es-MX') || '0'}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {kpis.avgTicket?.unique_payers || 0} clientes
            </p>
          </div>
        </GymCard>

        <GymCard variant="warning" noPad>
          <div className="p-5 space-y-2">
            <p className="text-sm font-semibold text-[var(--color-text)]">Conversión a Nutrición</p>
            <p className="text-xs text-[var(--color-text-muted)]">Porcentaje de clientes gym que usan el servicio de nutrición.</p>
            <p className="text-3xl font-bold text-[#D97706]">
              {kpis.nutritionConversion?.conversion_rate || '0'}%
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {kpis.nutritionConversion?.with_nutrition || 0} clientes
            </p>
          </div>
        </GymCard>

        <GymCard variant="danger" noPad>
          <div className="p-5 space-y-2">
            <p className="text-sm font-semibold text-[var(--color-text)]">Clientes Fantasma</p>
            <p className="text-xs text-[var(--color-text-muted)]">Clientes activos sin asistencia registrada en más de 15 días.</p>
            <p className="text-3xl font-bold text-[var(--color-danger)]">
              {kpis.ghostClients || 0}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Sin actividad 15+ días
            </p>
          </div>
        </GymCard>
      </section>

      {/* Finanzas */}
      <section className="grid gap-6 lg:grid-cols-2">
        <GymCard title="Análisis de Ingresos" variant="default">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">Ingresos Recurrentes</p>
                <p className="mt-2 text-2xl font-bold text-[var(--color-secondary)]">
                  ${kpis.recurringVsNew?.recurring_income?.toLocaleString('es-MX') || '0'}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {kpis.recurringVsNew?.recurring_percentage || '0'}% del total
                </p>
              </div>
              <div className="rounded-lg bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">Ingresos Nuevos</p>
                <p className="mt-2 text-2xl font-bold text-[var(--color-gold)]">
                  ${kpis.recurringVsNew?.new_income?.toLocaleString('es-MX') || '0'}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Inscripciones y enrollments
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-[var(--color-card-alt)] p-4">
              <p className="text-sm text-[var(--color-text-muted)]">Ingreso Total</p>
              <p className="mt-2 text-2xl font-bold text-[var(--color-primary)]">
                ${kpis.recurringVsNew?.total_income?.toLocaleString('es-MX') || '0'}
              </p>
            </div>
          </div>
        </GymCard>

        <GymCard title="Estadísticas de Nutriología" variant="default">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">Consultas Gratuitas</p>
                <p className="mt-2 text-2xl font-bold text-[#0F3E60]">
                  {kpis.nutritionStats?.free_consults || '0'}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">Primeras consultas gratuitas registradas en el período.</p>
              </div>
              <div className="rounded-lg bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">Consultas Pagadas</p>
                <p className="mt-2 text-2xl font-bold text-[var(--color-gold)]">
                  {kpis.nutritionStats?.paid_consults || '0'}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">Consultas de nutrición con pago registrado.</p>
              </div>
            </div>
            <div className="rounded-lg bg-[var(--color-card-alt)] p-4">
              <p className="text-sm text-[var(--color-text-muted)]">Conversión Gratuita → Pago</p>
              <p className="mt-2 text-2xl font-bold text-[var(--color-success)]">
                {kpis.nutritionStats?.free_to_paid_conversion || '0'}%
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">Ratio de consultas que pasaron de gratis a pagadas.</p>
            </div>
            <div className="rounded-lg bg-[var(--color-card-alt)] p-4">
              <p className="text-sm text-[var(--color-text-muted)]">Retención de Pacientes</p>
              <p className="mt-2 text-2xl font-bold text-[var(--color-secondary)]">
                {nutritionRetentionCount}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">Pacientes con consultas en meses consecutivos.</p>
              <p className="text-xs text-[var(--color-text-muted)]">Mayor serie: {nutritionRetentionMax} meses</p>
            </div>
          </div>
        </GymCard>
      </section>

      {/* Filtros por Fecha */}
      <GymCard title="Filtrar por Período" variant="default">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Estadística a filtrar</label>
            <select
              value={filterMetric}
              onChange={(e) => setFilterMetric(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
            >
              <option value="attendance">Asistencia Diaria</option>
              <option value="monthlyIncome">Ingresos Mensuales</option>
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
            Limpiar Filtros
          </button>
        </div>
      </GymCard>

      {/* Selector de Gráficos */}
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
              {[
                { id: 'clientsByPlan', label: 'Clientes por Plan' },
                { id: 'paymentMethods', label: 'Métodos de Pago' },
                { id: 'attendance', label: 'Asistencia Diaria' },
                { id: 'monthlyIncome', label: 'Ingresos Mensuales' },
                { id: 'ageDistribution', label: 'Edad' },
                { id: 'sexDistribution', label: 'Sexo' },
                { id: 'consultorioRetention', label: 'Retención Consultorio' }
              ].map(metric => (
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
          <div className="rounded-lg bg-[var(--color-card-alt)] p-4 mb-4">
            <p className="text-lg font-semibold text-[var(--color-text)]">{metricInfo[selectedMetric]?.label}</p>
            <p className="text-sm text-[var(--color-text-muted)]">{metricInfo[selectedMetric]?.description}</p>
          </div>
          <div className="rounded-lg bg-[var(--color-card-alt)] p-6 overflow-x-auto">
            {renderChart()}
          </div>
        </div>
      </GymCard>

      {/* Clientes Especiales */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Clientes Fantasma */}
        <GymCard title="Clientes Inactivos (Ghost)" variant="danger" subtitle={`${ghostClientsData.length} clientes`}>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {ghostClientsData.length > 0 ? (
              ghostClientsData.map((client, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-lg bg-[var(--color-card-alt)] p-3 flex justify-between items-center"
                >
                  <span className="font-medium text-[var(--color-text)]">{client.nombre}</span>
                  <span className="text-xs font-bold text-[var(--color-danger)]">
                    {client.dias_sin_asistencia} días
                  </span>
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center text-[var(--color-text-muted)] py-8 gap-2">
                <IconSparkles size={32} className="text-[var(--color-success)]" />
                <span>¡Excelente! No hay clientes inactivos</span>
              </div>
            )}
          </div>
        </GymCard>

        {/* Elegibles para Anualidad */}
        <GymCard title="Elegibles para Plan Anual" variant="gold" subtitle={`${clients.sixMonthEligible?.length || 0} clientes`}>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(clients.sixMonthEligible || []).slice(0, 10).map((client, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-lg bg-[var(--color-card-alt)] p-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--color-text)] truncate">
                      {client.first_name} {client.last_name}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {client.plan_name} • {client.consecutive_months} meses
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--color-gold)]">
                      ${client.price_with_discount?.toLocaleString('es-MX') || '0'}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </GymCard>
      </div>

      {/* Acciones Rápidas */}
      <GymCard title="Acciones Rápidas" variant="default">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <GymButton variant="secondary" size="lg">
            <span className="flex items-center justify-center gap-2"><IconDownload size={20} /> Exportar Reporte</span>
          </GymButton>
          <GymButton variant="primary" size="lg">
            <span className="flex items-center justify-center gap-2"><IconShare size={20} /> Compartir Equipo</span>
          </GymButton>
          <GymButton variant="gold" size="lg">
            <span className="flex items-center justify-center gap-2"><IconSpeakerphone size={20} /> Promover Anualidades</span>
          </GymButton>
          <GymButton variant="warning" size="lg">
            <span className="flex items-center justify-center gap-2"><IconMessage size={20} /> Contactar Fantasmas</span>
          </GymButton>
        </div>
      </GymCard>
    </div>
  );
}
