// src/components/ui/GymCard.jsx
import { motion } from 'framer-motion';

/**
 * GymCard — Componente de tarjeta reutilizable para todo el sistema Pimpon
 *
 * @param {string}   title       - Título de la tarjeta
 * @param {string}   subtitle    - Subtítulo opcional
 * @param {node}     children    - Contenido interno
 * @param {string}   variant     - 'default' | 'warning' | 'danger' | 'success'
 * @param {node}     headerAction - Botón/elemento en el header (ej: botón "Ver todos")
 * @param {string}   className   - Clases extra de Tailwind
 * @param {boolean}  noPadding   - Elimina el padding interno (para tablas, listas)
 */
const variantStyles = {
  default: {
    border:     'border-[var(--color-card-border)]',
    headerBg:   'bg-gradient-to-r from-[var(--color-card-header-bg)] via-[var(--color-card-header-via)] to-[var(--color-card-header-to)]',
    titleColor: 'text-[var(--color-card-header-text)]',
    accent:     'bg-gradient-to-b from-[var(--color-secondary)] to-[var(--color-accent)]',
  },
  warning: {
    border:     'border-[var(--color-card-border-warning)]',
    headerBg:   'bg-[var(--color-card-header-warning)]',
    titleColor: 'text-[var(--color-card-text-warning)]',
    accent:     'bg-orange-400',
  },
  danger: {
    border:     'border-[var(--color-card-border-danger)]',
    headerBg:   'bg-[var(--color-card-header-danger)]',
    titleColor: 'text-[var(--color-card-text-danger)]',
    accent:     'bg-red-500',
  },
  success: {
    border:     'border-[var(--color-card-border-success)]',
    headerBg:   'bg-[var(--color-card-header-success)]',
    titleColor: 'text-[var(--color-card-text-success)]',
    accent:     'bg-emerald-500',
  },
  gold: {
    border:     'border-[#d48806]',
    headerBg:   'bg-gradient-to-r from-[var(--color-gold)] via-[var(--color-secondary)] to-[#ffb84d]',
    titleColor: 'text-white',
    accent:     'bg-gradient-to-b from-[var(--color-gold)] to-[var(--color-accent)]',
  },
};

export function GymCard({
  title, subtitle, children, variant = 'default',
  headerAction, className = '', noPadding = false
}) {
  const s = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -3, boxShadow: '0 28px 80px rgba(0,0,0,0.35)' }}
      className={[
        'rounded-[var(--radius-lg)] border overflow-hidden',
        'bg-[var(--color-card)]/95 backdrop-blur-sm',
        'shadow-[var(--shadow-card)] transition-all duration-[var(--transition-normal)]',
        s.border, className
      ].join(' ')}
    >
      {/* Header */}
      <div className={['flex items-center justify-between px-5 py-4', s.headerBg].join(' ')}>
        <div className="flex items-center gap-3">
          <div className={['w-1.5 h-7 rounded-full', s.accent].join(' ')} />
          <div>
            <h3 className={['text-sm md:text-base font-semibold font-[var(--font-display)] tracking-[0.01em]', s.titleColor].join(' ')}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-white/70 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>

      {/* Body */}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </motion.div>
  );
}

// ── USO EN DASHBOARD ──────────────────────────────────────────────────────────
// <GymCard title="Vencen en 3 días" subtitle="47 clientes" variant="warning"
//          headerAction={<button>Ver todos</button>}>
//   <ClientExpiryList clients={expiring3Days} />
// </GymCard>
//
// <GymCard title="Ingresos del mes" variant="success">
//   <RevenueChart data={monthlyRevenue} />
// </GymCard>