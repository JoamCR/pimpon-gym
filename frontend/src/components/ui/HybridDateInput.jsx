import React, { useState, useEffect, useRef } from 'react';
import { IconChevronDown, IconAlertCircle, IconClock } from '@tabler/icons-react';

export function HybridDateInput({ value, onChange, error }) {
  // value expected as YYYY-MM-DD string or empty string
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [age, setAge] = useState(null);
  const [localError, setLocalError] = useState('');

  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);

  // Initialize from value prop
  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-');
      if (y && m && d) {
        setYear(y);
        setMonth(m);
        setDay(d);
        calculateAge(y, m, d);
      }
    } else {
      setYear('');
      setMonth('');
      setDay('');
      setAge(null);
    }
  }, [value]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const calculateAge = (y, m, d) => {
    if (!y || !m || !d) {
      setAge(null);
      return;
    }

    const birthDate = new Date(`${y}-${m}-${d}`);
    // Check if valid date
    if (isNaN(birthDate.getTime()) || birthDate.getFullYear() !== parseInt(y)) {
      setAge(null);
      setLocalError('Fecha no válida. Por favor verifica los valores ingresados.');
      return;
    }

    setLocalError('');
    const today = new Date();
    let currentAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      currentAge--;
    }
    
    // Si la fecha es en el futuro
    if (currentAge < 0) {
      setAge(null);
      setLocalError('La fecha de nacimiento no puede ser en el futuro.');
      return;
    }

    setAge(currentAge);
    
    // Solo disparar onChange si la fecha completa es válida y es diferente del value actual
    const newDateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    if (newDateStr !== value) {
        onChange(newDateStr, currentAge);
    }
  };

  const handleDayChange = (e) => {
    let d = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDay(d);
    if (d.length === 2 && month && year) calculateAge(year, month, d);
    else if (d.length < 2) { setAge(null); onChange('', null); }
  };

  const handleMonthChange = (e) => {
    let m = e.target.value.replace(/\D/g, '').slice(0, 2);
    setMonth(m);
    if (m.length === 2 && day && year) calculateAge(year, m, day);
    else if (m.length < 2) { setAge(null); onChange('', null); }
  };

  const handleYearChange = (e) => {
    let y = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYear(y);
    if (y.length === 4 && day && month) calculateAge(y, month, day);
    else if (y.length < 4) { setAge(null); onChange('', null); }
  };

  const selectOption = (type, val) => {
    if (type === 'day') {
      const d = val.toString().padStart(2, '0');
      setDay(d);
      if (month && year) calculateAge(year, month, d);
    } else if (type === 'month') {
      const m = val.toString().padStart(2, '0');
      setMonth(m);
      if (day && year) calculateAge(year, m, day);
    } else if (type === 'year') {
      const y = val.toString();
      setYear(y);
      if (day && month) calculateAge(y, month, day);
    }
    setActiveDropdown(null);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const displayError = error || localError;

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <label className="block text-sm font-semibold text-[var(--color-text-muted)]">
        Fecha de Nacimiento (Día / Mes / Año) y Edad
      </label>
      
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {/* Día */}
        <div className="relative group flex flex-col">
          <div className={`flex items-center flex-1 bg-[var(--color-card-alt)] border ${displayError ? 'border-red-500' : 'border-[var(--color-border)]'} rounded-[var(--radius-md)] focus-within:border-[var(--color-text-muted)] transition-all overflow-hidden`}>
            <input 
              type="text" 
              placeholder="DD" 
              value={day}
              onChange={handleDayChange}
              onFocus={() => setActiveDropdown('day')}
              maxLength="2"
              className="w-full text-center py-2.5 pl-2 pr-1 text-sm text-[var(--color-text)] bg-transparent border-none outline-none focus:ring-0"
            />
            <button 
              type="button" 
              onClick={() => setActiveDropdown(activeDropdown === 'day' ? null : 'day')}
              className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus:outline-none transition-colors"
            >
              <IconChevronDown size={14} className={`transform transition-transform duration-200 ${activeDropdown === 'day' ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {activeDropdown === 'day' && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-lg max-h-48 overflow-y-auto z-50 custom-scrollbar p-1">
              {days.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => selectOption('day', d)}
                  className="w-full text-center py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
                >
                  {d.toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mes */}
        <div className="relative group flex flex-col">
          <div className={`flex items-center flex-1 bg-[var(--color-card-alt)] border ${displayError ? 'border-red-500' : 'border-[var(--color-border)]'} rounded-[var(--radius-md)] focus-within:border-[var(--color-text-muted)] transition-all overflow-hidden`}>
            <input 
              type="text" 
              placeholder="MM" 
              value={month}
              onChange={handleMonthChange}
              onFocus={() => setActiveDropdown('month')}
              maxLength="2"
              className="w-full text-center py-2.5 pl-2 pr-1 text-sm text-[var(--color-text)] bg-transparent border-none outline-none focus:ring-0"
            />
            <button 
              type="button" 
              onClick={() => setActiveDropdown(activeDropdown === 'month' ? null : 'month')}
              className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus:outline-none transition-colors"
            >
              <IconChevronDown size={14} className={`transform transition-transform duration-200 ${activeDropdown === 'month' ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {activeDropdown === 'month' && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-lg max-h-48 overflow-y-auto z-50 custom-scrollbar p-1">
              {months.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => selectOption('month', m)}
                  className="w-full text-center py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
                >
                  {m.toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Año */}
        <div className="relative group flex flex-col">
          <div className={`flex items-center flex-1 bg-[var(--color-card-alt)] border ${displayError ? 'border-red-500' : 'border-[var(--color-border)]'} rounded-[var(--radius-md)] focus-within:border-[var(--color-text-muted)] transition-all overflow-hidden`}>
            <input 
              type="text" 
              placeholder="AAAA" 
              value={year}
              onChange={handleYearChange}
              onFocus={() => setActiveDropdown('year')}
              maxLength="4"
              className="w-full text-center py-2.5 pl-2 pr-1 text-sm text-[var(--color-text)] bg-transparent border-none outline-none focus:ring-0"
            />
            <button 
              type="button" 
              onClick={() => setActiveDropdown(activeDropdown === 'year' ? null : 'year')}
              className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus:outline-none transition-colors"
            >
              <IconChevronDown size={14} className={`transform transition-transform duration-200 ${activeDropdown === 'year' ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {activeDropdown === 'year' && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-lg max-h-48 overflow-y-auto z-50 custom-scrollbar p-1">
              {years.map(y => (
                <button
                  key={y}
                  type="button"
                  onClick={() => selectOption('year', y)}
                  className="w-full text-center py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
                >
                  {y}
             </button>
              ))}
            </div>
          )}
        </div>

        {/* Campo Edad Calculada */}
        <div className="flex flex-col">
          <div className="bg-[var(--color-card-alt)] px-3 py-2.5 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] flex items-center justify-center transition-all">
            <span className={`text-sm font-semibold transition-all duration-300 ${age !== null ? 'text-[var(--color-secondary)]' : 'text-[var(--color-text-muted)] opacity-50'}`}>
              {age !== null ? `${age} años` : 'Edad'}
            </span>
          </div>
        </div>

      </div>

      {/* Alerta de Error */}
      {displayError && (
        <div className="p-2.5 mt-2 bg-red-500/10 border border-red-500/20 rounded-[var(--radius-md)] flex items-center gap-2 transition-all">
          <IconAlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-500 font-medium">{displayError}</p>
        </div>
      )}
    </div>
  );
}
