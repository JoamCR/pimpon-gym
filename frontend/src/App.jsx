import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { Login } from './pages/Login';
import Layout from './components/ui/Layout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clients = lazy(() => import('./pages/Clients'));
const Patients = lazy(() => import('./pages/Patients'));
const PatientDetails = lazy(() => import('./pages/PatientDetails'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Nutrition = lazy(() => import('./pages/Nutrition'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Finanzas = lazy(() => import('./pages/Finanzas'));
const Config = lazy(() => import('./pages/Config'));
const Seguridad = lazy(() => import('./pages/Seguridad'));
const Agenda = lazy(() => import('./pages/Agenda'));
const AgendaToday = lazy(() => import('./pages/AgendaToday'));
const WhatsAppAutomation = lazy(() => import('./pages/WhatsAppAutomation'));

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
