import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { Login } from './pages/Login';
import Layout from './components/ui/Layout';

// Helper para cargar rutas lazy con reintento automático y recarga limpia si hubo un nuevo despliegue en Vercel
const lazyWithRetry = (importFn, chunkName) =>
  lazy(async () => {
    try {
      return await importFn();
    } catch (firstErr) {
      // Reintentar una vez tras 600ms por si fue un micro-corte de red móvil
      try {
        await new Promise((r) => setTimeout(r, 600));
        return await importFn();
      } catch (secondErr) {
        const key = `pimpon_reload_${chunkName}`;
        const lastReload = Number(sessionStorage.getItem(key) || 0);
        if (Date.now() - lastReload > 15000) {
          sessionStorage.setItem(key, String(Date.now()));
          window.location.reload();
          return new Promise(() => {});
        }
        throw secondErr;
      }
    }
  });

const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'), 'Dashboard');
const Clients = lazyWithRetry(() => import('./pages/Clients'), 'Clients');
const Patients = lazyWithRetry(() => import('./pages/Patients'), 'Patients');
const PatientDetails = lazyWithRetry(() => import('./pages/PatientDetails'), 'PatientDetails');
const Attendance = lazyWithRetry(() => import('./pages/Attendance'), 'Attendance');
const Nutrition = lazyWithRetry(() => import('./pages/Nutrition'), 'Nutrition');
const Statistics = lazyWithRetry(() => import('./pages/Statistics'), 'Statistics');
const Finanzas = lazyWithRetry(() => import('./pages/Finanzas'), 'Finanzas');
const Config = lazyWithRetry(() => import('./pages/Config'), 'Config');
const Seguridad = lazyWithRetry(() => import('./pages/Seguridad'), 'Seguridad');
const Agenda = lazyWithRetry(() => import('./pages/Agenda'), 'Agenda');
const AgendaToday = lazyWithRetry(() => import('./pages/AgendaToday'), 'AgendaToday');
const WhatsAppAutomation = lazyWithRetry(() => import('./pages/WhatsAppAutomation'), 'WhatsAppAutomation');

function getAllowedPagesForUser(user) {
  if (!user) return [];
  if (user.role === 'owner' || user.role === 'admin') return null; // Acceso total
  if (Array.isArray(user.allowed_pages)) return user.allowed_pages;
  if (typeof user.allowed_pages === 'string') {
    try {
      const parsed = JSON.parse(user.allowed_pages);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Componente Guardián de Rutas Privadas con validación de rol y páginas permitidas
function ProtectedRoute({ children }) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated || !token || !user) {
    return <Navigate to="/login" replace />;
  }

  const allowedPages = getAllowedPagesForUser(user);
  if (allowedPages !== null && location.pathname !== '/') {
    const currentPath = location.pathname;
    const isAllowed =
      allowedPages.includes(currentPath) ||
      (currentPath.startsWith('/patients/') && allowedPages.includes('/patients'));

    if (!isAllowed) {
      const fallbackPath = allowedPages[0] || '/login';
      if (fallbackPath !== currentPath) {
        return <Navigate to={fallbackPath} replace />;
      }
    }
  }

  return children;
}

function App() {
  return (
    <>
      {/* Configuración global de Toasts */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'var(--font-body)',
            background: 'var(--color-navy)',
            color: 'var(--color-text)',
          }
        }}
      />      
      {/* Sistema de Rutas con Layout Principal */}
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] text-[var(--color-text-muted)]">
            Cargando módulo...
          </div>
        }
      >
        <Routes>
          {/* Ruta pública (Login) */}
          <Route path="/login" element={<Login />} />

          {/* Rutas privadas protegidas (Layout) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="patients" element={<Patients />} />
            <Route path="patients/:slug" element={<PatientDetails />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="nutrition" element={<Nutrition />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="agenda/dia" element={<AgendaToday />} />
            <Route path="finanzas" element={<Finanzas />} />
            <Route path="whatsapp" element={<WhatsAppAutomation />} />
            <Route path="config" element={<Config />} />
            <Route path="seguridad" element={<Seguridad />} />
          </Route>

          {/* Redirección por defecto si no se encuentra la ruta */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
