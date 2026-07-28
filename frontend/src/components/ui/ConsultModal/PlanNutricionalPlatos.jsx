import { useRef, useState, useCallback, useEffect } from 'react';
import { IconDownload } from '@tabler/icons-react';

const Plato = ({ titulo, name, valores, onChange, readOnly = false }) => {
  const handleChange = (e) => {
    if (readOnly) return;
    const rawValue = e.target.value.replace(/\D/g, '').slice(0, 3);
    onChange(name, e.target.name, rawValue);
  };

  return (
    <div 
      className="flex flex-col items-center p-2 sm:p-3 rounded-xl shadow-lg w-full transition-all"
      style={{ backgroundColor: '#090d16', border: '1px solid #1f293d' }}
    >
      {/* MEAL HEADER TITLE */}
      <div 
        className="w-full text-center py-1 px-1.5 rounded-lg mb-2 shadow-sm"
        style={{ backgroundColor: '#2a1708', border: '1px solid #7c2d12' }}
      >
        <h3 
          className="font-black text-[11px] sm:text-xs uppercase tracking-wider truncate"
          style={{ color: '#ffffff' }}
        >
          {titulo}
        </h3>
      </div>

      {/* CIRCULAR PORTION PLATE */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 drop-shadow-xl select-none">
        <svg viewBox="0 0 200 200" className="w-full h-full filter drop-shadow-md">
          {/* Outer plate rim */}
          <circle cx="100" cy="100" r="98" fill="#0f172a" stroke="#334155" strokeWidth="4" />
          <circle cx="100" cy="100" r="92" fill="#1e293b" stroke="#475569" strokeWidth="2" />

          {/* Slices (Left: 2 quarters, Right: half) */}
          {/* Cuarto 1 (25% - Top Left - Red) */}
          <path
            d="M 100,10 A 90,90 0 0,0 10,100 L 100,100 Z"
            fill="#ef4444"
            stroke="#0f172a"
            strokeWidth="3"
          />
          {/* Cuarto 2 (25% - Bottom Left - Yellow) */}
          <path
            d="M 10,100 A 90,90 0 0,0 100,190 L 100,100 Z"
            fill="#eab308"
            stroke="#0f172a"
            strokeWidth="3"
          />
          {/* Mitad (50% - Right Half - Green) */}
          <path
            d="M 100,10 A 90,90 0 0,1 100,190 L 100,100 Z"
            fill="#22c55e"
            stroke="#0f172a"
            strokeWidth="3"
          />

          {/* Inner divider lines & center hub */}
          <circle cx="100" cy="100" r="8" fill="#0f172a" stroke="#475569" strokeWidth="2" />
        </svg>

        {/* INPUTS / VALUES OVERLAY */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Cuarto 1 (Top Left) */}
          <div 
            className="absolute flex items-center justify-center pointer-events-auto"
            style={{ left: '32.5%', top: '34%', transform: 'translate(-50%, -50%)' }}
          >
            {readOnly ? (
              <div 
                className="px-2 py-0.5 min-w-[1.8rem] rounded-md text-center font-black text-xs shadow-md"
                style={{ backgroundColor: '#05070a', border: '1px solid #ef4444', color: '#fca5a5' }}
              >
                {valores?.cuarto1 || '0'}
              </div>
            ) : (
              <input
                name="cuarto1"
                value={valores?.cuarto1 || ''}
                onChange={handleChange}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                placeholder="0"
                className="w-9 h-7 sm:w-10 sm:h-8 rounded-md text-center font-black text-xs shadow-md focus:outline-none transition-all"
                style={{ backgroundColor: '#05070a', border: '1px solid #ef4444', color: '#ffffff' }}
              />
            )}
          </div>

          {/* Cuarto 2 (Bottom Left) */}
          <div 
            className="absolute flex items-center justify-center pointer-events-auto"
            style={{ left: '32.5%', top: '68%', transform: 'translate(-50%, -50%)' }}
          >
            {readOnly ? (
              <div 
                className="px-2 py-0.5 min-w-[1.8rem] rounded-md text-center font-black text-xs shadow-md"
                style={{ backgroundColor: '#05070a', border: '1px solid #eab308', color: '#fde047' }}
              >
                {valores?.cuarto2 || '0'}
              </div>
            ) : (
              <input
                name="cuarto2"
                value={valores?.cuarto2 || ''}
                onChange={handleChange}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                placeholder="0"
                className="w-9 h-7 sm:w-10 sm:h-8 rounded-md text-center font-black text-xs shadow-md focus:outline-none transition-all"
                style={{ backgroundColor: '#05070a', border: '1px solid #eab308', color: '#ffffff' }}
              />
            )}
          </div>

          {/* Mitad (Right Half) */}
          <div 
            className="absolute flex items-center justify-center pointer-events-auto"
            style={{ left: '73%', top: '52%', transform: 'translate(-50%, -50%)' }}
          >
            {readOnly ? (
              <div 
                className="px-2 py-0.5 min-w-[1.8rem] rounded-md text-center font-black text-xs shadow-md"
                style={{ backgroundColor: '#05070a', border: '1px solid #22c55e', color: '#86efac' }}
              >
                {valores?.mitad || '0'}
              </div>
            ) : (
              <input
                name="mitad"
                value={valores?.mitad || ''}
                onChange={handleChange}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                placeholder="0"
                className="w-9 h-7 sm:w-10 sm:h-8 rounded-md text-center font-black text-xs shadow-md focus:outline-none transition-all"
                style={{ backgroundColor: '#05070a', border: '1px solid #22c55e', color: '#ffffff' }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export function PlanNutricionalPlatos({ patient, values, setValues, onSaveImage, isSaving, readOnly = false }) {
  const printRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const URL_ENCABEZADO = "/headerNutritionPlan.png";
  const URL_FOOTER = "/footerNutritionPlan.png";

  const [platos, setPlatos] = useState({
    desayuno: { mitad: '', cuarto1: '', cuarto2: '' },
    colacion_manana: { mitad: '', cuarto1: '', cuarto2: '' },
    almuerzo: { mitad: '', cuarto1: '', cuarto2: '' },
    colacion_tarde: { mitad: '', cuarto1: '', cuarto2: '' },
    cena: { mitad: '', cuarto1: '', cuarto2: '' }
  });

  useEffect(() => {
    if (values.diet_plan) {
      try {
        const parsed = JSON.parse(values.diet_plan);
        if (parsed && typeof parsed === 'object') {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setPlatos((prev) => ({ ...prev, ...parsed }));
        }
      } catch {
        // If it's old text format, keep default
      }
    }
  }, [values.diet_plan]);

  const handleChangePlato = (platoName, field, value) => {
    const newPlatos = {
      ...platos,
      [platoName]: {
        ...platos[platoName],
        [field]: value
      }
    };
    setPlatos(newPlatos);
    setValues({ ...values, diet_plan: JSON.stringify(newPlatos) });
  };

  const exportarPlan = useCallback(async () => {
    if (printRef.current === null) return;
    
    setIsExporting(true);
    
    try {
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Fallo al cargar html2canvas'));
          document.head.appendChild(script);
        });
      }

      const canvas = await window.html2canvas(printRef.current, { 
        scale: 2, 
        useCORS: true, 
        allowTaint: true,
        backgroundColor: '#000000', 
        logging: false,
      });
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      const patientName = patient ? `${patient.first_name || ''}_${patient.last_name || ''}`.trim().replace(/\s+/g, '_') : 'Paciente';
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${patientName || 'Paciente'}_${dateStr}_PlanNutricional.jpg`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (onSaveImage) {
        try {
          await onSaveImage(dataUrl);
        } catch (saveErr) {
          console.warn('No se pudo guardar la imagen en el servidor:', saveErr);
        }
      }
    } catch (err) {
      console.error('Error al generar la imagen JPG:', err);
      alert('Hubo un error al generar la imagen: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsExporting(false);
    }
  }, [printRef, patient, onSaveImage]);

  return (
    <div className="w-full font-sans bg-[var(--color-surface)] flex flex-col items-center">
      {!readOnly && (
        <div className="w-full flex justify-end mb-4">
          <button 
            onClick={exportarPlan}
            disabled={isExporting || isSaving}
            className={`text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-all shadow-md ${
              isExporting || isSaving
                ? 'bg-gray-500 cursor-not-allowed' 
                : 'bg-orange-600 hover:bg-orange-500 hover:shadow-lg'
            }`}
          >
            <IconDownload size={18} className="mr-2" />
            {isExporting ? 'Generando JPG...' : isSaving ? 'Guardando...' : 'Generar y Descargar JPG'}
          </button>
        </div>
      )}

      <div className="w-full pb-4 rounded-xl border border-[var(--color-border)] overflow-x-auto custom-scrollbar flex justify-center">
        <div 
          ref={printRef} 
          className="shadow-2xl relative flex flex-col mx-auto w-full min-w-[700px] max-w-4xl"
          style={{ backgroundColor: '#000000' }}
        >
          {/* ENCABEZADO */}
          <div className="w-full flex items-center justify-center" style={{ backgroundColor: '#000000' }}>
            <img 
              src={URL_ENCABEZADO} 
              alt="Encabezado del Plan" 
              className="w-full h-auto block object-cover" 
            />
          </div>

          {/* RACIONES / PLATOS DE DISTRIBUCIÓN */}
          <div className="w-full p-4 sm:p-6 flex flex-col items-center" style={{ backgroundColor: '#000000' }}>
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-[0.2em] drop-shadow-md" style={{ color: '#ffffff' }}>
                Distribución Diaria
              </h2>
              <div className="w-24 h-1 mx-auto mt-2 rounded-full shadow-lg" style={{ backgroundColor: '#f97316' }}></div>

              {/* LEYENDA DEL PLATO (COMENTADA POR SOLICITUD)
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4 px-4 py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: '#111827', border: '1px solid #1f293d', color: '#d1d5db' }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></span>
                  <span><strong style={{ color: '#ffffff' }}>1/4:</strong> Proteínas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#eab308' }}></span>
                  <span><strong style={{ color: '#ffffff' }}>1/4:</strong> Carbohidratos / Grasas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }}></span>
                  <span><strong style={{ color: '#ffffff' }}>1/2:</strong> Verduras y Frutas</span>
                </div>
              </div>
              */}
            </div>
            
            {/* 5 COLUMNAS EN FILA */}
            <div className="grid grid-cols-5 gap-2 sm:gap-4 w-full max-w-4xl justify-items-center items-start">
              <Plato titulo="Desayuno" name="desayuno" valores={platos.desayuno} onChange={handleChangePlato} readOnly={readOnly} />
              <Plato titulo="Colación mañana" name="colacion_manana" valores={platos.colacion_manana} onChange={handleChangePlato} readOnly={readOnly} />
              <Plato titulo="Almuerzo" name="almuerzo" valores={platos.almuerzo} onChange={handleChangePlato} readOnly={readOnly} />
              <Plato titulo="Colación tarde" name="colacion_tarde" valores={platos.colacion_tarde} onChange={handleChangePlato} readOnly={readOnly} />
              <Plato titulo="Cena" name="cena" valores={platos.cena} onChange={handleChangePlato} readOnly={readOnly} />
            </div>
          </div>

          {/* PIE DE PÁGINA */}
          <div className="w-full flex items-center justify-center mt-auto" style={{ backgroundColor: '#000000' }}>
            <img 
              src={URL_FOOTER} 
              alt="Pie de página del Plan" 
              className="w-full h-auto block object-cover" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
