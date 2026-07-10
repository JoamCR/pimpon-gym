import React, { useState, useEffect, useRef } from 'react';
import { IconChevronDown, IconAlertCircle } from '@tabler/icons-react';

export function HybridDateInput({ value, onChange, error }) {
  // value expected as YYYY-MM-DD string or empty string
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [age, setAge] = useState(null);
  const [localError, setLocalError] = useState('');

  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);

  // Arreglo de meses con sus respectivos nombres y valores
  const monthOptions = [
    { value: '01', name: 'Enero' },
    { value: '02', name: 'Febrero' },
    { value: '03', name: 'Marzo' },
    { value: '04', name: 'Abril' },
    { value: '05', name: 'Mayo' },
    { value: '06', name: 'Junio' },
    { value: '07', name: 'Julio' },
    { value: '08', name: 'Agosto' },
    { value: '09', name: 'Septiembre' },
    { value: '10', name: 'Octubre' },
    { value: '11', name: 'Noviembre' },
    { value: '12', name: 'Diciembre' },
  ];

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

    // Usar new Date(y, m-1, d) para evitar problemas de zona horaria (que pueden hacer que '2024-01-01' se interprete como el día anterior)
    const birthDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    // Check if valid date
    if (isNaN(birthDate.getTime()) || birthDate.getFullYear() !== parseInt(y) || birthDate.getMonth() + 1 !== parseInt(m) || birthDate.getDate() !== parseInt(d)) {
      setAge(null);
      setLocalError('Fecha no válida.');
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

  const attemptToCalculateAge = (y, m, d) => {
    // Solo intentar calcular si todos los campos tienen valores que parecen válidos
    const isPotentiallyComplete = y && y.length === 4 && m && d;

    if (isPotentiallyComplete) {
      calculateAge(y, m, d);
    } else {
      // Si la fecha está incompleta (p.ej. el año tiene 3 dígitos), solo limpiamos la edad y el error.
      setAge(null);
      if (localError) setLocalError('');
      // No notificamos al padre para evitar que el `value` prop reinicie los campos.
    }
  };

  const handleDayChange = (e) => {
    let d = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDay(d);
    attemptToCalculateAge(year, month, d);
  };

  const handleMonthChange = (e) => {
    const input = e.target.value;
    const numericInput = input.replace(/\D/g, '').slice(0, 2);

    // Intenta encontrar el mes por nombre
    const matchedMonth = monthOptions.find(m => m.name.toLowerCase().startsWith(input.toLowerCase()));

    if (matchedMonth) {
      setMonth(matchedMonth.value);
      attemptToCalculateAge(year, matchedMonth.value, day);
    } else if (numericInput.length > 0) {
      setMonth(numericInput);
      attemptToCalculateAge(year, numericInput, day);
    } else {
      // Permite que el input visualmente muestre lo que el usuario escribe
      setMonth(input);
      setAge(null);
      if (localError) setLocalError('');
    }
  };

  const handleYearChange = (e) => {
    let y = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYear(y);
    attemptToCalculateAge(y, month, day);
  };  

  const selectOption = (type, val) => {
    const d = type === 'day' ? val.toString().padStart(2, '0') : day;
    const m = type === 'month' ? val.toString().padStart(2, '0') : month;
    const y = type === 'year' ? val.toString() : year;
    setDay(d); setMonth(m); setYear(y);
    setActiveDropdown(null);
    attemptToCalculateAge(y, m, d);
  };

  // Formatear al salir del campo (onBlur)
  const handleBlur = (type) => {
    if (type === 'day' && day.length === 1) {
      const paddedDay = day.padStart(2, '0');
      setDay(paddedDay);
      attemptToCalculateAge(year, month, paddedDay);
    }
    if (type === 'month' && month.length === 1) {
      const paddedMonth = month.padStart(2, '0');
      setMonth(paddedMonth);
      attemptToCalculateAge(year, paddedMonth, day);
    }
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const displayError = error || localError;

  // Función para obtener la etiqueta visible en el input
  const getMonthInputValue = () => {
    if (!month) return '';
    // Formatear temporalmente el número de mes para buscarlo en la lista de opciones
    const formattedMonth = month.padStart(2, '0');
    const selected = monthOptions.find(m => m.value === formattedMonth);
    // Si lo encuentra muestra el nombre, de lo contrario lo que esté digitando el usuario
    return selected ? selected.name : month;
  };

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
              placeholder="Día" 
              value={day}
              onChange={handleDayChange}
              onBlur={() => handleBlur('day')}
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
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-lg max-h-40 overflow-y-auto z-50 custom-scrollbar p-1">
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
              placeholder="Mes" 
              /* Cambiado de value={month} a la función formateadora visual */
              value={getMonthInputValue()} 
              onChange={handleMonthChange}
              onBlur={() => handleBlur('month')}
              onFocus={() => setActiveDropdown('month')}
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
            <div className="absolute top-full left-0 right-0 min-w-[120px] mt-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-lg max-h-48 overflow-y-auto z-50 custom-scrollbar p-1">
              {monthOptions.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => selectOption('month', m.value)}
                  className="w-full text-left px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
                >
                  {m.name}
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
              placeholder="Año" 
              value={year}
              onChange={handleYearChange}
              onBlur={() => handleBlur('year')}
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