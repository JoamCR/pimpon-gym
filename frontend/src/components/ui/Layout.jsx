import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  IconLayoutDashboard,
  IconUsers,
  IconClipboardHeart,
  IconCheckbox,
  IconApple,
  IconChartBar,
  IconCash,
  IconSettings,
  IconDoorExit,
  IconSun,
  IconMoon,
  IconCalendarEvent,
  IconClock,
  IconChevronDown,
  IconChevronRight,
  IconMenu2,
  IconX
} from '@tabler/icons-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: <IconLayoutDashboard size={20} /> },
  { path: '/clients', label: 'Clientes', icon: <IconUsers size={20} /> },
  { path: '/patients', label: 'Pacientes', icon: <IconClipboardHeart size={20} /> },
  {
    path: '/agenda',
    label: 'Agenda',
    icon: <IconCalendarEvent size={20} />,
    subItems: [
      { path: '/agenda', label: 'Calendario', icon: <IconCalendarEvent size={16} />, end: true },
      { path: '/agenda/dia', label: 'Agenda del Día', icon: <IconClock size={16} /> }
    ]
  },
  { path: '/attendance', label: 'Asistencia', icon: <IconCheckbox size={20} /> },
  { path: '/nutrition', label: 'Nutrición', icon: <IconApple size={20} /> },
  { path: '/statistics', label: 'Estadísticas', icon: <IconChartBar size={20} /> },
  { path: '/finanzas', label: 'Finanzas', icon: <IconCash size={20} /> },
  { path: '/config', label: 'Configuración', icon: <IconSettings size={20} /> },
];

