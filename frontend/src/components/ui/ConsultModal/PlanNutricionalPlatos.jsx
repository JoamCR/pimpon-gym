import React, { useRef, useState, useCallback, useEffect } from 'react';
import { IconDownload } from '@tabler/icons-react';

const PlatoEditable = ({ titulo, name, valores, onChange }) => {
  const handleChange = (e) => {
    onChange(name, e.target.name, e.target.value);
  };

  return (
    <div className="flex flex-col items-center bg-gray-900 p-5 rounded-2xl shadow-lg border border-gray-800 w-full sm:w-auto">
      <h3 className="font-black text-xl mb-4 text-white uppercase tracking-wide">{titulo}</h3>
      
      <div className="relative w-48 h-48 sm:w-56 sm:h-56">
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl overflow-visible">
          <circle cx="100" cy="100" r="98" fill="#1f2937" stroke="#374151" strokeWidth="4" />
          <path d="M 100,100 v -90 a 90,90 0 0,0 0,180 z" fill="#22c55e" stroke="#1f2937" strokeWidth="3" />
          <path d="M 100,100 v -90 a 90,90 0 0,1 90,90 z" fill="#ef4444" stroke="#1f2937" strokeWidth="3" />
          <path d="M 100,100 h 90 a 90,90 0 0,1 -90,90 z" fill="#eab308" stroke="#1f2937" strokeWidth="3" />
        </svg>

        <div className="absolute top-1/2 left-[25%] transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <span className="text-[10px] font-bold text-green-100 mb-1 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">VERDURAS</span>
          <input
            type="text"
            name="mitad"
            value={valores?.mitad || ''}
            onChange={handleChange}
            placeholder="Raciones"
            className="w-16 text-center bg-gray-950/80 border border-green-500/50 rounded-md text-sm font-bold text-white focus:ring-2 focus:ring-green-500 outline-none shadow-sm py-1 placeholder-gray-500"
          />
        </div>

        <div className="absolute top-[25%] right-[25%] transform translate-x-[25%] -translate-y-[25%] flex flex-col items-center">
          <span className="text-[10px] font-bold text-red-100 mb-1 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">PROTEÍNA</span>
          <input
            type="text"
            name="cuarto1"
            value={valores?.cuarto1 || ''}
            onChange={handleChange}
            placeholder="Raciones"
            className="w-16 text-center bg-gray-950/80 border border-red-500/50 rounded-md text-sm font-bold text-white focus:ring-2 focus:ring-red-500 outline-none shadow-sm py-1 placeholder-gray-500"
          />
        </div>

        <div className="absolute bottom-[25%] right-[25%] transform translate-x-[25%] translate-y-[25%] flex flex-col items-center">
          <span className="text-[10px] font-bold text-yellow-100 mb-1 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">CARBOS</span>
          <input
            type="text"
            name="cuarto2"
            value={valores?.cuarto2 || ''}
            onChange={handleChange}
            placeholder="Raciones"
            className="w-16 text-center bg-gray-950/80 border border-yellow-500/50 rounded-md text-sm font-bold text-white focus:ring-2 focus:ring-yellow-500 outline-none shadow-sm py-1 placeholder-gray-500"
          />
        </div>
      </div>
      
      <div className="mt-8 flex items-center justify-center bg-black px-4 py-2 rounded-full border border-gray-800 shadow-inner w-full">
        <span className="font-bold text-gray-400 mr-2 text-xs uppercase tracking-wider">KCAL:</span>
        <input
          type="number"
          name="calorias"
          value={valores?.calorias || ''}
          onChange={handleChange}
          placeholder="0"
          className="w-20 text-lg font-black text-orange-500 border-b border-transparent focus:border-orange-500 outline-none text-center bg-transparent placeholder-gray-700"
        />
      </div>
    </div>
  );
};

export function PlanNutricionalPlatos({ patient, values, setValues, onSaveImage, isSaving }) {
  const printRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  // Se usarán imágenes desde la carpeta public/ del frontend
  // El usuario debe colocar sus imágenes ahí con estos nombres:
  const URL_ENCABEZADO = "/headerNutritionPlan.png";
  const URL_FOOTER = "/footerNutritionPlan.png";

  // Parse diet_plan string into JSON if it exists
  const [platos, setPlatos] = useState({
    desayuno: { mitad: '', cuarto1: '', cuarto2: '', calorias: '' },
    almuerzo: { mitad: '', cuarto1: '', cuarto2: '', calorias: '' },
    colacion: { mitad: '', cuarto1: '', cuarto2: '', calorias: '' },
    cena: { mitad: '', cuarto1: '', cuarto2: '', calorias: '' }
  });

  useEffect(() => {
    if (values.diet_plan) {
      try {
        const parsed = JSON.parse(values.diet_plan);
        if (parsed.desayuno) {
          setPlatos(parsed);
        }
      } catch (e) {
        // If it's old text format, just ignore or keep default
      }
    }
  }, []);

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

      <div className="overflow-x-auto w-full pb-6 custom-scrollbar rounded-xl border border-[var(--color-border)]">
        <div 
          ref={printRef} 
          className="bg-black shadow-2xl relative flex flex-col mx-auto"
          style={{ width: '1300px', minHeight: '800px' }}
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
          <div className="w-full p-10 bg-black flex flex-col items-center">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-white uppercase tracking-[0.2em]">Distribución Diaria</h2>
              <div className="w-24 h-1 bg-orange-500 mx-auto mt-4 rounded-full"></div>
            </div>
            
            <div className="flex w-full justify-between items-center gap-4">
              <PlatoEditable titulo="Desayuno" name="desayuno" valores={platos.desayuno} onChange={handleChangePlato} />
              <PlatoEditable titulo="Almuerzo" name="almuerzo" valores={platos.almuerzo} onChange={handleChangePlato} />
              <PlatoEditable titulo="Colación" name="colacion" valores={platos.colacion} onChange={handleChangePlato} />
              <PlatoEditable titulo="Cena" name="cena" valores={platos.cena} onChange={handleChangePlato} />
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
