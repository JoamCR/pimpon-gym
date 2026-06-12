import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTodayAttendance, useCreateCheckin, useCheckout } from '../hooks/useAttendance';
import { GymCard } from '../components/ui/GymCard';
import { GymButton } from '../components/ui/GymButton';
import { IconCheck, IconX, IconAlertTriangle } from '@tabler/icons-react';

export default function Attendance() {
  const { data, isLoading } = useTodayAttendance();
  const attendance = Array.isArray(data) ? data : data?.data || [];
  const createCheckin = useCreateCheckin();
  const checkout = useCheckout();

  const [form, setForm] = useState({ client_id: '', method: 'manual' });
  const [scanStatus, setScanStatus] = useState('idle'); // idle, loading, success, warning, error
  const [scanMessage, setScanMessage] = useState('Pase su código por el lector o ingrese ID manual');

  // Escucha global de teclado para el escáner QR
  useEffect(() => {
    let buffer = '';
    let timeoutId;

    const handleKeyDown = (e) => {
      // Ignorar si el usuario está escribiendo manualmente en un input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      if (e.key === 'Enter') {
        if (buffer.length > 5) { // Validar longitud mínima de UUID, teléfono o código
          processCheckin(buffer, 'qr');
        }
        buffer = '';
        return;
      }

      if (e.key.length === 1) {
        buffer += e.key;
      }

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        buffer = '';
      }, 100);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const processCheckin = (clientId, method) => {
    setScanStatus('loading');
    setScanMessage('Validando acceso...');

    createCheckin.mutate({ client_id: clientId, method }, {
      onSuccess: (res) => {
        // Adaptado para leer el status y mensaje custom del backend
        const responseData = res?.data || res || {};
        const status = responseData.status || 'success'; // Puede ser 'success' o 'warning'
        const message = responseData.message || '¡Acceso concedido!';
        
        setScanStatus(status);
        setScanMessage(message);
        setForm({ client_id: '', method: 'manual' });
        
        setTimeout(() => {
          setScanStatus('idle');
          setScanMessage('Pase su código por el lector o ingrese ID manual');
        }, 4500);
      },
      onError: (err) => {
        const errorMessage = err.response?.data?.message || err.message || 'Error al registrar check-in';
        setScanStatus('error');
        setScanMessage(errorMessage);

        setTimeout(() => {
          setScanStatus('idle');
          setScanMessage('Pase su código por el lector o ingrese ID manual');
        }, 4500);
      }
    });
  };

  return (
    <div className="min-h-screen p-6 bg-[var(--color-surface)] space-y-6">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-3 rounded-full bg-[rgba(226,154,0,0.12)] px-4 py-2 text-sm font-semibold text-[var(--color-secondary)]">Asistencia</div>
        <div>
          <h1 className="text-4xl font-[var(--font-display)] font-bold text-[var(--color-text)]">Registro de entradas</h1>
          <p className="text-[var(--color-text-muted)] mt-2">Controla la asistencia diaria y los check-outs desde un tablero moderno.</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <style>{`
            @keyframes scanLine {
              0%, 100% { transform: translateY(-100%); opacity: 0; }
              50% { transform: translateY(100%); opacity: 1; }
            }
          `}</style>
          
          {/* Lector QR Visualizado */}
          <div className={`relative overflow-hidden rounded-[var(--radius-lg)] border-2 transition-colors duration-500 flex flex-col items-center justify-center p-8 text-center min-h-[320px] shadow-sm ${
            scanStatus === 'success' ? 'bg-[rgba(34,197,94,0.1)] border-[var(--color-success)]' :
            scanStatus === 'warning' ? 'bg-[rgba(245,158,11,0.1)] border-[var(--color-warning)]' :
            scanStatus === 'error' ? 'bg-[rgba(239,68,68,0.1)] border-[var(--color-danger)]' :
            scanStatus === 'loading' ? 'bg-[var(--color-surface)] border-[var(--color-secondary)]' :
            'bg-[var(--color-card)] border-[var(--color-border)]'
          }`}>
            {scanStatus === 'success' && <IconCheck size={64} className="text-[var(--color-success)] mb-4 animate-bounce" />}
            {scanStatus === 'warning' && <IconAlertTriangle size={64} className="text-[var(--color-warning)] mb-4 animate-pulse" />}
            {scanStatus === 'error' && <IconX size={64} className="text-[var(--color-danger)] mb-4 animate-pulse" />}
            {scanStatus === 'loading' && <div className="w-16 h-16 border-4 border-[rgba(226,154,0,0.3)] border-t-[var(--color-secondary)] rounded-full animate-spin mb-4" />}
            {scanStatus === 'idle' && (
              <div className="relative w-24 h-24 mb-4">
                <div className="absolute inset-0 border-4 border-dashed border-[var(--color-text-muted)] rounded-xl opacity-40"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-secondary)] to-transparent opacity-30 animate-[scanLine_2.5s_ease-in-out_infinite]"></div>
              </div>
            )}

            <h2 className={`text-xl font-bold mb-2 ${
              scanStatus === 'success' ? 'text-[var(--color-success)]' :
              scanStatus === 'warning' ? 'text-[var(--color-warning)]' :
              scanStatus === 'error' ? 'text-[var(--color-danger)]' :
              'text-[var(--color-text)]'
            }`}>
              {scanMessage}
            </h2>
            {scanStatus === 'idle' && <p className="text-[var(--color-text-muted)] text-sm mt-2">Listo para escanear en segundo plano</p>}
          </div>

          {/* Formulario Manual de Respaldo */}
          <GymCard title="Entrada Manual" variant="default">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[var(--color-text-muted)]">ID, Teléfono o QR Code</label>
                <input
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)] focus:border-[var(--color-secondary)] focus:outline-none transition-colors"
                  placeholder="Ej: 6191234567"
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      processCheckin(form.client_id, form.method);
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Método de ingreso</label>
                <select
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)] focus:border-[var(--color-secondary)] focus:outline-none transition-colors"
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                >
                  <option value="manual">Búsqueda Manual</option>
                  <option value="qr">Código QR Escaneado</option>
                  <option value="code">Código de Pase</option>
                </select>
              </div>
              <GymButton variant="primary" size="lg" className="w-full" onClick={() => processCheckin(form.client_id, form.method)} disabled={!form.client_id}>
                Registrar Entrada
              </GymButton>
            </div>
          </GymCard>
        </div>

        <GymCard title="Asistencia de hoy" subtitle={`${attendance.length} registros`} variant="success">
          <div className="space-y-4">
            {isLoading ? (
              <p className="text-[var(--color-text-muted)]">Cargando asistencia...</p>
            ) : attendance.length === 0 ? (
              <p className="text-[var(--color-text-muted)]">Aún no hay registros de entrada.</p>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
                {attendance.map((record) => (
                  <div key={record.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-alt)] p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-[var(--color-text)]">{record.first_name} {record.last_name}</p>
                      <p className="text-sm text-[var(--color-text-muted)]">{new Date(record.checked_in_at).toLocaleString('es-MX')}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                      {!record.checked_out_at ? (
                        <GymButton variant="secondary" size="sm" onClick={() => checkout.mutate({ id: record.id }, { onSuccess: () => toast.success('Check-out registrado') })}>Check-out</GymButton>
                      ) : (
                        <span className="rounded-full bg-[rgba(56,189,248,0.15)] px-3 py-1 text-sm font-semibold text-[var(--color-teal)]">Salida: {record.checked_out_at}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GymCard>
      </div>
    </div>
  );
}
