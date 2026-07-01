
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-sans/700.css'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './utils/serviceWorkerRegistration'
import { resetApiBaseFromEnv } from './config/api';

resetApiBaseFromEnv();

window.addEventListener('load', () => {
  if (import.meta.env.PROD) {
    registerServiceWorker();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
