# Guía de implementación Offline First

> **Instrucción para Cursor / Agentes de IA**  
> Si el usuario pide agregar soporte offline a un módulo (CRUD, listado, formulario), **lee este archivo completo** y sigue los pasos en orden.  
> **No modifiques** el motor en `src/offline/queue/`, `src/offline/database/indexeddb.ts` ni `queueManager.ts` salvo bugfix explícito.  
> **Referencia canónica:** módulo Usuarios en `src/features/users/` + `src/pages/UserCRUD.tsx`.

---

## Resumen ejecutivo

El proyecto usa una arquitectura **Offline First reutilizable**:

```
Pantalla (CRUD)
    ↓
Hook del módulo (useXxxOffline)
    ↓
useOfflineCollection (genérico)
    ↓
createOfflineRecord → IndexedDB + Cola de sync
    ↓
Entity Adapter (push simula/API) ← único lugar con lógica de dominio de red
```

Cada módulo nuevo solo necesita **4 archivos propios** + **1 registro** en `OfflineProvider` + **actualizar la pantalla**.

---

## Lo que YA existe (no recrear)

| Recurso | Ruta |
|---------|------|
| Motor de cola y sync | `src/offline/queue/queueManager.ts` |
| IndexedDB (idb) | `src/offline/database/` |
| Hook genérico de colección | `src/offline/hooks/useOfflineCollection.ts` |
| Provider global | `src/offline/providers/OfflineProvider.tsx` |
| Barra de estado (online/sync) | `src/offline/components/OfflineStatusBar.tsx` (ya en `MainLayout`) |
| Badge por fila | `src/offline/components/SyncStatusBadge.tsx` |
| Hook conexión global | `src/offline/hooks/useOffline.ts` |
| Instalar PWA | `src/offline/hooks/useInstallPrompt.ts` |

La barra superior y el botón **Instalar aplicación** ya están montados. **No duplicar** en cada pantalla.

---

## Reglas obligatorias

1. **Nunca** poner lógica de Usuarios/Niños/etc. dentro de `src/offline/`.
2. **Siempre** crear un `EntitySyncAdapter` en `src/features/{modulo}/adapters/`.
3. **Siempre** registrar el adapter en `OfflineProvider` → array `REGISTERED_ADAPTERS`.
4. Los registros offline deben extender el tipo base con metadatos de sync:

```typescript
type OfflineRecordBase = {
  id: number | string;
  _localId?: string;
  _syncStatus?: 'pending' | 'syncing' | 'synced' | 'failed';
  _syncError?: string;
};
```

5. En tablas usar `rowKey={({ item }) => String(item._localId ?? item.id)}`.
6. En `useDataTable` pasar `getItemId: (item) => String(item._localId ?? item.id)`.
7. Mostrar `<SyncStatusBadge status={item._syncStatus} />` en la columna principal.
8. El adapter implementa `push()` — ahí va la llamada API (o simulación) cuando exista backend.
9. Por ahora solo **CREATE** está cableado en `useOfflineCollection.create()`. UPDATE/DELETE se agregan al hook genérico cuando se necesiten; el adapter ya debe preparar los branches en `push()`.

---

## Pasos para implementar un módulo nuevo

Sustituir placeholders:

| Placeholder | Ejemplo Usuarios | Ejemplo Niños |
|-------------|------------------|---------------|
| `{module}` | `users` | `children` |
| `{Module}` | `Users` | `Children` |
| `{entity}` | `users` | `children` |
| `{Entity}` | `User` | `Child` |
| `{page}` | `UserCRUD` | `ChildrenCRUD` |

### Paso 1 — Tipos

**Crear:** `src/features/{module}/types/{module}.types.ts`

```typescript
import type { RecordSyncStatus } from '@/offline/models/sync-status';

export type {Entity}Record = {
  id: number | string;
  // ...campos del dominio
};

export type Offline{Entity}Record = {Entity}Record & {
  _localId?: string;
  _syncStatus?: RecordSyncStatus;
  _syncError?: string;
};

export type Create{Entity}Input = {
  // ...campos del formulario de creación (sin id ni metadatos sync)
};
```

### Paso 2 — Entity Adapter

**Crear:** `src/features/{module}/adapters/{module}.adapter.ts`

```typescript
import type { Offline{Entity}Record } from '../types/{module}.types';
import type { EntitySyncAdapter, SyncResult } from '@/offline/models/entity-adapter';

const {ENTITY}_ENTITY = '{entity}';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const {module}EntityAdapter: EntitySyncAdapter<Offline{Entity}Record> = {
  entity: {ENTITY}_ENTITY,
  queryKeys: [['{entity}'], ['{entity}-list'], ['{entity}-table']],

  getLocalId(record) {
    return String(record._localId ?? record.id);
  },

  async push(operation, payload): Promise<SyncResult<Offline{Entity}Record>> {
    // TODO: reemplazar delay + mock por llamada real cuando exista API:
  // if (operation === 'CREATE') return { serverId, data } from apiService.post(...)
    await delay(600 + Math.random() * 400);

    if (operation === 'CREATE') {
      const serverId = Date.now();
      return {
        serverId,
        data: {
          ...(payload as Offline{Entity}Record),
          id: serverId,
          _localId: String(payload._localId ?? serverId),
          _syncStatus: 'synced',
        },
      };
    }

    if (operation === 'UPDATE') {
      return {
        serverId: payload.id as number,
        data: { ...(payload as Offline{Entity}Record), _syncStatus: 'synced' },
      };
    }

    // DELETE
    return {
      serverId: payload.id as number,
      data: payload as Offline{Entity}Record,
    };
  },
};

export const {ENTITY}_ENTITY_NAME = {ENTITY}_ENTITY;
```

