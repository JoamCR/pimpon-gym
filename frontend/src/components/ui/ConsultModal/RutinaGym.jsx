import { useState, useEffect, useRef } from 'react';
import { SimpleDateInput } from '../SimpleDateInput';

// Estructura inicial basada en los ejercicios de la plantilla
const rutinasIniciales = [
  {
    id: 'pectoral',
    titulo: 'PECTORAL',
    dias: { L: false, M1: false, M2: false, J: false, V: false, S: false },
    ejercicios: [
      { id: 1, nombre: 'Press Militar C/BM/Máquina', series: '', repeticiones: '', descanso: '' },
      { id: 2, nombre: 'Press inclinado con mancuernas', series: '', repeticiones: '', descanso: '' },
      { id: 3, nombre: 'Press plano con mancuernas', series: '', repeticiones: '', descanso: '' },
      { id: 4, nombre: 'Aperturas con mancuernas', series: '', repeticiones: '', descanso: '' },
      { id: 5, nombre: 'Fondos en paralelas', series: '', repeticiones: '', descanso: '' },
    ]
  },
  {
    id: 'espalda',
    titulo: 'ESPALDA',
    dias: { L: false, M1: false, M2: false, J: false, V: false, S: false },
    ejercicios: [
      { id: 1, nombre: 'Dominadas al fallo asistido', series: '', repeticiones: '', descanso: '' },
      { id: 2, nombre: 'Jalón al pecho agarre amplio', series: '', repeticiones: '', descanso: '' },
      { id: 3, nombre: 'Remo con barra', series: '', repeticiones: '', descanso: '' },
      { id: 4, nombre: 'Remo en máquina sentado', series: '', repeticiones: '', descanso: '' },
      { id: 5, nombre: 'Pullover con mancuerna', series: '', repeticiones: '', descanso: '' },
    ]
  },
  {
    id: 'biceps',
    titulo: 'BÍCEPS',
    dias: { L: false, M1: false, M2: false, J: false, V: false, S: false },
    ejercicios: [
      { id: 1, nombre: 'Curl con barra Z', series: '', repeticiones: '', descanso: '' },
      { id: 2, nombre: 'Curl alterno con mancuernas', series: '', repeticiones: '', descanso: '' },
      { id: 3, nombre: 'Curl martillo', series: '', repeticiones: '', descanso: '' },
      { id: 4, nombre: 'Curl concentrado', series: '', repeticiones: '', descanso: '' },
    ]
  },
  {
    id: 'piernas',
    titulo: 'PIERNAS',
    dias: { L: false, M1: false, M2: false, J: false, V: false, S: false },
    ejercicios: [
      { id: 1, nombre: 'Sentadilla con barra', series: '', repeticiones: '', descanso: '' },
      { id: 2, nombre: 'Prensa de piernas', series: '', repeticiones: '', descanso: '' },
      { id: 3, nombre: 'Peso muerto rumano', series: '', repeticiones: '', descanso: '' },
      { id: 4, nombre: 'Extensiones de cuádriceps', series: '', repeticiones: '', descanso: '' },
      { id: 5, nombre: 'Curl femoral acostado', series: '', repeticiones: '', descanso: '' },
      { id: 6, nombre: 'Elevación de pantorrillas', series: '', repeticiones: '', descanso: '' },
    ]
  },
  {
    id: 'triceps',
    titulo: 'TRÍCEPS',
    dias: { L: false, M1: false, M2: false, J: false, V: false, S: false },
    ejercicios: [
      { id: 1, nombre: 'Press francés con barra Z', series: '', repeticiones: '', descanso: '' },
      { id: 2, nombre: 'Extensión en polea alta', series: '', repeticiones: '', descanso: '' },
      { id: 3, nombre: 'Fondos en paralelas', series: '', repeticiones: '', descanso: '' },
      { id: 4, nombre: 'Patada de tríceps con mancuerna', series: '', repeticiones: '', descanso: '' },
    ]
  },
  {
    id: 'hombros',
    titulo: 'HOMBROS',
    dias: { L: false, M1: false, M2: false, J: false, V: false, S: false },
    ejercicios: [
      { id: 1, nombre: 'Press militar con barra', series: '', repeticiones: '', descanso: '' },
      { id: 2, nombre: 'Elevaciones laterales', series: '', repeticiones: '', descanso: '' },
      { id: 3, nombre: 'Elevaciones frontales', series: '', repeticiones: '', descanso: '' },
      { id: 4, nombre: 'Face pull en polea', series: '', repeticiones: '', descanso: '' },
      { id: 5, nombre: 'Encogimientos con mancuernas', series: '', repeticiones: '', descanso: '' },
    ]
  },
  {
    id: 'abdominales',
    titulo: 'ABDOMINALES',
    dias: { L: false, M1: false, M2: false, J: false, V: false, S: false },
    ejercicios: [
      { id: 1, nombre: 'Crunch abdominal', series: '', repeticiones: '', descanso: '' },
      { id: 2, nombre: 'Elevación de piernas colgado', series: '', repeticiones: '', descanso: '' },
      { id: 3, nombre: 'Plancha frontal', series: '', repeticiones: '', descanso: '' },
      { id: 4, nombre: 'Russian twist', series: '', repeticiones: '', descanso: '' },
    ]
  },
  {
    id: 'pantorrillas',
    titulo: 'PANTORRILLAS',
    dias: { L: false, M1: false, M2: false, J: false, V: false, S: false },
    ejercicios: [
      { id: 1, nombre: 'Elevación de pantorrillas de pie', series: '', repeticiones: '', descanso: '' },
      { id: 2, nombre: 'Elevación de pantorrillas sentado', series: '', repeticiones: '', descanso: '' },
    ]
  },
  {
    id: 'funcionales',
    titulo: 'FUNCIONALES / CORE',
    dias: { L: false, M1: false, M2: false, J: false, V: false, S: false },
    ejercicios: [
      { id: 1, nombre: 'Burpees', series: '', repeticiones: '', descanso: '' },
      { id: 2, nombre: 'Mountain climbers', series: '', repeticiones: '', descanso: '' },
      { id: 3, nombre: 'Plancha lateral', series: '', repeticiones: '', descanso: '' },
    ]
  },
  {
    id: 'accesorios',
    titulo: 'ACCESORIOS / OTROS',
    dias: { L: false, M1: false, M2: false, J: false, V: false, S: false },
    ejercicios: [
      { id: 1, nombre: 'Curl inverso con barra', series: '', repeticiones: '', descanso: '' },
      { id: 2, nombre: 'Extensión de espalda en banco', series: '', repeticiones: '', descanso: '' },
      { id: 3, nombre: 'Ab wheel (rueda abdominal)', series: '', repeticiones: '', descanso: '' },
    ]
  }
];

