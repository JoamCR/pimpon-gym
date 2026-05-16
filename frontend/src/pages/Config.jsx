import React, { useEffect, useState } from 'react';
import { GymCard } from '../components/ui/GymCard';
import { GymButton } from '../components/ui/GymButton';
import { useConfig, useUpdateConfig } from '../hooks/useConfig';

export default function Config() {
  const { data, isLoading, isError, refetch } = useConfig();
  const update = useUpdateConfig();

  const cfg = data?.data || {};
  const [transferLimit, setTransferLimit] = useState(cfg.transferMonthlyLimit || 30000);
  const [messages, setMessages] = useState(cfg.whatsappMessages || { '3day_warning': '', 'expiry_day': '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cfg) {
      setTransferLimit(cfg.transferMonthlyLimit || 30000);
      setMessages(cfg.whatsappMessages || { '3day_warning': '', 'expiry_day': '' });
    }
  }, [cfg]);

  const handleMessageChange = (key, value) => {
    setMessages((m) => ({ ...m, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await update.mutateAsync({ transferMonthlyLimit: Number(transferLimit), whatsappMessages: messages });
      await refetch();
      setSaving(false);
      alert('Configuración guardada');
    } catch (err) {
      setSaving(false);
      alert(err.message || 'Error al guardar configuración');
    }
  };

  if (isLoading) return <div className="p-6">Cargando configuración...</div>;
  if (isError) return <div className="p-6">Error al cargar configuración.</div>;

  return (
    <div className="min-h-screen p-6 bg-[var(--color-surface)] space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-bold text-[var(--color-text)]">Configuración</h1>
        <p className="text-[var(--color-text-muted)] mt-2">Ajustes globales del sistema</p>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <GymCard title="Control de transferencias" subtitle="Límite mensual" variant="default">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-[var(--color-text)]">Tope mensual (MXN)</label>
            <input type="number" value={transferLimit} onChange={(e) => setTransferLimit(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3 py-2 text-[var(--color-text)]" />
            <p className="text-sm text-[var(--color-text-muted)]">Este valor se usa para advertencias de transferencias.</p>
          </div>
        </GymCard>

        <GymCard title="Mensajes WhatsApp" subtitle="Plantillas automáticas" variant="default">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-[var(--color-text)]">Aviso 3 días</label>
            <textarea value={messages['3day_warning'] || ''} onChange={(e) => handleMessageChange('3day_warning', e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3 py-2 text-[var(--color-text)]" rows={3} />

            <label className="text-sm font-semibold text-[var(--color-text)]">Aviso día de vencimiento</label>
            <textarea value={messages['expiry_day'] || ''} onChange={(e) => handleMessageChange('expiry_day', e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3 py-2 text-[var(--color-text)]" rows={3} />
          </div>
        </GymCard>
      </section>

      <div className="flex justify-end">
        <GymButton variant="secondary" className="mr-3" onClick={() => { refetch(); }}>Revertir</GymButton>
        <GymButton variant="primary" onClick={handleSave} loading={saving}>Guardar cambios</GymButton>
      </div>
    </div>
  );
}
