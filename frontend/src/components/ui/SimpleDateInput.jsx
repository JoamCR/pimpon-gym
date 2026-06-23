import React, { useState, useEffect, useRef } from 'react'; // No changes needed in content, just rename
import { IconChevronDown, IconAlertCircle } from '@tabler/icons-react';

/**
 * Componente genérico para seleccionar una fecha con campos separados para día, mes y año.
 * Es una versión simplificada de HybridDateInput, sin el cálculo de edad.
 *
 * @param {object} props
 * @param {string} props.value - La fecha actual en formato 'YYYY-MM-DD'.
 * @param {function} props.onChange - Callback que se ejecuta al cambiar la fecha. Devuelve 'YYYY-MM-DD' o ''.
 * @param {string} [props.label] - Etiqueta para el grupo de inputs.
 * @param {string} [props.error] - Mensaje de error a mostrar.
 */
export function SimpleDateInput({ value, onChange, label, error }) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [localError, setLocalError] = useState('');

  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const monthOptions = [
    { value: '01', name: 'Enero' }, { value: '02', name: 'Febrero' }, { value: '03', name: 'Marzo' },
    { value: '04', name: 'Abril' }, { value: '05', name: 'Mayo' }, { value: '06', name: 'Junio' },
    { value: '07', name: 'Julio' }, { value: '08', name: 'Agosto' }, { value: '09', name: 'Septiembre' },
    { value: '10', name: 'Octubre' }, { value: '11', name: 'Noviembre' }, { value: '12', name: 'Diciembre' },
  ];

  // Inicializa los campos si se provee un valor
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      setYear(y);
      setMonth(m);
      setDay(d);
    } else {
      setYear('');
      setMonth('');
      setDay('');
    }
  }, [value]);

  // Cierra los dropdowns al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateDate = (y, m, d) => {
    if (!y || !m || !d || y.length < 4 || m.length < 2 || d.length < 2) {
      onChange('');
      return;
    }

    const date = new Date(`${y}-${m}-${d}`);
    if (isNaN(date.getTime()) || date.getFullYear() !== parseInt(y, 10) || (date.getMonth() + 1) !== parseInt(m, 10)) {
      setLocalError('Fecha no válida.');
      onChange('');
      return;
    }

    setLocalError('');
    const newDateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    if (newDateStr !== value) {
      onChange(newDateStr);
    }
  };

  const handleDayChange = (e) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDay(d);
    updateDate(year, month, d);
  };

  const handleMonthChange = (e) => {
    const input = e.target.value;
    const numericInput = input.replace(/\D/g, '').slice(0, 2);
    
    // Check if user is typing a number
    if (numericInput.length > 0) {
      setMonth(numericInput);
      updateDate(year, numericInput, day);
    } else {
      // If not a number, it might be the name of a month, keep it in the input but don't update the state value yet
      setMonth(input);
    }
  };


  const handleYearChange = (e) => {
    const y = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYear(y);
    updateDate(y, month, day);
  };

  const selectOption = (type, val) => {
    let newDay = day, newMonth = month, newYear = year;
    if (type === 'day') {
      newDay = val.toString().padStart(2, '0');
      setDay(newDay);
    } else if (type === 'month') {
      newMonth = val.toString().padStart(2, '0');
      setMonth(newMonth);
    } else if (type === 'year') {
      newYear = val.toString();
      setYear(newYear);
    }
    setActiveDropdown(null);
    updateDate(newYear, newMonth, newDay);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + 5 - i).sort((a, b) => b - a);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const displayError = error || localError;

  const getMonthInputValue = () => {
    if (!month) return '';
    const formattedMonth = month.padStart(2, '0');
    const selected = monthOptions.find(m => m.value === formattedMonth);
    return selected ? selected.name : month;
  };

  return (
    <div className="space-y-2 flex-grow" ref={dropdownRef}>
      {label && <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{label}</label>}
      
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Día, Mes, Año */}
        {['day', 'month', 'year'].map(type => (
          <div key={type} className="relative group flex flex-col">
            <div className={`flex items-center flex-1 bg-[var(--color-card-alt)] border ${displayError ? 'border-red-500' : 'border-[var(--color-border)]'} rounded-[var(--radius-md)] focus-within:border-[var(--color-secondary)] transition-all overflow-hidden`}>
              <input 
                type="text" 
                placeholder={type.charAt(0).toUpperCase() + type.slice(1)} 
                value={type === 'day' ? day : type === 'month' ? getMonthInputValue() : year}
                onChange={type === 'day' ? handleDayChange : type === 'month' ? handleMonthChange : handleYearChange}
                onFocus={() => setActiveDropdown(type)}
                maxLength={type === 'year' ? 4 : 2}
                className="w-full text-center py-2.5 pl-2 pr-1 text-sm text-[var(--color-text)] bg-transparent border-none outline-none focus:ring-0"
              />
              <button 
                type="button" 
                onClick={() => setActiveDropdown(activeDropdown === type ? null : type)}
                className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus:outline-none transition-colors"
              >
                <IconChevronDown size={14} className={`transform transition-transform duration-200 ${activeDropdown === type ? 'rotate-180' : ''}`} />
              </button>
            </div>
            
            {activeDropdown === type && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-lg max-h-48 overflow-y-auto z-50 custom-scrollbar p-1">
                {(type === 'day' ? days : type === 'month' ? monthOptions : years).map(item => {
                  const value = type === 'month' ? item.value : item;
                  const name = type === 'month' ? item.name : item.toString().padStart(2, '0');
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => selectOption(type, value)}
                      className={`w-full text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-md transition-colors ${type === 'month' ? 'text-left px-3 py-1.5' : 'text-center py-1.5'}`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {displayError && (
        <div className="p-2.5 mt-2 bg-red-500/10 border border-red-500/20 rounded-[var(--radius-md)] flex items-center gap-2 transition-all">
          <IconAlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-500 font-medium">{displayError}</p>
        </div>
      )}
    </div>
  );
}

// Renaming the export for clarity and future use
export { SimpleDateInput as GenericDateInput };