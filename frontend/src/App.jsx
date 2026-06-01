import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Patients from './pages/Patients';
import Attendance from './pages/Attendance';
import Nutrition from './pages/Nutrition';
import Statistics from './pages/Statistics';
import Finanzas from './pages/Finanzas';
import Config from './pages/Config';
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
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="patients" element={<Patients />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="nutrition" element={<Nutrition />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="finanzas" element={<Finanzas />} />
          <Route path="config" element={<Config />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
