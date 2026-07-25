# Finanzas PWA — Aplicación de finanzas personales

PWA de finanzas personales optimizada para iOS. Modo demo con datos ficticios locales (IndexedDB); al cambiar `PUBLIC_DEMO=false` y configurar `PUBLIC_API_URL`, la app consume la API en Cloudflare Workers.

## Requisitos

- **Node.js** ≥ 22.12.0
- **pnpm** ≥ 10
- Cuenta de Vercel (para el frontend)
- Cuenta de Cloudflare (para el backend con D1 + KV)

## Estructura

```
/
├── frontend/          # Astro + React + Tailwind v4 + Recharts
│   ├── src/
│   │   ├── components/    # UI base, tablas, formularios, gráficos
│   │   ├── islands/       # React islands (Dashboard, Transactions, etc.)
│   │   ├── layouts/       # AppLayout.astro, AuthLayout.astro
│   │   ├── lib/           # db (IndexedDB), api, sync, format, profitability, seed
│   │   ├── store/         # Zustand (auth, data)
│   │   ├── types/         # Tipos TypeScript compartidos
│   │   └── pages/         # Páginas Astro
│   └── public/            # manifest, icons, sw.js
│
└── backend/           # Cloudflare Workers + Hono + Drizzle ORM
    ├── src/
    │   ├── routes/        # auth, accounts, transactions, investments, etc.
    │   ├── middleware/    # auth (JWT), cors
    │   ├── db/            # schema.ts, migrations
    │   └── lib/           # jwt, crypto
    └── wrangler.toml
```

## Demo local (sin backend)

```bash
pnpm install
pnpm dev
```

Abre http://localhost:4321. La app carga datos ficticios en IndexedDB automáticamente. Usa el botón de reinicio (↻) en el header para recargar el seed.

**Variables de entorno del frontend:**

| Variable | Default | Descripción |
|---|---|---|
| `PUBLIC_DEMO` | `true` | `true` = datos locales ficticios; `false` = usa la API real |
| `PUBLIC_API_URL` | (vacío) | URL del Worker, ej: `https://finanzas-api.tu-subdomain.workers.dev` |

## Build

```bash
pnpm build       # genera dist/ estático
pnpm preview     # sirve el build localmente
```

---

## Instrucciones de integración paso a paso

### 1. Frontend en Vercel

1. **Sube el repo a GitHub.**
2. En Vercel, importa el repositorio.
3. **Root Directory:** `frontend`
4. **Framework Preset:** Astro (se detecta automáticamente)
5. **Build Command:** `pnpm build`
6. **Output Directory:** `dist` (Vercel lo maneja con el adapter `@astrojs/vercel`)
7. **Environment Variables:**
   - `PUBLIC_DEMO` = `false` (para usar la API real)
   - `PUBLIC_API_URL` = `https://finanzas-api.tu-subdomain.workers.dev` (la URL del Worker del paso 2)
8. Deploy. Vercel te da un dominio `xxx.vercel.app`.

### 2. Backend en Cloudflare Workers

#### 2a. Crear D1 database

```bash
cd backend
pnpm install
npx wrangler d1 create finanzas-db
```

Esto imprime un `database_id`. Cópialo en `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "finanzas-db"
database_id = "PEGA_AQUI_EL_ID"
```

#### 2b. Crear KV namespace

```bash
npx wrangler kv namespace create SESSIONS
```

Copia el `id` en `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "SESSIONS"
id = "PEGA_AQUI_EL_ID"
```

#### 2c. Aplicar migraciones

```bash
npx wrangler d1 migrations create finanzas-db 0001_initial
# Copia el contenido de src/db/migrations/0001_initial.sql al archivo generado
npx wrangler d1 migrations apply finanzas-db --remote
```

#### 2d. Configurar secrets

```bash
npx wrangler secret put JWT_SECRET
# Pega una cadena aleatoria larga (ej: openssl rand -base64 32)

npx wrangler secret put JWT_REFRESH_SECRET
# Pega otra cadena aleatoria distinta
```

#### 2e. Configurar CORS

En `wrangler.toml`, cambia `CORS_ORIGIN` por tu dominio de Vercel:

