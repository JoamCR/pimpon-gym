// src/components/ui/GymButton.jsx
import { motion } from 'framer-motion';

/**
 * GymButton — Botón del sistema con variantes y estados
 * @param {string}   variant  - 'primary'|'secondary'|'danger'|'ghost'|'warning'
 * @param {string}   size     - 'xs'|'sm'|'md'|'lg'
 * @param {boolean}  loading  - Muestra spinner de carga
 * @param {boolean}  disabled - Estado deshabilitado
 * @param {string}   icon     - Emoji/icono opcional antes del texto
 */
const variants = {
  primary:   'bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-accent)] text-black shadow-[var(--shadow-btn)] hover:brightness-95',
  secondary: 'bg-[var(--color-card-alt)] text-[var(--color-text)] border border-[var(--color-border)] ', /* hover:bg-[#1f1f1f]*/
  danger:    'bg-[var(--color-danger)] text-white hover:bg-[#dc2626] shadow-[0_16px_48px_-28px_rgba(220,38,38,0.8)]',
  warning:   'bg-gradient-to-r from-[#f59e0b] to-[#e29a00] text-slate-950 hover:from-[#e29a00] hover:to-[#ffb84d] shadow-[0_18px_55px_-28px_rgba(226,154,0,0.8)]',
  ghost:     'bg-transparent text-[var(--color-secondary)] hover:bg-white/10',
  success:   'bg-[var(--color-success)] text-[var(--color-text)] hover:bg-[#22c55e] shadow-[0_14px_40px_-30px_rgba(34,197,94,0.7)]',
};
const sizes = {
  xs: 'px-3 py-1.5 text-xs rounded-full',
  sm: 'px-4 py-2 text-sm rounded-[var(--radius-sm)]',
  md: 'px-5 py-2.5 text-sm rounded-[var(--radius-md)]',
  lg: 'px-6 py-3 text-base rounded-[var(--radius-md)]',
};

export function GymButton({
  children, variant='primary', size='md', loading=false,
  disabled=false, icon, className='', onClick, type='button', ...props
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={(!disabled && !loading) ? { scale: 1.02 } : {}}
      whileTap= {(!disabled && !loading) ? { scale: 0.97 } : {}}
      transition={{ duration: 0.12 }}
      className={[
        'inline-flex items-center justify-center gap-2 font-medium',
        'font-[var(--font-body)] transition-all duration-[var(--transition-fast)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] focus:ring-offset-2',
        variants[variant], sizes[size], className
      ].join(' ')}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
        </svg>
      ) : icon && <span>{icon}</span>}
      {!loading && <span>{children}</span>}
    </motion.button>
  );
}

// ── USOS ──────────────────────────────────────────────────────────────────────
// <GymButton onClick={handleNew} icon={<IconPlus />}>Nuevo Cliente</GymButton>
// <GymButton variant="warning" size="sm" onClick={handleNotify}>Notificar</GymButton>
// <GymButton variant="danger"  loading={isDeleting}>Eliminar</GymButton>
// <GymButton variant="ghost"   size="xs">Ver historial</GymButton>