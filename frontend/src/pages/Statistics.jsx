import React from 'react';
import { motion } from 'framer-motion';
import { useDashboardStats } from '../hooks/useStatistics';
import { GymCard } from '../components/ui/GymCard';
import { GymButton } from '../components/ui/GymButton';

export default function Statistics() {
  const { data, isLoading } = useDashboardStats();
  const stats = data?.data || data || {};

  return (
    <div className="min-h-screen p-6 bg-[var(--color-surface)] space-y-6">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-3 rounded-full bg-[rgba(226,154,0,0.12)] px-4 py-2 text-sm font-semibold text-[var(--color-secondary)]">Estadísticas</div>
        <div>
          <h1 className="text-4xl font-[var(--font-display)] font-bold text-[var(--color-text)]">Inteligencia del gimnasio</h1>
          <p className="text-[var(--color-text-muted)] mt-2">Métricas clave y tendencias para medir el rendimiento del negocio.</p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <GymCard title="Resumen mensual" variant="default">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[
                { label: 'Nuevos clientes', value: stats.new_clients ?? '—', accent: 'text-[var(--color-secondary)]' },
                { label: 'Ingresos', value: stats.revenue ? `$${stats.revenue.toLocaleString('es-MX')}` : '—', accent: 'text-[var(--color-success)]' },
                { label: 'Suscripciones', value: stats.active_subscriptions ?? '—', accent: 'text-[var(--color-primary)]' },
              ].map((item) => (
                <div key={item.label} className="rounded-[var(--radius-lg)] bg-[var(--color-card-alt)] p-5">
                  <p className="text-sm text-[var(--color-text-muted)]">{item.label}</p>
                  <p className={`mt-3 text-3xl font-semibold ${item.accent}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </GymCard>

          <GymCard title="Tendencias de asistencia" variant="success">
            <div className="space-y-4">
              {isLoading ? (
                <p className="text-[var(--color-text-muted)]">Cargando tendencias...</p>
              ) : (
                <div className="space-y-4">
                  {(stats.attendance_trends || []).map((trend) => (
                    <motion.div key={trend.week} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[var(--radius-lg)] bg-[var(--color-card-alt)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--color-text)]">Semana {trend.week}</p>
                        <span className="rounded-full bg-[rgba(14,116,144,0.14)] px-3 py-1 text-xs font-semibold text-[var(--color-teal)]">{trend.percent}%</span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--color-text-muted)]">{trend.description}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </GymCard>
        </div>

        <div className="space-y-6">
          <GymCard title="Rendimiento" subtitle="KPIs críticos" variant="default">
            <div className="space-y-5">
              <div className="rounded-[var(--radius-lg)] bg-[var(--color-card-alt)] p-5">
                <p className="text-sm text-[var(--color-text-muted)]">Retención</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-secondary)]">{stats.retention_rate ? `${stats.retention_rate}%` : '—'}</p>
              </div>
              <div className="rounded-[var(--radius-lg)] bg-[var(--color-card-alt)] p-5">
                <p className="text-sm text-[var(--color-text-muted)]">Meta cumplida</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{stats.goal_completion ? `${stats.goal_completion}%` : '—'}</p>
              </div>
            </div>
          </GymCard>

          <GymCard title="Acciones rápidas" variant="default">
            <div className="space-y-3">
              <GymButton variant="secondary" size="lg">Exportar reporte</GymButton>
              <GymButton variant="primary" size="lg">Compartir con equipo</GymButton>
            </div>
          </GymCard>
        </div>
      </div>
    </div>
  );
}
