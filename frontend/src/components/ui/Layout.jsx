import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  IconLayoutDashboard,
  IconUsers,
  IconClipboardHeart,
  IconCheckbox,
  IconApple,
  IconChartBar,
  IconSettings,
  IconDoorExit,
  IconSun,
  IconMoon
} from '@tabler/icons-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: <IconLayoutDashboard size={20} /> },
  { path: '/clients', label: 'Clientes', icon: <IconUsers size={20} /> },
  { path: '/patients', label: 'Pacientes', icon: <IconClipboardHeart size={20} /> },
  { path: '/attendance', label: 'Asistencia', icon: <IconCheckbox size={20} /> },
  { path: '/nutrition', label: 'Nutrición', icon: <IconApple size={20} /> },
  { path: '/statistics', label: 'Estadísticas', icon: <IconChartBar size={20} /> },
  { path: '/config', label: 'Configuración', icon: <IconSettings size={20} /> },
];

export default function Layout() {
  const [isLightMode, setIsLightMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'light';
    }
    return document.documentElement.classList.contains('light');
  });

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightMode]);

  return (
    <div className={`min-h-screen w-full grid grid-cols-[280px_1fr] ${isLightMode ? 'bg-[var(--bg)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(226,154,0,0.08),transparent_18%),linear-gradient(180deg,#060606_0%,#0e0e0e_100%)]'}`}>
      {/* Sidebar */}
      <aside className={`w-full min-h-screen bg-[var(--color-navy)] flex flex-col shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)] border-r ${isLightMode ? 'border-[var(--color-border)] text-[var(--color-text)]' : 'border-transparent text-white'}`}>
        <div className={`p-6 border-b ${isLightMode ? 'border-[var(--color-border)]' : 'border-white/10'}`}>
          <h1 className="text-2xl font-display font-bold text-[var(--color-gold)] tracking-wide">Pimpon Gym</h1>
        </div>
        
        <nav className="flex-1 px-6 mt-8 space-y-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `block w-full rounded-[var(--radius-lg)] px-4 py-3 transition-all duration-200 ${
                  isActive
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
          ))}
        </nav>
        
        <div className={`p-4 border-t ${isLightMode ? 'border-[var(--color-border)]' : 'border-white/10'} mt-auto flex flex-col gap-4`}>
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

      {/* Main Content */}
      <main className={`flex-1 min-h-screen overflow-y-auto pb-10 p-8 xl:p-10 bg-[var(--color-surface)] ${isLightMode ? 'border-l border-[var(--color-border)]' : 'border-l border-white/5'}`}>
        <Outlet />
      </main>
    </div>
  );
}
