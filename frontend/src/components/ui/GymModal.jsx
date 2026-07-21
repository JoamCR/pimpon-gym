// src/components/ui/GymModal.jsx
import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX } from '@tabler/icons-react';

/**
 * GymModal — Modal reutilizable con overlay oscuro y animaciones suaves
 *
 * @param {boolean}  isOpen     - Controla visibilidad
 * @param {function} onClose    - Callback al cerrar
 * @param {string}   title      - Título del modal
 * @param {node}     children   - Contenido del modal
 * @param {string}   size       - 'sm' | 'md' | 'lg' | 'xl' | 'full'
 * @param {boolean}  closeable  - Si se puede cerrar (default: true)
 */
const sizeClasses = {
  sm:   'max-w-md',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-[95vw]',
};

// Variantes de animación para Framer Motion
const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1,  transition: { duration: 0.25 } },
  exit:    { opacity: 0,  transition: { duration: 0.2  } },
};

const modalVariants = {
  hidden:  { opacity: 0, scale: 0.94, y: 20 },
  visible: { opacity: 1, scale: 1,    y: 0,
             transition: { type: 'spring', stiffness: 300, damping: 28, delay: 0.05 } },
  exit:    { opacity: 0, scale: 0.95, y: 10,
             transition: { duration: 0.18, ease: 'easeIn' } },
};

export function GymModal({ isOpen, onClose, title, children, size = 'md', width, closeable = true, closeOnOutsideClick = false }) {
  // Support legacy prop `width` used across the app — treat as alias for `size`
  const finalSize = size || width;

  // Cerrar con Escape
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && closeable) onClose();
  }, [onClose, closeable]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // bloquea scroll del body
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        // Portal al body para evitar problemas de z-index
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          {/* Backdrop oscuro */}
          <motion.div
            key="backdrop"
            variants={backdropVariants}
            initial="hidden" animate="visible" exit="exit"
            className="absolute inset-0 bg-[var(--color-backdrop)] backdrop-blur-[3px]"
            onClick={closeOnOutsideClick && closeable ? onClose : undefined}
          />

          {/* Panel del Modal */}
          <motion.div
            key="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            variants={modalVariants}
            initial="hidden" animate="visible" exit="exit"
            className={[
              'relative w-full rounded-[var(--radius-xl)]',
              'bg-[var(--color-card)] shadow-[var(--shadow-modal)] ring-1 ring-white/10',
              'flex flex-col max-h-[90vh] overflow-hidden',
              sizeClasses[finalSize]
            ].join(' ')}
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between px-6 py-4
                            border-b border-white/10
                            bg-gradient-to-r from-[var(--color-navy)] to-[var(--color-card-alt)]
                            rounded-t-[var(--radius-xl)]">
              <h2 id="modal-title"
                  className="text-base font-semibold text-white
                             font-[var(--font-display)] tracking-wide">
                {title}
              </h2>
              {closeable && (
                <button
                  onClick={onClose}
                  className="text-white/70 hover:text-white transition-colors
                             hover:bg-white/10 rounded-lg p-2"
                  aria-label="Cerrar modal"
                >
                  <IconX size={18} />
                </button>
              )}
            </div>

            {/* Body del Modal — scrollable */}
            <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-card-alt)]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── USO ───────────────────────────────────────────────────────────────────────
// const [open, setOpen] = useState(false);
// <GymModal isOpen={open} onClose={() => setOpen(false)}
//           title="Registrar Nuevo Cliente" size="lg">
//   <NewClientForm onSuccess={() => setOpen(false)} />
// </GymModal>