**Cuando exista API real**, solo cambia el cuerpo de `push()`:

```typescript
import { apiService } from '@/services/api.service';

async push(operation, payload) {
  if (operation === 'CREATE') {
    const res = await apiService.post('/{entity}', payload);
    return { serverId: res.id, data: { ...res, _syncStatus: 'synced', _localId: String(payload._localId) } };
  }
  // UPDATE → apiService.put, DELETE → apiService.delete
}
```

### Paso 3 — Hook del módulo

**Crear:** `src/features/{module}/hooks/use{Module}Offline.ts`

```typescript
import { {ENTITY}_ENTITY_NAME, {module}EntityAdapter } from '../adapters/{module}.adapter';
import type { Create{Entity}Input, Offline{Entity}Record } from '../types/{module}.types';
import { useOfflineCollection } from '@/offline/hooks/useOfflineCollection';

// Opcional: datos iniciales solo si no hay nada en IndexedDB (demo/seed)
const SEED_{ENTITY}: Offline{Entity}Record[] = [
  // { id: 1, ..., _syncStatus: 'synced' },
];

export function use{Module}Offline() {
  const collection = useOfflineCollection<Offline{Entity}Record>({
    entity: {ENTITY}_ENTITY_NAME,
    adapter: {module}EntityAdapter,
    queryKey: ['{entity}', 'list'],
    seedData: SEED_{ENTITY}, // omitir si la lista arranca vacía
    getLocalId: (record) => String(record._localId ?? record.id),
  });

  const create{Entity} = async (input: Create{Entity}Input) => {
    return collection.create({
      ...input,
      // defaults que no vienen del formulario
    } as Omit<Offline{Entity}Record, 'id' | '_localId' | '_syncStatus' | '_syncError'>);
  };

  return {
    ...collection,
    create{Entity},
  };
}

export type { Offline{Entity}Record, Create{Entity}Input, {Entity}Record } from '../types/{module}.types';
```

### Paso 4 — Registrar adapter

**Editar:** `src/offline/providers/OfflineProvider.tsx`

```typescript
import { {module}EntityAdapter } from '@/features/{module}/adapters/{module}.adapter';

const REGISTERED_ADAPTERS = [
  userEntityAdapter,
  {module}EntityAdapter, // ← agregar
];
```

Sin este paso, la cola **no sincronizará** la entidad.

### Paso 5 — Repositorio (opcional)

Solo si necesitas acceso directo a IndexedDB fuera del hook:

**Crear:** `src/offline/database/repositories/{module}.repository.ts`

```typescript
import { GenericRepository } from './generic.repository';

export class {Entity}Repository extends GenericRepository<Record<string, unknown>> {
  constructor() {
    super('{entity}');
  }
}

export const {module}Repository = new {Entity}Repository();
```

En la mayoría de casos **no hace falta** — `useOfflineCollection` es suficiente.

### Paso 6 — Actualizar la pantalla CRUD

**Editar:** `src/pages/{Page}CRUD.tsx`

#### 6.1 Imports

```typescript
import { use{Module}Offline, type Offline{Entity}Record } from '@/features/{module}/hooks/use{Module}Offline';
import { SyncStatusBadge } from '@/offline/components/SyncStatusBadge';
```

#### 6.2 Reemplazar estado local mock

```typescript
// ❌ ANTES
const [items, setItems] = useState<Mock[]>(mockData);

// ✅ DESPUÉS
const { items, create{Entity}, isLoading, pendingCount } = use{Module}Offline();
```

#### 6.3 Tabla

```typescript
const table = useDataTable({
  items,
  initialPageSize: 10,
  searchFields: [/* campos buscables */],
  getItemId: (item) => String(item._localId ?? item.id),
});

const columns: DataTableColumn<Offline{Entity}Record>[] = [
  {
    id: 'name', // columna principal
    header: 'Nombre',
    cell: ({ item }) => (
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{item.name}</span>
        <SyncStatusBadge status={item._syncStatus} />
      </div>
    ),
  },
  // ...más columnas
  { id: 'actions', header: 'Acciones', cell: ({ item }) => <RowActions ... /> },
];

<DataTableView<Offline{Entity}Record>
  items={table.items}
  columns={columns}
  rowKey={({ item }) => String(item._localId ?? item.id)}
  loading={isLoading}
  // ...toolbar, pagination, emptyState
/>
```

