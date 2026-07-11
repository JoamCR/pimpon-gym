import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Login } from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import Attendance from './pages/Attendance';
import Nutrition from './pages/Nutrition';
import Statistics from './pages/Statistics';
import Finanzas from './pages/Finanzas';
import Config from './pages/Config';
import Agenda from './pages/Agenda';
import Layout from './components/ui/Layout';

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
      <Routes>
        {/* Rutas públicas (sin layout) */}
        <Route path="/login" element={<Login />} />

        {/* Rutas privadas (con layout) */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/login" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="patients" element={<Patients />} />
          <Route path="patients/:slug" element={<PatientDetails />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="nutrition" element={<Nutrition />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="finanzas" element={<Finanzas />} />
          <Route path="config" element={<Config />} />
        </Route>

        {/* Redirección por defecto si no se encuentra la ruta */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;
