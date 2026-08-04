import React from 'react';

export function PageHeader({ icon: Icon, tag, title, subtitle, actions, className = '' }) {
  return (
    <header className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 ${className}`}>
      <div className="space-y-3">
        {tag && (
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(226,154,0,0.12)] px-4 py-2 text-sm font-semibold text-[var(--color-gold)]">
            {React.isValidElement(Icon) ? Icon : (Icon ? <Icon size={18} /> : null)}
            <span>{tag}</span>
          </div>
        )}
        <div>
          <h1 className="text-4xl font-[var(--font-display)] font-bold text-[var(--color-text)]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[var(--color-text-muted)] mt-2 text-sm sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-3 flex-wrap">
          {actions}
        </div>
      )}
    </header>
  );
}

export default PageHeader;