```toml
[vars]
CORS_ORIGIN = "https://tu-app.vercel.app"
```

#### 2f. Deploy

```bash
npx wrangler deploy
```

Te da una URL como `https://finanzas-api.tu-subdomain.workers.dev`. Vuelve a Vercel y actualiza `PUBLIC_API_URL` con esa URL.

### 3. Dominio propio

1. **Vercel:** Settings → Domains → Add. Apunta `tudominio.com` a Vercel (DNS A o CNAME según indicaciones de Vercel).
2. **Cloudflare Workers:** Settings → Triggers → Custom Domains → Add `api.tudominio.com`.
3. En tu proveedor de DNS:
   - `tudominio.com` → Vercel (CNAME a `cname.vercel-dns.com`)
   - `api.tudominio.com` → Cloudflare (CNAME al Worker o A record)
4. Actualiza `CORS_ORIGIN` en `wrangler.toml` a `https://tudominio.com` y redeploya el Worker.
5. Actualiza `PUBLIC_API_URL` en Vercel a `https://api.tudominio.com`.

### 4. PWA en iOS

1. Abre `https://tudominio.com` en Safari (iOS 16.4+).
2. Toca **Compartir → Add to Home Screen**.
3. La app se instala como PWA standalone con icono propio.
4. El service worker cachea las rutas para uso offline.

**Meta tags ya configurados en `AppLayout.astro`:**
- `apple-mobile-web-app-capable`
- `apple-mobile-web-app-status-bar-style: black-translucent`
- `apple-mobile-web-app-title: Finanzas`
- `theme-color: #0A0A0B`
- `manifest.webmanifest` con iconos 192/512/maskable

### 5. iOS Shortcuts (opcional)

#### Shortcut 1: Registrar gasto rápido

1. Abre la app **Atajos** en iOS.
2. Crea un nuevo atajo.
3. Acciones:
   - **Pedir número** → "¿Cuánto?"
   - **Elegir de lista** → ["Alimentación", "Transporte", ...] → "¿Categoría?"
   - **Pedir texto** → "¿Descripción?" (opcional)
   - **Obtener contenido de URL:**
     - URL: `https://api.tudominio.com/transactions`
     - Método: POST
     - Headers: `Authorization: Bearer [TU_TOKEN]`, `Content-Type: application/json`
     - Body: `{"type":"expense","amount":{"¿Cuánto?"},"categoryId":"[mapear categoría]","description":{"¿Descripción?"},"date":FECHA_ACTUAL,"accountId":"[ID_CUENTA]"}`
   - **Mostrar notificación** → "Gasto registrado ✓"

4. Para obtener el token JWT: inicia sesión en la PWA, copia el token desde el almacenamiento, y pégalo en el atajo. Guarda el token en una variable del atajo.

#### Shortcut 2: Ver balance rápido

1. Acciones:
   - **Obtener contenido de URL:**
     - URL: `https://api.tudominio.com/accounts?shortcut=true`
     - Headers: `Authorization: Bearer [TU_TOKEN]`
   - **Repetir con cada** item → sumar `balance`
   - **Mostrar resultado** → "Balance: $X"

> **Nota:** La API acepta `?shortcut=true` para respuestas simplificadas si se implementa esa lógica en el Worker (pendiente).

### 6. Cambiar de demo a producción

1. En Vercel, edita las Environment Variables:
   - `PUBLIC_DEMO` = `false`
   - `PUBLIC_API_URL` = `https://api.tudominio.com`
2. Redeploya.
3. La app ahora:
   - Muestra la página de login (`/login`)
   - Hace peticiones a la API
   - Sincroniza cambios offline cuando hay conexión
   - El seed demo ya no se carga

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Astro 7, React 19, Tailwind CSS v4, Recharts 3 |
| Estado | Zustand 5 |
| Offline | IndexedDB via `idb`, Service Worker |
| Formularios | React Hook Form + Zod |
| Backend | Cloudflare Workers, Hono, Drizzle ORM |
| DB | Cloudflare D1 (SQLite en el edge) |
| Auth | JWT propio (access 15min + refresh 30 días) |
| Sesiones | Cloudflare KV (tokens revocados) |
| Hosting | Vercel (frontend) + Cloudflare Workers (backend) |
