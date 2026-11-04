import React from 'react';

export function ZebraTableCard({
  title,
  headers = ['Nombre', 'Contacto', 'Detalle'],
  rows = [],
  countLabel = 'registro(s)',
  emptyIcon,
  emptyText = 'Selecciona una tarjeta para ver el listado detallado.',
  accentClass = 'bg-[rgba(15,62,96,0.1)] text-[var(--color-secondary)]',
  hoverClass = 'hover:bg-[rgba(15,62,96,0.08)]'
}) {
  return (
    <div className="lg:col-span-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden shadow-sm sticky top-6">
      <div className="bg-[var(--color-surface)] p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h4 className="font-bold text-[var(--color-text)] flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-secondary)]" />
          {title}
        </h4>
        <span className={`text-xs font-semibold px-2 py-1 rounded ${accentClass}`}>
          {rows.length} {countLabel}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-[var(--color-text-muted)] text-sm space-y-2">
          {emptyIcon}
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="max-h-[520px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[var(--color-card-alt)] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">{headers[0]}</th>
                <th className="py-3 px-4">{headers[1]}</th>
                <th className="py-3 px-4 text-right">{headers[2]}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map((row, idx) => (
                <tr
                  key={idx}
                  className={`${
                    idx % 2 === 0 ? 'bg-[var(--color-card)]' : 'bg-[var(--color-card-alt)]/50'
                  } ${hoverClass} transition-colors`}
                >
                  <td className="py-3 px-4 font-semibold text-[var(--color-text)]">{row.name}</td>
                  <td className="py-3 px-4 text-[var(--color-text-muted)]">{row.phone}</td>
                  <td className="py-3 px-4 text-right font-medium text-[var(--color-secondary)]">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

