# SIRP-NNA — Instalación Frontend

PWA Offline-First para registro de NNA en emergencias.

## Requisitos

- Node.js 20+
- npm 10+

## Instalación

```bash
cd started-kit
npm install
cp .env.example .env
npm run dev
```

Frontend disponible en: `http://localhost:5173`

## Variables de entorno

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_NAME=SIRP-NNA
```

Asegúrate de que el backend Laravel esté corriendo en el puerto 8000.

## Build producción

```bash
npm run build
npm run preview
```

## Pruebas

```bash
npm run test
npm run lint
```

## Documentación relacionada

- Backend: `../idenna/docs/INSTALACION.md`
- Arquitectura Fase 1: `../idenna/docs/FASE-01-ARQUITECTURA.md`
- Offline-first: [docs/OFFLINE_FIRST_IMPLEMENTATION.md](docs/OFFLINE_FIRST_IMPLEMENTATION.md)
