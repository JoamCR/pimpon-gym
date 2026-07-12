import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IconUser, IconLock, IconBolt, IconEye, IconEyeOff, IconAlertTriangle, IconSun, IconMoon, IconShieldLock, IconUserPlus, IconCheck } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { GymButton } from '../components/ui/GymButton';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';

const GymInput = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon,
  action,
  required = false,
  readOnly = false,
  children, // Para el botón de "¿La olvidaste?"
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          {label}
        </label>
        {children}
      </div>
      <div className="flex items-center bg-[var(--color-card-alt)] border-2 border-transparent rounded-2xl focus-within:border-[var(--color-teal)] focus-within:ring-4 focus-within:ring-[var(--color-teal)]/10 transition-all overflow-hidden">
        {icon && <div className="pl-4 text-[var(--color-text-muted)]">{icon}</div>}
        <input
          type={type}
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          readOnly={readOnly}
          className="w-full py-4 pl-3 pr-2 text-sm font-semibold bg-transparent border-none outline-none focus:ring-0 text-[var(--color-text)] placeholder-[var(--color-text-muted)]"
        />
        {action}
      </div>
    </div>
  );
};

// Hook de login real con TanStack Query
const useLoginMutation = () => {
  const navigate = useNavigate();
  const loginAction = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: async ({ username, password }) => {
      // Asumimos que tienes un cliente de API configurado.
      // La ruta '/auth/login' es un estándar, ajústala si es necesario.
      const { data } = await api.post('/auth/login', { username, password });
      return data;
    },
    onSuccess: (data) => {
      // Guardar token y usuario en el store de Zustand
      loginAction(data.token, data.user);
      // Redirigir al dashboard
      navigate('/dashboard', { replace: true });
    },
    // onError es manejado automáticamente por useMutation,
    // podemos acceder al error en el componente.
  });
};

// Hook para verificar si el admin ya fue configurado
const useCheckSetup = () => {
  return useQuery({
    queryKey: ['setupStatus'],
    queryFn: async () => {
      const { data } = await api.get('/auth/setup-status');
      return data;
    },
  });
};

// Hook para crear el primer administrador
const useSetupMutation = () => {
  return useMutation({
    mutationFn: async ({ password }) => {
      // La ruta '/auth/setup' es un estándar, ajústala si es necesario.
      const { data } = await api.post('/auth/setup', { password });
      return data;
    },
    // onSuccess y onError se manejarán en el componente
    // para mostrar feedback y cambiar la vista.
  });
};