#### 6.4 Crear registro (formulario)

```typescript
const handleCreate = async (data: Record<string, unknown>) => {
  setLoading(true);
  try {
    await create{Entity}({
      // mapear campos del formulario
    } as Create{Entity}Input);
    setIsCreateDialogOpen(false);
  } finally {
    setLoading(false);
  }
};
```

**No usar** `setState` local para agregar filas. `create{Entity}` ya persiste en IndexedDB, encola sync y refresca React Query.

#### 6.5 Tarjeta de estadísticas (opcional)

```typescript
<Card>
  <CardHeader><CardTitle className="text-sm">Pendientes de sync</CardTitle></CardHeader>
  <CardContent><div className="text-2xl font-bold">{pendingCount}</div></CardContent>
</Card>
```

### Paso 7 — Ruta (si es pantalla nueva)

**Editar:** `src/config/routes.ts` — agregar lazy import y entrada en `routeConfig`.

---

## Checklist de verificación

Después de implementar, confirmar:

- [ ] Crear registro con DevTools → **Offline** activado
- [ ] El registro aparece **inmediatamente** en la tabla
- [ ] Badge muestra **Pendiente de sincronizar**
- [ ] Al volver **Online**, badge pasa a **Sincronizado** (o desaparece)
- [ ] Recargar página estando offline → datos **siguen visibles**
- [ ] Barra superior muestra contador de pendientes
- [ ] Botón **Sincronizar ahora** vacía la cola cuando hay conexión
- [ ] `npm run build` sin errores
- [ ] Adapter registrado en `REGISTERED_ADAPTERS`

---

## Archivos que NO debes modificar

| Archivo | Motivo |
|---------|--------|
| `src/offline/queue/queueManager.ts` | Motor de sincronización |
| `src/offline/queue/syncQueue.ts` | Cola genérica |
| `src/offline/database/migrations.ts` | Schema IDB (salvo nueva store global) |
| `src/offline/hooks/useOfflineCollection.ts` | Hook genérico |
| `src/components/Layout/MainLayout.tsx` | Ya monta `OfflineStatusBar` |

---

## Estructura de carpetas por módulo

```
src/features/{module}/
├── adapters/
│   └── {module}.adapter.ts      ← EntitySyncAdapter (único con lógica de red)
├── hooks/
│   └── use{Module}Offline.ts    ← useOfflineCollection + create{Entity}
└── types/
    └── {module}.types.ts        ← Offline{Entity}Record, Create{Entity}Input
```

---

## Referencia: módulo Usuarios (implementación actual)

| Archivo | Propósito |
|---------|-----------|
| `src/features/users/types/user.types.ts` | Tipos |
| `src/features/users/adapters/user.adapter.ts` | Adapter + simulación API |
| `src/features/users/hooks/useUsersOffline.ts` | Hook |
| `src/pages/UserCRUD.tsx` | Pantalla con DataTableView + SyncStatusBadge |
| `src/offline/providers/OfflineProvider.tsx` | Registro de `userEntityAdapter` |

---

## Operaciones futuras (UPDATE / DELETE)

Cuando el usuario pida editar/eliminar offline:

1. Extender `useOfflineCollection` con métodos `update()` y `remove()` que llamen a `enqueueOperation` con `UPDATE` / `DELETE` (o crear helpers en `offline.service.ts`).
2. Implementar los branches en `adapter.push()` para cada operación.
3. En la pantalla, reemplazar `setState` por `update{Entity}` / `delete{Entity}` del hook.

**No implementar UPDATE/DELETE** hasta que el usuario lo solicite, salvo que la pantalla ya tenga esos botones y deban funcionar offline.

---

## Prompt sugerido para Cursor

Copia y adapta:

```
Implementa soporte Offline First en el módulo {nombre} siguiendo
docs/OFFLINE_FIRST_IMPLEMENTATION.md al pie de la letra.

Entidad: {entity}
Pantalla: src/pages/{Page}CRUD.tsx
Campos: {listar campos}

Usa useOfflineCollection, crea adapter + hook + tipos en src/features/{module}/,
registra el adapter en OfflineProvider, integra SyncStatusBadge en la tabla.
No modifiques el motor en src/offline/queue/.
Referencia: módulo users.
```

---

## Preguntas frecuentes

**¿Necesito otro IndexedDB?**  
No. Todas las entidades usan `started-kit-offline` con store `entities` indexado por `entity`.

**¿Dónde va la lógica de negocio?**  
En el adapter (`push`) y en el hook del módulo (`create{Entity}` con defaults). No en `queueManager`.

**¿React Query se invalida solo?**  
Sí, vía `queryKeys` del adapter + eventos `entityChanged` / `syncCompleted`.

**¿Funciona sin Service Worker?**  
Sí. La sync al volver online usa `window.addEventListener('online')`. Background Sync es complementario.

**¿Puedo tener seed y API a la vez?**  
`seedData` solo escribe si IndexedDB está vacío para esa entidad. Cuando conectes API, carga remota en `queryFn` y elimina `seedData`.
