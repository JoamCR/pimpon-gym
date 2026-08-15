import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  IconLayoutDashboard,
  IconUsers,
  IconClipboardHeart,
  IconCheckbox,
  IconApple,
  IconChartBar,
  IconCash,
  IconSettings,
  IconShieldLock,
  IconDoorExit,
  IconSun,
  IconMoon,
  IconCalendarEvent,
  IconClock,
  IconChevronDown,
  IconChevronUp,
  IconChevronRight,
  IconMenu2,
  IconX,
  IconUser,
  IconBrandWhatsapp
} from '@tabler/icons-react';

const ROLES_MAP = {
  owner: 'Propietario',
  admin: 'Administrador',
  receptionist: 'Recepcionista',
  nutritionist: 'Nutriólogo',
  user: 'Usuario Personalizado'
};

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
  // { path: '/nutrition', label: 'Nutrición', icon: <IconApple size={20} /> },
  { path: '/statistics', label: 'Estadísticas', icon: <IconChartBar size={20} /> },
  { path: '/finanzas', label: 'Finanzas', icon: <IconCash size={20} /> },
  { path: '/whatsapp', label: 'WhatsApp', icon: <IconBrandWhatsapp size={20} /> },
  { path: '/config', label: 'Configuración', icon: <IconSettings size={20} /> },
  { path: '/seguridad', label: 'Seguridad', icon: <IconShieldLock size={20} /> },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  // Calcular las páginas permitidas según el usuario
  const allowedPages = useMemo(() => {
    if (!user) return [];
    if (user.role === 'owner' || user.role === 'admin') return null; // Acceso total
    if (Array.isArray(user.allowed_pages)) return user.allowed_pages;
    if (typeof user.allowed_pages === 'string') {
      try {
        return JSON.parse(user.allowed_pages);
      } catch (e) {
        return [];
      }
    }
    return [];
  }, [user]);

  // Filtrar ítems de navegación según los accesos permitidos
  const filteredNavItems = useMemo(() => {
    if (allowedPages === null) return navItems;

    return navItems.filter((item) => {
      if (item.subItems) {
        return item.subItems.some(sub => allowedPages.includes(sub.path));
      }
      return allowedPages.includes(item.path);
    }).map((item) => {
      if (item.subItems) {
        return {
          ...item,
          subItems: item.subItems.filter(sub => allowedPages.includes(sub.path))
        };
      }
      return item;
    });
  }, [allowedPages]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };
  const [isLightMode, setIsLightMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'light';
    }
    return document.documentElement.classList.contains('light');
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAgendaOpen, setIsAgendaOpen] = useState(() => location.pathname.startsWith('/agenda'));
  const [isNavHidden, setIsNavHidden] = useState(false);

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
    return filteredNavItems.map((item) => {
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

  const renderHorizontalNavList = () => {
    const flatItems = [];
    filteredNavItems.forEach(item => {
      if (item.subItems) {
        item.subItems.forEach(sub => {
          flatItems.push({ path: sub.path, label: sub.label, icon: sub.icon, end: sub.end });
        });
      } else {
        flatItems.push({ path: item.path, label: item.label, icon: item.icon });
      }
    });

    return flatItems.map((item) => (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.end}
        className={({ isActive }) =>
          `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${isActive
            ? isLightMode
              ? 'bg-[var(--color-gold)] text-white shadow-sm font-semibold'
              : 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
            : isLightMode
              ? 'hover:bg-black/5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              : 'hover:bg-white/10 text-slate-300'
          }`
        }
      >
        <span className="shrink-0">{item.icon}</span>
        <span>{item.label}</span>
      </NavLink>
    ));
  };

  return (
    <div className={`flex flex-col min-h-screen w-full ${isLightMode ? 'bg-[var(--bg)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(226,154,0,0.08),transparent_18%),linear-gradient(180deg,#060606_0%,#0e0e0e_100%)]'}`}>

      {/* BOTÓN FLOTANTE DE RESTAURACIÓN (Menú Hamburguesa cuando la navegación está oculta) */}
      {isNavHidden && (
        <button
          type="button"
          onClick={() => setIsNavHidden(false)}
          className="fixed top-3 left-3 z-[999] p-3 rounded-full bg-[var(--color-gold)] text-white shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer border-2 border-white/30"
          title="Mostrar menú de navegación"
        >
          <IconMenu2 size={22} />
        </button>
      )}

      {/* NAVEGACIÓN MÓVIL Y TABLET HORIZONTAL EN LA PARTE SUPERIOR (Solo en pantallas pequeñas/medianas < lg) */}
      {!isNavHidden && (
        <div className="block lg:hidden shrink-0 border-b sticky top-0 z-40">
          <header className={`flex flex-col backdrop-blur-md ${isLightMode ? 'bg-white/95 border-[var(--color-border)]' : 'bg-black/95 border-white/10 text-white'}`}>
            {/* Encabezado superior con título y acciones */}
            <div className="flex justify-between items-center px-4 py-2.5 border-b border-[var(--color-border)]/30">
              <div className="flex items-center gap-2">
                <h1 className={`text-lg font-display font-bold ${isLightMode ? 'text-[var(--color-gold)]' : 'text-white'} tracking-wide`}>Pimpon Gym</h1>
                {user && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--color-gold)]/10 text-[var(--color-gold)] text-xs font-bold border border-[var(--color-gold)]/20">
                    <IconUser size={12} />
                    {user.full_name?.split(' ')[0] || user.username}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsLightMode(!isLightMode)}
                  className="p-1 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-gold)] transition-colors"
                  title="Cambiar tema"
                >
                  {isLightMode ? <IconSun size={18} /> : <IconMoon size={18} />}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1 rounded-full text-red-400 hover:text-red-300 transition-colors"
                  title="Cerrar sesión"
                >
                  <IconDoorExit size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsNavHidden(true)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--color-gold)]/10 hover:bg-[var(--color-gold)]/20 text-[var(--color-gold)] transition-colors flex items-center gap-1.5 text-xs font-bold border border-[var(--color-gold)]/30 cursor-pointer"
                  title="Ocultar menú"
                >
                  <IconChevronUp size={18} />
                  <span>Ocultar</span>
                </button>
              </div>
            </div>

            {/* Fila Horizontal Scrollable con las Opciones de Navegación (Estilo Ah Kin Tech) */}
            <nav className="flex items-center gap-1 px-3 py-2 overflow-x-auto no-scrollbar whitespace-nowrap">
              {renderHorizontalNavList()}
            </nav>
          </header>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL Y BARRA LATERAL (LG EN ADELANTE) */}
      <div className="flex flex-1">
        {/* BARRA LATERAL: Visible solo en monitores de escritorio (lg+) si no está oculta */}
        {!isNavHidden && (
          <aside className={`hidden lg:flex lg:w-64 shrink-0 sticky top-0 h-screen flex-col shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)] border-r ${isLightMode ? 'bg-white border-[var(--color-border)] text-[var(--color-text)]' : 'bg-[var(--color-navy)] border-transparent text-white'}`}>
            <div className={`p-6 border-b shrink-0 flex justify-between items-center ${isLightMode ? 'border-[var(--color-border)]' : 'border-white/10'}`}>
              <h2 className={`text-2xl font-display font-bold ${isLightMode ? 'text-[var(--color-gold)]' : 'text-white'} tracking-wide`}>Pimpon</h2>
              <button
                type="button"
                onClick={() => setIsNavHidden(true)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-gold)] transition-colors"
                title="Ocultar navegación (Pantalla completa)"
              >
                <IconChevronUp size={18} />
              </button>
            </div>

            <nav className="flex-1 px-6 mt-8 mb-6 space-y-3 overflow-y-auto no-scrollbar">
              {renderNavList(undefined)}
            </nav>

            <div className={`p-4 pt-4 border-t shrink-0 ${isLightMode ? 'border-[var(--color-border)]' : 'border-white/10'} mt-auto flex flex-col gap-3`}>
              {/* Tarjeta del Usuario Registrado Actualmente */}
              {user && (
                <div className={`p-3 rounded-2xl flex items-center gap-3 border ${isLightMode ? 'bg-[var(--color-card-alt)] border-[var(--color-border)]' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-gold)] text-white font-bold text-base shadow-sm">
                    {user.full_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold truncate ${isLightMode ? 'text-[var(--color-text)]' : 'text-white'}`}>
                      {user.full_name || user.username}
                    </p>
                    <span className="inline-block text-[11px] font-semibold text-[var(--color-gold)] truncate">
                      {ROLES_MAP[user.role] || user.role}
                    </span>
                  </div>
                </div>
              )}

              {/* Theme Toggle */}
              <div className="flex items-center justify-between px-2 py-1">
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
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors w-full border cursor-pointer ${isLightMode ? 'hover:bg-black/5 text-[var(--color-danger)] border-[var(--color-border)]' : 'hover:bg-white/5 text-orange-300 border-white/10'}`}
                onClick={handleLogout}
              >
                <span className="flex items-center justify-center"><IconDoorExit size={20} /></span>
                <span className="font-medium">Cerrar Sesión</span>
              </button>
            </div>
          </aside>
        )}

        {/* CONTENIDO PRINCIPAL: Ocupa todo el ancho restante y es fluido */}
        <main className={`flex-1 min-w-0 p-4 sm:p-6 md:p-8 ${isLightMode ? 'bg-[var(--color-surface)]' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}