const getInitialDatosGenerales = (patientValue, planValue) => ({
  nombre: planValue?.datosGenerales?.nombre || (patientValue ? `${patientValue.first_name || ''} ${patientValue.last_name || ''}`.trim() : ''),
  fechaInicio: planValue?.datosGenerales?.fechaInicio || planValue?.fechaInicio || '',
  fechaCambio: planValue?.datosGenerales?.fechaCambio || planValue?.fechaCambio || '',
  objetivo: planValue?.datosGenerales?.objetivo || planValue?.objetivo || '',
});

export default function RutinaGym({ patient, plan, onChange, readOnly = false }) {
  const [datosGenerales, setDatosGenerales] = useState(() => getInitialDatosGenerales(patient, plan));

  const [rutinas, setRutinas] = useState(rutinasIniciales);
  const [cardio, setCardio] = useState({ tipo: '', duracion: '', intensidad: '', frecuencia: '' });
  const [anotaciones, setAnotaciones] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const lastPlanSignatureRef = useRef(null);
  const lastEmittedSignatureRef = useRef(null);

  const buildPlanPayload = (nextValues = { datosGenerales, rutinas, cardio, anotaciones, observaciones }) => ({
    datosGenerales: nextValues.datosGenerales,
    rutinas: nextValues.rutinas,
    cardio: nextValues.cardio,
    anotaciones: nextValues.anotaciones,
    observaciones: nextValues.observaciones,
  });

  const emitPlanChange = (nextValues) => {
    const payload = buildPlanPayload(nextValues);
    const signature = JSON.stringify(payload);

    if (lastEmittedSignatureRef.current === signature) return;

    lastEmittedSignatureRef.current = signature;
    if (onChange) {
      onChange(payload);
    }
  };

  useEffect(() => {
    if (!plan) return;

    const nextPayload = {
      datosGenerales: {
        nombre: plan.datosGenerales?.nombre ?? '',
        fechaInicio: plan.datosGenerales?.fechaInicio ?? '',
        fechaCambio: plan.datosGenerales?.fechaCambio ?? '',
        objetivo: plan.datosGenerales?.objetivo ?? '',
      },
      rutinas: Array.isArray(plan?.rutinas) ? plan.rutinas : rutinasIniciales,
      cardio: plan?.cardio || { tipo: '', duracion: '', intensidad: '', frecuencia: '' },
      anotaciones: plan?.anotaciones ?? '',
      observaciones: plan?.observaciones ?? '',
    };

    const signature = JSON.stringify(nextPayload);
    if (lastPlanSignatureRef.current === signature) return;

    lastPlanSignatureRef.current = signature;
    lastEmittedSignatureRef.current = signature;
    setDatosGenerales(nextPayload.datosGenerales);
    setRutinas(nextPayload.rutinas);
    setCardio(nextPayload.cardio);
    setAnotaciones(nextPayload.anotaciones);
    setObservaciones(nextPayload.observaciones);
  }, [plan]);

  const handleDatosGeneralesChange = (field, value) => {
    const nextDatosGenerales = { ...datosGenerales, [field]: value };
    setDatosGenerales(nextDatosGenerales);
    emitPlanChange({ datosGenerales: nextDatosGenerales, rutinas, cardio, anotaciones, observaciones });
  };

  // Manejador para cambiar valores en las tablas de ejercicios
  const handleEjercicioChange = (grupoIdx, ejIdx, campo, valor) => {
    const nuevasRutinas = rutinas.map((grupo, gIdx) =>
      gIdx === grupoIdx
        ? {
            ...grupo,
            ejercicios: grupo.ejercicios.map((ej, eIdx) =>
              eIdx === ejIdx ? { ...ej, [campo]: valor } : ej
            ),
          }
        : grupo
    );
    setRutinas(nuevasRutinas);
    emitPlanChange({ datosGenerales, rutinas: nuevasRutinas, cardio, anotaciones, observaciones });
  };

  // Manejador para los días de entrenamiento
  const handleDiaChange = (grupoIdx, diaKey) => {
    const nuevasRutinas = rutinas.map((grupo, gIdx) =>
      gIdx === grupoIdx
        ? { ...grupo, dias: { ...grupo.dias, [diaKey]: !grupo.dias[diaKey] } }
        : grupo
    );
    setRutinas(nuevasRutinas);
    emitPlanChange({ datosGenerales, rutinas: nuevasRutinas, cardio, anotaciones, observaciones });
  };

  const handleCardioChange = (field, value) => {
    const nextCardio = { ...cardio, [field]: value };
    setCardio(nextCardio);
    emitPlanChange({ datosGenerales, rutinas, cardio: nextCardio, anotaciones, observaciones });
  };

  const handleAnotacionesChange = (value) => {
    setAnotaciones(value);
    emitPlanChange({ datosGenerales, rutinas, cardio, anotaciones: value, observaciones });
  };

  const handleObservacionesChange = (value) => {
    setObservaciones(value);
    emitPlanChange({ datosGenerales, rutinas, cardio, anotaciones, observaciones: value });
  };

  const etiquetasDias = [
    { key: 'L', label: 'L' },
    { key: 'M1', label: 'M' },
    { key: 'M2', label: 'M' },
    { key: 'J', label: 'J' },
    { key: 'V', label: 'V' },
    { key: 'S', label: 'S' }
  ];

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 font-sans print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200 print:shadow-none print:border-none">
        
        {/* ENCABEZADO */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-zinc-900 text-white p-6 border-b-8 border-orange-600">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <div className="text-orange-500 font-black text-3xl tracking-tighter">||||</div>
            <div>
              <h1 className="text-2xl font-black tracking-wider uppercase">PIMPON</h1>
              <p className="text-xs text-orange-400 tracking-widest font-semibold">NUTRITION & GYM</p>
            </div>
            <div className="text-orange-500 font-black text-3xl tracking-tighter">||||</div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase text-gray-100">
              GUÍA DE RUTINA
            </h2>
          </div>
        </header>

        {/* DATOS GENERALES */}
        <section className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 bg-gray-50 border-b border-gray-200 text-sm font-bold text-gray-700">
          <div className="flex items-center space-x-2">
            <span>NOMBRE:</span>
            {readOnly ? (
              <p className="flex-1 px-2 py-1 font-normal">{datosGenerales.nombre}</p>
            ) : (
              <input
                type="text"
                value={datosGenerales.nombre}
                onChange={(e) => handleDatosGeneralesChange('nombre', e.target.value)}
                className="flex-1 border-b-2 border-gray-400 bg-transparent px-2 py-1 focus:outline-none focus:border-orange-600 font-normal"
                placeholder="Nombre del cliente"
                readOnly={readOnly}
              />
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span>OBJETIVO:</span>
            {readOnly ? (
              <p className="flex-1 px-2 py-1 font-normal">{datosGenerales.objetivo}</p>
            ) : (
              <input
                type="text"
                value={datosGenerales.objetivo}
                onChange={(e) => handleDatosGeneralesChange('objetivo', e.target.value)}
                className="flex-1 border-b-2 border-gray-400 bg-transparent px-2 py-1 focus:outline-none focus:border-orange-600 font-normal"
                placeholder="Hipertrofia, Pérdida de grasa, etc."
                readOnly={readOnly}
              />
            )}
          </div>
          <SimpleDateInput
            label="Fecha de Inicio"
            value={datosGenerales.fechaInicio}
            onChange={(date) => handleDatosGeneralesChange('fechaInicio', date)}
            readOnly={readOnly}
          />
          <SimpleDateInput
            label="Fecha de Cambio de Rutina"
            value={datosGenerales.fechaCambio}
            onChange={(date) => handleDatosGeneralesChange('fechaCambio', date)}
            readOnly={readOnly}
          />
        </section>

        {/* GRID DE RUTINAS */}
        <main className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {rutinas.map((grupo, gIdx) => (
            <div key={grupo.id} className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
              
              {/* Título de Grupo Muscular y Días */}
              <div className="bg-gray-100 px-4 py-2 flex justify-between items-center border-b border-gray-300">
                <div className="flex items-center space-x-2 font-black text-gray-800 text-base">
                  <span className="w-3 h-3 bg-orange-600 rounded-full inline-block"></span>
                  <span>{grupo.titulo}</span>
                </div>
                <div className="flex items-center space-x-1 text-xs font-bold text-gray-600">
                  <span className="mr-1">DÍA:</span>
                  {etiquetasDias.map((d) => (
                    <label key={d.key} className={`flex items-center space-x-0.5 ${readOnly ? '' : 'cursor-pointer'}`}>
                      <span className={grupo.dias[d.key] ? 'text-orange-600' : ''}>{d.label}</span>
                      {!readOnly && (
                        <input
                          type="checkbox"
                          checked={grupo.dias[d.key]}
                          onChange={() => handleDiaChange(gIdx, d.key)}
                          className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                          disabled={readOnly}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Tabla de Ejercicios */}
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-orange-600 text-white font-bold text-center">
                    <th className="py-1.5 px-2 text-left w-5/12">EJERCICIO</th>
                    <th className="py-1.5 px-1 w-2/12">SERIES</th>
                    <th className="py-1.5 px-1 w-2/12">REPETICIONES</th>
                    <th className="py-1.5 px-1 w-3/12">DESCANSO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {grupo.ejercicios.map((ej, eIdx) => (
                    <tr key={ej.id} className="hover:bg-orange-50/50">
                      <td className="py-1 px-2 font-medium text-gray-700 flex items-center">
                        <span className="font-bold mr-1.5 text-orange-600">{ej.id}</span>
                        {readOnly ? (
                          <p className="w-full bg-transparent px-1 py-0.5">{ej.nombre}</p>
                        ) : (
                          <input
                            type="text"
                            value={ej.nombre}
                            onChange={(e) => handleEjercicioChange(gIdx, eIdx, 'nombre', e.target.value)}
                            className="w-full bg-transparent focus:outline-none focus:bg-white px-1 py-0.5 rounded"
                          />
                        )}
                      </td>
                      <td className="p-1">
                        {readOnly ? (
                          <p className="w-full text-center px-1 py-0.5">{ej.series || '-'}</p>
                        ) : (
                          <input
                            type="text"
                            value={ej.series}
                            onChange={(e) => handleEjercicioChange(gIdx, eIdx, 'series', e.target.value)}
                            className="w-full text-center border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-orange-500"
                            placeholder="-"
                          />
                        )}
                      </td>
                      <td className="p-1">
                        {readOnly ? (
                          <p className="w-full text-center px-1 py-0.5">{ej.repeticiones || '-'}</p>
                        ) : (
                          <input
                            type="text"
                            value={ej.repeticiones}
                            onChange={(e) => handleEjercicioChange(gIdx, eIdx, 'repeticiones', e.target.value)}
                            className="w-full text-center border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-orange-500"
                            placeholder="-"
                          />
                        )}
                      </td>
                      <td className="p-1">
                        {readOnly ? (
                          <p className="w-full text-center px-1 py-0.5">{ej.descanso || '-'}</p>
                        ) : (
                          <input
                            type="text"
                            value={ej.descanso}
                            onChange={(e) => handleEjercicioChange(gIdx, eIdx, 'descanso', e.target.value)}
                            className="w-full text-center border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-orange-500"
                            placeholder="-"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

            </div>
          ))}
        </main>

        {/* SECCIÓN INFERIOR: CARDIO, ANOTACIONES Y OBSERVACIONES */}
        <section className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 border-t border-gray-200 text-xs">
          
          {/* Cardio */}
          <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm flex flex-col justify-between">
            <div className="flex items-center space-x-2 font-black text-gray-800 text-sm mb-3">
              <span className="text-orange-600">♥</span>
              <span>CARDIO</span>
            </div>
            {['tipo', 'duracion', 'intensidad', 'frecuencia'].map((campo) => (
              <div key={campo} className="flex items-center mb-2 last:mb-0">
                <span className="font-bold uppercase text-gray-600 w-24">{campo}:</span>
                {readOnly ? (
                  <p className="flex-1 px-1 py-0.5 text-gray-700">{cardio[campo] || '-'}</p>
                ) : (
                  <input
                    type="text"
                    value={cardio[campo]}
                    onChange={(e) => handleCardioChange(campo, e.target.value)}
                    className="flex-1 border-b border-gray-300 focus:outline-none focus:border-orange-600 px-1 py-0.5 text-gray-700"
                    readOnly={readOnly}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Anotaciones */}
          <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm flex flex-col">
            <h3 className="font-black text-gray-800 text-sm mb-2 uppercase">Anotaciones y Sistema</h3>
            {readOnly ? (
              <p className="w-full flex-1 p-2 text-gray-700">{anotaciones || 'N/A'}</p>
            ) : (
              <textarea
                value={anotaciones}
                onChange={(e) => handleAnotacionesChange(e.target.value)}
                rows="4"
                className="w-full flex-1 border border-gray-200 rounded p-2 focus:outline-none focus:border-orange-600 resize-none text-gray-700"
                placeholder="Especificaciones técnicas, cadencia, RIR, RPE..."
                readOnly={readOnly}
              ></textarea>
            )}
          </div>

          {/* Observaciones Médicas */}
          <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm flex flex-col">
            <h3 className="font-black text-gray-800 text-sm mb-2 uppercase">Observaciones Médicas</h3>
            {readOnly ? (
              <p className="w-full flex-1 p-2 text-gray-700">{observaciones || 'N/A'}</p>
            ) : (
              <textarea
                value={observaciones}
                onChange={(e) => handleObservacionesChange(e.target.value)}
                rows="4"
                className="w-full flex-1 border border-gray-200 rounded p-2 focus:outline-none focus:border-orange-600 resize-none text-gray-700"
                placeholder="Lesiones previas, molestias, restricciones..."
                readOnly={readOnly}
              ></textarea>
            )}
          </div>

        </section>

        {/* PIE DE PÁGINA */}
        <footer className="bg-zinc-900 text-white px-6 py-4 flex flex-col md:flex-row justify-between items-center text-xs border-t-4 border-orange-600">
          {/*  <div className="space-y-1 mb-2 md:mb-0 text-gray-300">
            <div>📸 <span className="font-semibold">Pimpon Nutrition & Gym</span></div>
            <div>👍 <span className="font-semibold">Pimpon Nutrition & Gym</span></div>
          </div> */}
          
          <div className="text-center mb-2 md:mb-0">
            <span className="font-black italic text-lg tracking-wider text-orange-500">
              POR UNA VIDA MEJOR
            </span>
          </div>

          <div className="flex flex-col md:items-end text-gray-300 space-y-1">
            <div className="font-bold text-white">📞 981 108 1793</div>
            <div>📍 Campeche, México</div>
          </div>
        </footer>

      </div>
    </div>
  );
}
