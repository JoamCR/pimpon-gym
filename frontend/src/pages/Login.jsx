import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import GymCard from '../components/ui/GymCard';
import GymButton from '../components/ui/GymButton';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login({ email, password });
      
      // Redirige al panel correcto según el rol del usuario
      if (user.role === 'nutritionist') {
        navigate('/nutrition');
      } else if (user.role === 'receptionist') {
        navigate('/clients');
      } else {
        navigate('/dashboard'); // Para owner y admin
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-navy)] p-4">
      {/* Logo de Pimpon centrado */}
      <div className="mb-8 text-center flex flex-col items-center">
        <div className="w-20 h-20 bg-[var(--color-gold)] rounded-full flex items-center justify-center mb-4 shadow-lg">
          <span className="text-4xl" role="img" aria-label="Logo">🏓</span>
        </div>
        <h1 className="text-4xl font-bold text-[var(--color-surface)]" style={{ fontFamily: 'var(--font-display)' }}>
          PIMPON GYM
        </h1>
        <p className="text-[var(--color-gold)] mt-2 text-sm uppercase tracking-widest font-body">
          Acceso al Sistema
        </p>
      </div>

      <div className="w-full max-w-md">
        <GymCard title="Iniciar Sesión" variant="default" delay={0.1}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            {error && (
              <div className="bg-[var(--color-red)] bg-opacity-10 text-[var(--color-red)] p-3 rounded-md text-sm border border-[var(--color-red)] border-opacity-20">
                {error}
              </div>
            )}
            
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Correo Electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ejemplo@pimpongym.com"
                className="px-4 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] font-body"
              />
            </div>

            <div className="flex flex-col gap-1 mb-2">
              <label className="text-sm font-medium text-gray-700">Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                className="px-4 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] font-body"
              />
            </div>

            <GymButton variant="primary" size="lg" loading={loading} icon="🔐" style={{ width: '100%' }}>
              Ingresar
            </GymButton>
          </form>
        </GymCard>
      </div>
    </div>
  );
}