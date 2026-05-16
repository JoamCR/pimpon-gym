import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/clients', label: 'Clientes', icon: '👥' },
  { path: '/patients', label: 'Pacientes', icon: '🩺' },
  { path: '/attendance', label: 'Asistencia', icon: '✅' },
  { path: '/nutrition', label: 'Nutrición', icon: '🍎' },
  { path: '/statistics', label: 'Estadísticas', icon: '📈' },
  { path: '/config', label: 'Configuración', icon: '⚙️' },
];

export default function Layout() {
  return (
    <div className="min-h-screen w-full grid grid-cols-[280px_1fr] bg-[radial-gradient(circle_at_top_left,rgba(226,154,0,0.08),transparent_18%),linear-gradient(180deg,#060606_0%,#0e0e0e_100%)]">
      {/* Sidebar */}
      <aside className="w-full min-h-screen bg-[var(--color-navy)] text-white flex flex-col shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)]">
        <div className="p-6 border-b border-white/10">
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
                    ? 'bg-white/10 text-white font-semibold shadow-[0_14px_40px_-28px_rgba(226,154,0,0.85)]'
                    : 'hover:bg-white/5 text-slate-300'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/10 mt-auto">
          <button 
            className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 text-orange-300 transition-colors w-full border border-white/10"
            onClick={() => alert('Próximamente: Cerrar Sesión')}
          >
            <span className="text-xl">🚪</span>
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-y-auto pb-10 p-8 xl:p-10 bg-[var(--color-surface)] border-l border-white/5">
        <Outlet />
      </main>
    </div>
  );
}
