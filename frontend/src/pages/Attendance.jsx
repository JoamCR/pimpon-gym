import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useTodayAttendance, useCreateCheckin, useCheckout } from '../hooks/useAttendance';
import { GymCard } from '../components/ui/GymCard';
import { GymButton } from '../components/ui/GymButton';

export default function Attendance() {
  const { data, isLoading } = useTodayAttendance();
  const attendance = Array.isArray(data) ? data : data?.data || [];
  const createCheckin = useCreateCheckin();
  const checkout = useCheckout();

  const [form, setForm] = useState({ client_id: '', method: 'qr' });

  const submit = () => {
    createCheckin.mutate(form, {
      onSuccess: () => {
        toast.success('Check-in registrado');
        setForm({ client_id: '', method: 'qr' });
      },
      onError: (err) => toast.error(err.message || 'Error al registrar check-in'),
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
        <GymCard title="Registrar entrada" variant="default">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Socio o WhatsApp</label>
              <input
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                placeholder="Ej: 6191234567 o ID"
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Método</label>
              <select
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                <option value="qr">QR</option>
                <option value="manual">Manual</option>
                <option value="code">Código</option>
              </select>
            </div>
            <GymButton variant="primary" size="lg" className="w-full" onClick={submit}>Registrar Check-in</GymButton>
          </div>
        </GymCard>

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