export default function Layout() {
  const location = useLocation();
  const [isLightMode, setIsLightMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'light';
    }
    return document.documentElement.classList.contains('light');
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAgendaOpen, setIsAgendaOpen] = useState(() => location.pathname.startsWith('/agenda'));

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightMode]);

  useEffect(() => {
    if (location.pathname.startsWith('/agenda')) {
      setIsAgendaOpen(true);
    }
  }, [location.pathname]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const renderNavList = (onItemClick) => {
    return navItems.map((item) => {
      if (item.subItems) {
        const isChildActive = location.pathname.startsWith('/agenda');
        return (
          <div key={item.path} className="space-y-1">
            <div
              onClick={() => setIsAgendaOpen(!isAgendaOpen)}
              className={`flex items-center justify-between w-full rounded-[var(--radius-lg)] px-4 py-3 cursor-pointer transition-all duration-200 ${isChildActive
                ? isLightMode
                  ? 'bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)] font-semibold border border-[var(--color-gold)]/30'
                  : 'bg-white/10 text-white font-semibold shadow-[0_14px_40px_-28px_rgba(226,154,0,0.85)]'
                : isLightMode
                  ? 'hover:bg-black/5 text-[var(--color-text-muted)]'
                  : 'hover:bg-white/5 text-slate-300'
                }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              <span>
                {isAgendaOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
              </span>
            </div>

            {isAgendaOpen && (
              <div className="pl-6 space-y-1 mt-1 border-l-2 border-[var(--color-border)] ml-4">
                {item.subItems.map((sub) => (
                  <NavLink
                    key={sub.path}
                    to={sub.path}
                    end={sub.end}
                    onClick={onItemClick}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-xs transition-all duration-200 ${isActive
                        ? isLightMode
                          ? 'bg-[var(--color-gold)] text-white font-semibold shadow-sm'
                          : 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                        : isLightMode
                          ? 'hover:bg-black/5 text-[var(--color-text-muted)]'
                          : 'hover:bg-white/5 text-slate-300'
                      }`
                    }
                  >
                    <span className="flex items-center justify-center">{sub.icon}</span>
                    <span>{sub.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      }

      return (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onItemClick}
          className={({ isActive }) =>
            `block w-full rounded-[var(--radius-lg)] px-4 py-3 transition-all duration-200 ${isActive
              ? isLightMode
                ? 'bg-[var(--color-gold)] text-white font-semibold shadow-md'
                : 'bg-white/10 text-white font-semibold shadow-[0_14px_40px_-28px_rgba(226,154,0,0.85)]'
              : isLightMode
                ? 'hover:bg-black/5 text-[var(--color-text-muted)]'
                : 'hover:bg-white/5 text-slate-300'
            }`
          }
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        </NavLink>
      );
    });
  };

  return (
    <div className={`flex flex-col h-screen max-h-screen w-full overflow-hidden ${isLightMode ? 'bg-[var(--bg)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(226,154,0,0.08),transparent_18%),linear-gradient(180deg,#060606_0%,#0e0e0e_100%)]'}`}>

      {/* BARRA SUPERIOR MÓVIL: Solo visible en pantallas pequeñas */}
      <header className={`flex md:hidden shrink-0 p-4 border-b justify-between items-center ${isLightMode ? 'bg-white border-[var(--color-border)]' : 'bg-black/80 border-white/10 text-white'}`}>
        <h1 className={`text-2xl font-display font-bold ${isLightMode ? 'text-[var(--color-gold)]' : 'text-white'} tracking-wide`}>Pimpon Gym</h1>
        <button onClick={toggleMobileMenu} className="text-gray-600 focus:outline-none">
          {isMobileMenuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
        </button>
      </header>

      {/* MENÚ LATERAL MÓVIL: Desplegable */}
      {isMobileMenuOpen && (
        <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col shadow-lg transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${isLightMode ? 'bg-white border-r border-[var(--color-border)] text-[var(--color-text)]' : 'bg-[var(--color-navy)] border-r border-transparent text-white'}`}>
          <div className={`p-6 border-b shrink-0 ${isLightMode ? 'border-[var(--color-border)]' : 'border-white/10'}`}>
            <h1 className={`text-2xl font-display font-bold ${isLightMode ? 'text-[var(--color-gold)]' : 'text-white'} tracking-wide`}>Pimpon Gym</h1>
          </div>
          <nav className="flex-1 px-6 mt-8 space-y-3 overflow-y-auto">
            {renderNavList(toggleMobileMenu)}
          </nav>

          <div className={`p-4 border-t shrink-0 ${isLightMode ? 'border-[var(--color-border)]' : 'border-white/10'} mt-auto flex flex-col gap-4`}>
            {/* Theme Toggle */}
            <div className="flex items-center justify-between px-2 py-2">
              <span className={`text-sm font-medium flex items-center gap-2 ${isLightMode ? 'text-[var(--color-text)]' : 'text-slate-300'}`}>
                {isLightMode ? <IconSun size={18} /> : <IconMoon size={18} />}
                {isLightMode ? 'Modo Claro' : 'Modo Oscuro'}
              </span>
              <button
                onClick={() => setIsLightMode(!isLightMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isLightMode ? 'bg-[var(--color-gold)]' : 'bg-slate-600'}`}
                aria-label="Toggle theme"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isLightMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <button
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors w-full border ${isLightMode ? 'hover:bg-black/5 text-[var(--color-danger)] border-[var(--color-border)]' : 'hover:bg-white/5 text-orange-300 border-white/10'}`}
              onClick={() => alert('Próximamente: Cerrar Sesión')}
            >
              <span className="flex items-center justify-center"><IconDoorExit size={20} /></span>
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </aside>
      )}

      {/* CONTENIDO PRINCIPAL Y BARRA LATERAL (MD EN ADELANTE) */}
      <div className="flex flex-1 overflow-hidden">
        {/* BARRA LATERAL: Oculta en móviles, visible desde 'md' (tabletas/laptops) */}
        <aside className={`hidden md:flex md:w-64 shrink-0 h-full flex-col shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)] border-r ${isLightMode ? 'bg-white border-[var(--color-border)] text-[var(--color-text)]' : 'bg-[var(--color-navy)] border-transparent text-white'}`}>
          <div className={`p-6 border-b shrink-0 ${isLightMode ? 'border-[var(--color-border)]' : 'border-white/10'}`}>
            <h2 className={`text-2xl font-display font-bold ${isLightMode ? 'text-[var(--color-gold)]' : 'text-white'} tracking-wide`}>Pimpon</h2>
          </div>

          <nav className="flex-1 px-6 mt-8 space-y-3 overflow-y-auto">
            {renderNavList(undefined)}
          </nav>

          <div className={`p-4 border-t shrink-0 ${isLightMode ? 'border-[var(--color-border)]' : 'border-white/10'} mt-auto flex flex-col gap-4`}>
            {/* Theme Toggle */}
            <div className="flex items-center justify-between px-2 py-2">
              <span className={`text-sm font-medium flex items-center gap-2 ${isLightMode ? 'text-[var(--color-text)]' : 'text-slate-300'}`}>
                {isLightMode ? <IconSun size={18} /> : <IconMoon size={18} />}
                {isLightMode ? 'Modo Claro' : 'Modo Oscuro'}
              </span>
              <button
                onClick={() => setIsLightMode(!isLightMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isLightMode ? 'bg-[var(--color-gold)]' : 'bg-slate-600'}`}
                aria-label="Toggle theme"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isLightMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <button
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors w-full border ${isLightMode ? 'hover:bg-black/5 text-[var(--color-danger)] border-[var(--color-border)]' : 'hover:bg-white/5 text-orange-300 border-white/10'}`}
              onClick={() => alert('Próximamente: Cerrar Sesión')}
            >
              <span className="flex items-center justify-center"><IconDoorExit size={20} /></span>
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL: Ocupa todo el ancho restante y es fluido */}
        <main className={`flex-1 min-w-0 h-full ${location.pathname === '/agenda' ? 'p-2 sm:p-3' : 'p-4 sm:p-6 md:p-8'} overflow-y-auto ${isLightMode ? 'bg-[var(--color-surface)]' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}