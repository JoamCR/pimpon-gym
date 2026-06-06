import { useRef, useState, useCallback, useEffect } from 'react';
import { IconDownload } from '@tabler/icons-react';

const PlatoEditable = ({ titulo, name, valores, onChange }) => {
  const handleChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '').slice(0, 3);
    onChange(name, e.target.name, rawValue);
  };

  return (
    <div className="flex flex-col items-center bg-transparent p-4 w-full sm:w-auto">
      <h3 className="font-black text-xl mb-4 text-white uppercase tracking-wide">{titulo}</h3>

      <div className="relative w-20 h-20 sm:w-56 sm:h-20">
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl overflow-visible" style={{ transform: 'scaleX(-1)' }}>
          <circle cx="100" cy="100" r="98" fill="#1f2937" stroke="#374151" strokeWidth="4" />
          <path d="M 100,100 v -90 a 90,90 0 0,0 0,180 z" fill="#22c55e" stroke="#374151" strokeWidth="3" />
          <path d="M 100,100 v -90 a 90,90 0 0,1 90,90 z" fill="#ef4444" stroke="#374151" strokeWidth="3" />
          <path d="M 100,100 h 90 a 90,90 0 0,1 -90,90 z" fill="#eab308" stroke="#374151" strokeWidth="3" />
        </svg>

        <div className="absolute inset-0">
          <input
            name="cuarto1"
            value={valores?.cuarto1 || ''}
            onChange={handleChange}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
            placeholder="000"
            className="absolute left-2 top-2 w-12 sm:w-16 rounded border border-white/30 bg-black/75 text-center text-xs sm:text-sm text-white placeholder-white/50 focus:border-orange-400 focus:outline-none pointer-events-auto"
          />
          <input
            name="cuarto2"
            value={valores?.cuarto2 || ''}
            onChange={handleChange}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
            placeholder="000"
            className="absolute left-2 bottom-2 w-12 sm:w-16 rounded border border-white/30 bg-black/75 text-center text-xs sm:text-sm text-white placeholder-white/50 focus:border-orange-400 focus:outline-none pointer-events-auto"
          />
          <input
            name="mitad"
            value={valores?.mitad || ''}
            onChange={handleChange}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
            placeholder="000"
            className="absolute right-2 top-1/2 w-20 sm:w-24 -translate-y-1/2 rounded border border-white/30 bg-black/75 text-center text-xs sm:text-sm text-white placeholder-white/50 focus:border-orange-400 focus:outline-none pointer-events-auto"
          />
        </div>
      </div>
    </div>
  );
};

export function PlanNutricionalPlatos({ patient, values, setValues, onSaveImage, isSaving }) {
  const printRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  // Se usarán imágenes desde la carpeta public/ del frontend
  // El usuario debe colocar sus imágenes ahí con estos nombres:
  const URL_ENCABEZADO = "/headerNutritionPlan.png";
  const URL_FOOTER = "/footerNutritionPlan.png";

  // Parse diet_plan string into JSON if it exists
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
        // If it's old text format, just ignore or keep default
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
        backgroundColor: '#000000', 
      });
      
      const dataUrl = canvas.toDataURL('image/png');

      // Descarga local
      const patientName = patient ? `${patient.first_name}_${patient.last_name}`.replace(/\s+/g, '') : 'Paciente';
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${patientName}_${dateStr}_PlanNutricional.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
      
      // Llamar al callback para guardar en BD si existe
      if (onSaveImage) {
        await onSaveImage(dataUrl);
      }
    } catch (err) {
      console.error('Error al generar la imagen:', err);
      alert('Hubo un error al generar la imagen. Inténtalo de nuevo.');
    } finally {
      setIsExporting(false);
    }
  }, [printRef, patient, onSaveImage]);

  return (
    <div className="w-full font-sans bg-[var(--color-surface)] flex flex-col">
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
          {isExporting ? 'Generando PNG...' : isSaving ? 'Guardando...' : 'Generar y Descargar PNG'}
        </button>
      </div>

      <div className="w-full pb-6 rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div 
          ref={printRef} 
          className="bg-black shadow-2xl relative flex flex-col mx-auto w-full"
        >
          {/* ENCABEZADO */}
          <div className="w-full bg-black flex items-center justify-center">
            <img 
              src={URL_ENCABEZADO} 
              alt="Encabezado del Plan" 
              className="w-full h-auto block object-cover" 
              crossOrigin="anonymous" 
            />
          </div>

          {/* RACIONES */}
          <div className="w-full p-4 sm:p-10 bg-black flex flex-col items-center">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-[0.2em]">Distribución Diaria</h2>
              <div className="w-24 h-1 bg-orange-500 mx-auto mt-4 rounded-full"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full gap-4 sm:gap-6 justify-items-center">
              <PlatoEditable titulo={<span className="text-sm font-bold text-white uppercase tracking-wider">Desayuno</span>} name="desayuno" valores={platos.desayuno} onChange={handleChangePlato} />
              <PlatoEditable titulo={<span className="text-sm font-bold text-white uppercase tracking-wider">Colación mañana</span>} name="colacion_manana" valores={platos.colacion_manana} onChange={handleChangePlato} />
              <PlatoEditable titulo={<span className="text-sm font-bold text-white uppercase tracking-wider">Almuerzo</span>} name="almuerzo" valores={platos.almuerzo} onChange={handleChangePlato} />
              <PlatoEditable titulo={<span className="text-sm font-bold text-white uppercase tracking-wider">Colación tarde</span>} name="colacion_tarde" valores={platos.colacion_tarde} onChange={handleChangePlato} />
              <PlatoEditable titulo={<span className="text-sm font-bold text-white uppercase tracking-wider">Cena</span>} name="cena" valores={platos.cena} onChange={handleChangePlato} />
            </div>
          </div>

          {/* PIE DE PÁGINA */}
          <div className="w-full bg-black flex items-center justify-center mt-auto">
            <img 
              src={URL_FOOTER} 
              alt="Pie de página del Plan" 
              className="w-full h-auto block object-cover" 
              crossOrigin="anonymous" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
