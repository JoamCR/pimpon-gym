import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './styles/tokens.css';
import App from './App.jsx';

// Recuperación automática cuando se sube un nuevo despliegue a Vercel y cambian los nombres de los chunks
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const lastReload = Number(sessionStorage.getItem('pimpon_chunk_reload_ts') || 0);
  if (Date.now() - lastReload > 15000) {
    sessionStorage.setItem('pimpon_chunk_reload_ts', String(Date.now()));
    window.location.reload();
  }
});

// Configurar QueryClient para TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