export function Login() {
  const [view, setView] = useState('login'); // 'login' o 'setup'
  const [isLightMode, setIsLightMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme === 'light';
      return window.matchMedia?.('(prefers-color-scheme: light)').matches;
    }
    return false;
  });

  const { data: setupStatus, isLoading: isCheckingSetup } = useCheckSetup();
  const { mutate: performLogin, isPending: isLoginLoading, error: loginError } = useLoginMutation();
  const { mutate: performSetup, isPending: isSetupLoading, error: setupError } = useSetupMutation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState(false);

  
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('light', isLightMode);
    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
  }, [isLightMode]);


  const handleLoginSubmit = (e) => {
    e.preventDefault();
    performLogin({ username, password });
  };

  const handleSetupSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Las contraseñas no coinciden."); // Reemplazar con un toast o mejor feedback
      return;
    }
    performSetup({ password }, {
      onSuccess: () => {
        setSetupSuccess(true);
        const timer = setTimeout(() => {
          setView('login');
          setSetupSuccess(false);
          setPassword('');
          setConfirmPassword('');
        }, 3000);
      }
    });
  };

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[var(--color-surface)] text-[var(--color-text)] font-sans">
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {view === 'login' ? (
            <h1 className="text-xl font-bold text-center text-[var(--color-text-muted)] mb-4">Acceso del Staff</h1>
          ) : (
            <h1 className="text-xl font-bold text-center text-[var(--color-text-muted)] mb-4">Crear Cuenta de Administrador</h1>
          )}
          <div className="bg-[var(--color-card)] rounded-[var(--radius-2xl)] shadow-2xl border border-[var(--color-border)] overflow-hidden">
          
          {/* Encabezado */}
          <div className="bg-gradient-to-br from-[var(--color-gold)] to-amber-600 p-8 text-white relative rounded-t-[var(--radius-2xl)]">
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => setIsLightMode(!isLightMode)} 
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-white/50 active:scale-95" 
                title="Cambiar tema"
              >
                {isLightMode ? <IconMoon size={20} /> : <IconSun size={20} />}
              </button>
            </div>
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
                <IconBolt size={32} strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-black tracking-tight font-display">
                Pimpon <span className="text-white/70">Gym</span>
              </span>
            </div>
            <p className="text-white/80 mt-1 text-xs text-center font-medium max-w-xs mx-auto">
              Gestión de clientes, membresías e indicadores del gimnasio.
            </p>
          </div>

          {/* Formulario */}
          {view === 'login' && (
            <div className="p-8">
              <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="space-y-4">
                <GymInput
                  label="Usuario"
                  id="username"
                  type="text"
                  placeholder="administrador"
                  value={username}
                  onChange={handleInputChange(setUsername)}
                  icon={<IconUser size={20} />}
                  required
                />
                <GymInput
                  label="Contraseña"
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={handleInputChange(setPassword)}
                  icon={<IconLock size={20} />}
                  required
                  action={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="pr-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus:outline-none"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                    </button>
                  }
                >
                  <button type="button" className="text-xs font-bold text-[var(--color-gold)] hover:underline">
                    ¿La olvidaste?
                  </button>
                </GymInput>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[var(--color-teal)] focus:ring-[var(--color-teal)] border-[var(--color-border)] rounded bg-transparent"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs font-bold text-[var(--color-text-muted)]">
                  Mantener mi sesión iniciada
                </label>
              </div>

              <GymButton
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={isLoginLoading}
              >
                Ingresar al Sistema
              </GymButton>
            </form>

            {/* Alerta de Error */}
            <AnimatePresence>
                {loginError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3"
                >
                  <IconAlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-red-400">Error de autenticación</h3>
                      <p className="text-xs text-red-500 mt-0.5">{loginError?.response?.data?.message || 'El correo o la contraseña son incorrectos.'}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          )}

          {view === 'setup' && (
            <div className="p-8">
              <AnimatePresence mode="wait">
                {setupSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <IconCheck size={48} className="mx-auto text-green-500" />
                    <h3 className="mt-4 text-lg font-bold text-[var(--color-text)]">¡Administrador Creado!</h3>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">Ahora puedes iniciar sesión con tus nuevas credenciales.</p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleSetupSubmit}
                    className="space-y-5"
                  >
                    <GymInput
                      label="Nombre de Usuario del Administrador"
                      id="setup-username"
                      type="text"
                      value="administrador"
                      icon={<IconUserPlus size={20} />}
                      readOnly
                    />
                    <GymInput
                      label="Crear Contraseña"
                      id="setup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={handleInputChange(setPassword)}
                      icon={<IconLock size={20} />}
                      required
                      action={
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="pr-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus:outline-none">
                          {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                        </button>
                      }
                    />
                    <GymInput
                      label="Confirmar Contraseña"
                      id="setup-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={handleInputChange(setConfirmPassword)}
                      icon={<IconLock size={20} />}
                      required
                      action={
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="pr-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus:outline-none">
                          {showConfirmPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                        </button>
                      }
                    />
                    <GymButton type="submit" variant="primary" size="lg" className="w-full" loading={isSetupLoading}>
                      Crear Cuenta
                    </GymButton>
                    {setupError && (
                      <div className="text-center text-red-500 text-xs">{setupError?.response?.data?.message || 'Error al crear la cuenta.'}</div>
                    )}
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Mensaje para crear primer administrador */}
          {!isCheckingSetup && !setupStatus?.isAdminSetup && view === 'login' && (
            <div className="p-6 text-center border-t border-[var(--color-border)]">
              <div className="flex items-center justify-center gap-2 mb-2">
                <IconShieldLock className="text-[var(--color-gold)]" size={20} />
                <h3 className="font-bold text-[var(--color-text)]">Primer Inicio del Sistema</h3>
              </div>
              <p className="text-xs font-semibold text-[var(--color-text-muted)]">
                Parece que es la primera vez que se inicia el sistema.
                  <button onClick={() => setView('setup')} className="text-[var(--color-gold)] font-extrabold hover:underline ml-1 bg-transparent border-none">
                  Crea la cuenta de Administrador aquí.
                  </button>
              </p>
            </div>
          )}

          {view === 'setup' && !setupSuccess && (
            <div className="p-6 text-center border-t border-[var(--color-border)]">
              <p className="text-xs font-semibold text-[var(--color-text-muted)]">
                ¿Ya tienes una cuenta?
                <button onClick={() => setView('login')} className="text-[var(--color-gold)] font-extrabold hover:underline ml-1 bg-transparent border-none">
                  Inicia sesión
                </button>
              </p>
            </div>
          )}

          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-[var(--color-text-muted)] font-medium space-y-1">
        <div>Pimpon Gym &bull; Acceso Restringido a Colaboradores</div>
        <div className="text-[10px] text-[var(--color-text-muted)]/50 font-mono">
          ID de sucursal: PMPN-MEX-001
        </div>
      </footer>
    </div>
  );
}