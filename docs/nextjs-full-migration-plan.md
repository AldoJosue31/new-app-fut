# Plan maestro: migracion completa a Next.js

Estado: **planificado; ejecucion no iniciada**

Fecha de creacion: 2026-07-25

Repositorio: `new-app-fut`

## 1. Objetivo

Migrar completamente la aplicacion actual de Vite + React Router DOM a Next.js App Router, incluyendo la API serverless que hoy vive en `api/`, sin perder rutas, permisos, comportamiento, datos ni integraciones con Supabase.

El trabajo se considera terminado solo cuando:

- Next.js sea el unico framework de build, desarrollo y produccion.
- App Router sea el unico router de la aplicacion.
- Los siete endpoints de `api/` y la funcion JSON `manage-delegate-account` sean Route Handlers de Next.js.
- Supabase Auth funcione en navegador y servidor mediante cookies seguras.
- Los dos scanners Supabase Edge sigan integrados y verificados.
- Todas las rutas, roles, enlaces profundos y contratos HTTP actuales tengan paridad.
- Vite, React Router y el rewrite SPA hayan sido eliminados.
- La aplicacion pase build, lint, pruebas unitarias, pruebas de contrato y pruebas E2E.

## 2. Decisiones de arquitectura bloqueadas

Estas decisiones evitan que la migracion cambie de direccion a mitad del trabajo.

1. Se usara Next.js App Router.
2. Se usara runtime de servidor; el resultado final no tendra `output: "export"`.
3. El despliegue objetivo seguira siendo Vercel.
4. La migracion inicial permanecera en JavaScript/JSX. Convertir todo a TypeScript no forma parte de este trabajo.
5. No se rediseñara la interfaz durante la migracion.
6. Las URLs publicas y privadas actuales se conservaran.
7. Los paths, metodos y formas de respuesta de `/api/*` se conservaran.
8. `manage-delegate-account` se migrara a un Route Handler porque su contrato es JSON pequeño. Los dos scanners permaneceran como Supabase Edge Functions y se invocaran directamente desde el navegador, sin proxy por Vercel.
9. Los componentes interactivos pueden seguir siendo Client Components. Migracion completa no significa convertir cada componente en Server Component.
10. La adopcion de Server Components sera selectiva: autenticacion, layouts, paginas publicas y lecturas donde aporte seguridad o rendimiento.
11. Se hara una migracion incremental con una capa temporal de compatibilidad. El codigo legacy no se eliminara hasta demostrar paridad.
12. Cada fase requiere evidencia reproducible antes de marcarse como completada.

## 3. Alcance

### Incluido

- Bootstrap y configuracion de Next.js.
- App Router, layouts, metadata, loading, errores y 404.
- Sustitucion completa de React Router DOM.
- Migracion de Supabase Auth a `@supabase/ssr`.
- Conservacion de Supabase Realtime, Presence y notificaciones de seguridad.
- Migracion de los siete endpoints de Vercel y `manage-delegate-account` a ocho Route Handlers.
- Separacion segura de variables publicas y privadas.
- Compatibilidad de Styled Components con renderizado de Next.js.
- Adaptacion de Tailwind 4 desde plugin Vite a PostCSS.
- Aislamiento de OCR, canvas, PDF, imagenes y otras librerias browser-only.
- Pruebas unitarias, de contrato y E2E.
- Preview, canary, produccion y rollback.
- Eliminacion final de Vite, React Router y archivos legacy.

### No incluido

- Rediseño visual.
- Cambio de Supabase a otra base de datos.
- Reescritura general de servicios y reglas de negocio.
- Conversion total a TypeScript.
- Cambio de proveedor de despliegue.
- Refactors no necesarios para separar cliente y servidor.
- Nuevas funcionalidades.

## 4. Inventario inicial auditado

- 217 archivos JavaScript/JSX en `src`.
- Aproximadamente 66,840 lineas.
- 27 archivos importan `react-router-dom`.
- 64 archivos son sensibles al navegador por uso directo o transitivo de `window`, `document`, storage, observers, canvas, portales o librerias browser-only.
- 41 archivos utilizan el cliente Supabase.
- 7 endpoints HTTP en `api/`.
- 1 libreria compartida de API en `api/_lib/supabaseAdmin.js`.
- 3 Supabase Edge Functions actuales; una se migrara a Next y dos scanners permaneceran en Supabase.
- 13 RPC, 18 tablas/vistas PostgREST y el bucket `logos` consumidos directamente mediante Supabase.
- 10 archivos y 63 casos de pruebas unitarias Node; actualmente pasan 63/63.
- 8 archivos y 48 casos Deno de Edge Functions; no se pudieron ejecutar durante la auditoria porque Deno no esta instalado.
- No hay pruebas E2E de rutas, roles o autenticacion.
- No hay pruebas automatizadas de los siete endpoints.
- El lint acotado a codigo propio tiene 30 errores y 10 warnings; `npm run lint` incluye directorios de herramientas y produce muchos falsos positivos adicionales.
- El build Vite auditado pasa, pero contiene bundles OCR/WASM de aproximadamente 10 a 25 MB.
- El entorno actual usa Node 25 sin version LTS fijada; faltan `engines`, `packageManager`, `.nvmrc` y toolchain Deno reproducible.
- Las migraciones Supabase no contienen el esquema base completo y `config.toml` referencia un `seed.sql` inexistente.
- Existen ciclos de importacion asociados al barrel `src/index.js`.
- Al crear este plan habia un cambio local no confirmado en `ResultModal.jsx`; debe preservarse.
- La auditoria encontro `develop` alineada con `origin/develop` en `7783e57`, sin tags recuperables; la rama/deployment real de produccion no esta documentada en el repositorio.

El inventario se volvera a generar al iniciar la ejecucion, porque el repositorio puede cambiar.

## 5. Arquitectura objetivo

```text
src/
├── app/
│   ├── layout.jsx
│   ├── providers.jsx
│   ├── registry.jsx
│   ├── global-error.jsx
│   ├── not-found.jsx
│   ├── page.jsx
│   ├── (public)/
│   │   ├── landing/page.jsx
│   │   └── share/standings/[torneoId]/page.jsx
│   ├── (auth)/
│   │   ├── login/page.jsx
│   │   ├── invitation/[token]/page.jsx
│   │   └── delegate/invitation/[token]/page.jsx
│   ├── auth/callback/route.js
│   ├── (protected)/
│   │   ├── layout.jsx
│   │   ├── dashboard/page.jsx
│   │   ├── partidos/page.jsx
│   │   ├── configuracion/page.jsx
│   │   ├── equipos/...
│   │   ├── division/[divisionId]/...
│   │   ├── liga/...
│   │   └── admin/managers/page.jsx
│   └── api/
│       ├── admin/managers/...
│       ├── delegates/account/route.js
│       ├── delegates/unlink/route.js
│       └── divisions/[divisionId]/workspace/route.js
├── components/
├── hooks/
├── lib/
│   ├── auth/
│   ├── navigation/
│   └── supabase/
│       ├── client.js
│       ├── server.js
│       ├── admin.js
│       └── proxy.js
├── services/
└── store/
proxy.js
next.config.mjs
postcss.config.mjs
```

## 6. Contrato de rutas

Ninguna ruta se considera migrada hasta funcionar mediante navegacion cliente, acceso directo y recarga completa.

| URL actual | Acceso | Destino App Router | Estrategia |
|---|---|---|---|
| `/` | Publica o autenticada | `app/page.jsx` | Landing sin sesion, Home dentro de AppShell para admin/manager sin cambiar URL y redirect a equipos para delegate |
| `/landing` | Publica | `app/(public)/landing/page.jsx` | Pagina publica con metadata |
| `/login` | Anonimo | `app/(auth)/login/page.jsx` | Usuario autenticado se redirige a `/` |
| `/share/standings/:torneoId` | Publica | `app/(public)/share/standings/[torneoId]/page.jsx` | Conservar enlace compartible |
| `/dashboard` | Admin, manager | `app/(protected)/(manager)/dashboard/page.jsx` | Guard de rol en servidor |
| `/partidos` | Admin, manager | `app/(protected)/(manager)/partidos/page.jsx` | Guard de rol en servidor |
| `/equipos` | Admin, manager, delegate | `app/(protected)/equipos/page.jsx` | Ruta legacy soportada |
| `/equipos/:teamId` | Admin, manager, delegate | `app/(protected)/equipos/[teamId]/page.jsx` | Incluye `teamId = crear` |
| `/division/:divisionId/equipos` | Admin, manager, delegate | `app/(protected)/division/[divisionId]/equipos/page.jsx` | Ruta canonica |
| `/division/:divisionId/equipos/:teamId` | Admin, manager, delegate | `app/(protected)/division/[divisionId]/equipos/[teamId]/page.jsx` | Modal/vista detalle reproducible por URL |
| `/torneos/:torneoOrTab?/:tab?/:jornadaId?` | Admin, manager | Paginas explicitas bajo `app/(protected)/(manager)/torneos/` hasta `[torneoOrTab]/[tab]/[jornadaId]/page.jsx` | Conservar nombres y maximo de tres segmentos |
| `/division/:divisionId/torneos/:torneoOrTab?/:tab?/:jornadaId?` | Admin, manager | Misma expansion bajo `app/(protected)/(manager)/division/[divisionId]/torneos/` | Parseo centralizado y validado |
| `/liga` | Admin, manager | `app/(protected)/(manager)/liga/page.jsx` | Pestaña por defecto |
| `/liga/:tab` | Admin, manager | `app/(protected)/(manager)/liga/[tab]/page.jsx` | Pestaña persistida en URL |
| `/configuracion` | Admin, manager, delegate | `app/(protected)/configuracion/page.jsx` | Guard de usuario |
| `/invitation/:token` | Publica | `app/(auth)/invitation/[token]/page.jsx` | Validacion de token preservada |
| `/delegate/invitation/:token` | Publica | `app/(auth)/delegate/invitation/[token]/page.jsx` | Validacion de token preservada |
| `/auth/callback` | Publica tecnica | `app/auth/callback/route.js` | Intercambio PKCE y retorno seguro a login/configuracion |
| `/admin/managers` | Admin | `app/(protected)/(admin)/admin/managers/page.jsx` | Guard admin en servidor |
| Cualquier otra | Publica | `app/not-found.jsx` | Mantener inicialmente redirect a `/` |

Detalles de paridad que forman parte del contrato:

- `PublicStandings` recibe un `torneoId` entero positivo. Un ID invalido o no encontrado muestra el error actual; no se convertira silenciosamente en un 404.
- Invitaciones, login, landing y standings publicos no muestran el shell, incluso si ya existe sesion.
- Para admin/manager, `/equipos[/teamId]` se canoniza a `/division/{selectedDivision}/equipos[/teamId]`. Delegate permanece en la ruta legacy.
- `teamId = crear` abre alta; un ID inexistente conserva la lista sin abrir modal.
- Tabs validos de torneo: `definir`, `jornadas`, `standings`, `goleadores`.
- En Torneos, un primer segmento numerico representa `torneoId`; uno no numerico representa `tab`; `jornadaId` solo tiene significado bajo `jornadas`.
- Despues de cargar workspace, la ruta legacy de Torneos se canoniza a la division y torneo activos. Cambiar division conserva el tab y descarta deliberadamente torneo/jornada.
- Tabs validos de Liga: `general`, `rules`, `divisions`, `referees`. Una ruta sin tab o con tab invalido muestra `general` sin corregir la URL.
- El guard utilizado hoy es el definido dentro de `routes.jsx`; `src/hooks/ProtectedRoute.jsx` esta duplicado y muerto. No se migrara como si fuera la fuente de verdad.

### Sustituciones obligatorias de React Router

| React Router | Next.js |
|---|---|
| `BrowserRouter` | App Router |
| `Routes` / `Route` | Carpetas y `page.jsx` |
| `Link to` | `next/link` con `href` |
| `NavLink` | `Link` + `usePathname()` para estado activo |
| `useNavigate()` | `useRouter()` |
| `navigate(path, { replace: true })` | `router.replace(path)` |
| `navigate(path, { preventScrollReset: true })` | `router.push(path, { scroll: false })` |
| `useLocation().pathname` | `usePathname()` |
| `useParams()` | `params` de pagina/layout o `useParams()` de Next en cliente |
| `<Navigate />` | `redirect()` en servidor o `router.replace()` en cliente |
| `location.state` | Parametros de URL o estado local explicito |
| `React.lazy` por pagina | Code splitting automatico de App Router |

Los usos actuales de `location.state.initialView` se convertiran en query params:

```text
/equipos/123?view=stats
/equipos/123?view=delegate-requests
```

## 7. Contrato de API

Los consumidores conservaran los mismos paths durante toda la migracion. La capa de implementacion cambiara sin obligar a migrar frontend y API en el mismo commit.

El backend actual tiene tres capas y las tres quedan cubiertas:

1. API propia en `api/`: se migra completamente a Route Handlers.
2. Supabase Data API: las llamadas con RLS pueden seguir usando el cliente browser o pasar al cliente server segun la ruta; no se duplicaran artificialmente en `/api`.
3. Supabase Edge Functions: `manage-delegate-account` migra a Next; los dos scanners se conservan, se integran con la sesion SSR y se prueban.

Las 41 unidades que hoy usan Supabase se clasificaran durante M3/M4 como browser, server, realtime o privilegiadas. Ninguna importara el cliente equivocado despues del corte.

| Path y metodo actual | Autorizacion actual | Route Handler objetivo |
|---|---|---|
| `POST /api/admin/managers/create` | Admin | `app/api/admin/managers/create/route.js` |
| `PATCH /api/admin/managers/update` | Admin | `app/api/admin/managers/update/route.js` |
| `PATCH /api/admin/managers/limits` | Admin | `app/api/admin/managers/limits/route.js` |
| `PATCH /api/admin/managers/suspension` | Admin | `app/api/admin/managers/suspension/route.js` |
| `DELETE /api/admin/managers/delete` | Admin | `app/api/admin/managers/delete/route.js` |
| `POST /api/delegates/unlink` | Manager o admin | `app/api/delegates/unlink/route.js` |
| `GET /api/divisions/:divisionId/workspace` | Usuario autenticado y propietario | `app/api/divisions/[divisionId]/workspace/route.js` |
| `POST manage-delegate-account`, action `get` o `update` | Admin/manager autorizado para la liga | `app/api/delegates/account/route.js` |

### Librerias server-only

`api/_lib/supabaseAdmin.js` se separara en:

- `src/lib/supabase/admin.js`: cliente service-role, marcado `server-only`.
- `src/lib/supabase/server.js`: cliente SSR ligado a cookies.
- `src/lib/auth/require-user.js`: verificacion de identidad.
- `src/lib/auth/require-role.js`: verificacion de perfil y rol.
- `src/lib/api/responses.js`: respuestas y errores consistentes.

Durante la compatibilidad, `requireUser()` aceptara el Bearer token existente y la cookie SSR. Al finalizar:

- Los consumidores internos utilizaran la sesion cookie cuando sea posible.
- Se conservara Bearer solo si se documenta un consumidor externo real.
- Ningun endpoint confiara en datos de rol enviados por el cliente.
- Las operaciones admin seguiran usando service role exclusivamente en servidor.

### Paridad HTTP obligatoria

Antes de cambiar cada endpoint se congelara su comportamiento observado: body, status, Content-Type, JSON, headers y efectos. La primera implementacion Next reproducira ese contrato. Cualquier mejora de `500` a `400/404`, saneamiento de errores o cambio de body se registrara como hardening intencional y tendra una prueba separada.

Para cada Route Handler se probaran:

- Metodo correcto.
- Metodo incorrecto: `405`, incluyendo Content-Type y forma de respuesta acordada.
- Sin autenticacion: `401`.
- Rol incorrecto: `403`.
- Payload invalido y JSON malformado.
- Recurso inexistente: `404` cuando aplique.
- Caso exitoso y forma de respuesta.
- Efecto persistido en Supabase.
- `DELETE` con body JSON para managers/delete.
- Todas las ramas parciales de create, suspension, unlink y account update.
- Reintento e idempotencia donde una operacion toque Auth y tablas en pasos separados.
- Ausencia de secretos en respuesta y logs.

## 8. Supabase Edge Functions

Estos scanners permanecen desplegados en Supabase y forman parte del contrato integral:

| Funcion | Consumidor principal | Accion |
|---|---|---|
| `procesar-rol-juego` | `RolJuegoScanFlow.jsx` | Conservar invocacion y probar OCR remoto/fallback |
| `procesar-cedula` | `CedulaScanFlow.jsx` | Conservar invocacion y probar lectura, cache y errores |

`manage-delegate-account` se mantendra temporalmente como rollback mientras `/api/delegates/account` se valida en Preview. Despues se cambiara su unico consumidor en `services/delegates.js`, se comprobara auditoria/notificacion y se retirara la Edge Function JSON.

La migracion no termina si el frontend Next funciona pero algun scanner deja de recibir una sesion valida, archivos o payloads.

Los scanners `procesar-rol-juego` y `procesar-cedula` admiten imagenes mayores que el limite de body de una Vercel Function. Por eso no se portaran ni se enviaran a traves de un Route Handler. Si en el futuro se exige una arquitectura Next-only, primero se implementara carga directa a un bucket privado y el Route Handler recibira un `objectPath` pequeño; ese rediseño no es necesario para completar esta migracion.

## 9. Variables de entorno

| Actual | Objetivo | Exposicion |
|---|---|---|
| `VITE_APP_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` | Cliente y servidor |
| `VITE_APP_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente y servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor |
| `VITE_HF_API_KEY` | Eliminar o justificar antes de migrar | Sin consumidores detectados |

Reglas:

- Nunca usar `NEXT_PUBLIC_` para service role o claves de IA.
- Marcar modulos privilegiados con `import "server-only"`.
- Configurar Development, Preview y Production por separado en Vercel.
- Mantener en Supabase los secretos existentes de Gemini, Google Vision y proveedores OCR mientras los scanners sigan alli.
- Mantener temporalmente variables `VITE_*` y `NEXT_PUBLIC_*` en Vercel durante la ventana real de rollback.
- Ejecutar un escaneo del bundle antes del corte.
- Eliminar todos los usos de `import.meta.env`.

## 10. Control de ejecucion

### Reglas para el agente que ejecute el plan

1. Leer este documento al iniciar cada fase.
2. Verificar `git status` antes de editar.
3. Preservar cambios del usuario y no sobrescribir trabajo no relacionado.
4. Marcar solo una fase como `EN CURSO`.
5. No mezclar nuevas funcionalidades con la migracion.
6. Mantener los paths actuales hasta completar las pruebas de paridad.
7. Ejecutar la puerta de calidad de la fase antes de continuar.
8. Registrar comandos, resultados, commit y URL Preview como evidencia.
9. Si una puerta falla, corregir dentro de la misma fase o volver al ultimo estado comprobado.
10. No eliminar codigo legacy por intuicion; primero demostrar que no tiene consumidores.
11. No marcar la migracion completa mientras quede una exclusion temporal.
12. Actualizar el inventario si aparecen nuevas rutas o endpoints durante la ejecucion.

### Tablero de fases

| ID | Fase | Estado | Dependencia |
|---|---|---|---|
| M0 | Baseline y proteccion de cambios | PENDIENTE | Ninguna |
| M1 | Toolchain, entorno Supabase y red de seguridad | PENDIENTE | M0 |
| M2 | Next.js como host y API compatible con Bearer | PENDIENTE | M1 |
| M3 | Runtime, estilos, variables y fronteras cliente/servidor | PENDIENTE | M2 |
| M4 | Supabase Auth SSR y matriz de roles | PENDIENTE | M3 |
| M5 | API final: cookies, seguridad y `manage-delegate-account` | PENDIENTE | M2, M4 |
| M6 | Rutas publicas y de autenticacion | PENDIENTE | M4 |
| M7 | Shell privado y rutas privadas simples | PENDIENTE | M4, M6 |
| M8 | Rutas de equipos | PENDIENTE | M7 |
| M9 | Rutas de torneos y jornadas | PENDIENTE | M7 |
| M10 | Browser-only, rendimiento e hidratacion | PENDIENTE | M8, M9 |
| M11 | Corte, limpieza y observacion | PENDIENTE | M5, M10 |

## 11. Fases detalladas

### M0. Baseline y proteccion de cambios

Estimacion: 1 dia.

- [ ] Confirmar rama y estado del worktree.
- [ ] Confirmar proyecto, rama, deployment ID y dominio que realmente sirven produccion.
- [ ] Preservar el cambio existente en `ResultModal.jsx`.
- [ ] Capturar versiones de Node, npm y dependencias.
- [ ] Ejecutar y registrar lint actual.
- [ ] Ejecutar y registrar pruebas unitarias actuales.
- [ ] Ejecutar build Vite y guardar resultado.
- [ ] Registrar lista de rutas, API y Edge Functions.
- [ ] Capturar screenshots de rutas criticas en movil y escritorio.
- [ ] Medir bundle y tiempos de carga iniciales.
- [ ] Crear un tag o commit recuperable de baseline.

Puerta M0:

- Existe una referencia recuperable.
- Todo fallo preexistente esta documentado.
- No hay cambios del usuario sin identificar.

### M1. Toolchain, entorno Supabase y red de seguridad

Estimacion: 4 a 7 dias.

- [ ] Fijar una version Node LTS soportada por Next en `.nvmrc`, `engines` y CI.
- [ ] Fijar `packageManager` y comprobar `npm ci` en una maquina limpia.
- [ ] Incorporar Deno 2 reproducible para las suites de Edge Functions.
- [ ] Configurar Supabase CLI y Vercel CLI solo donde sean necesarios para pruebas/deploy.
- [ ] Acotar ESLint al codigo propio e ignorar `.agents`, `.gemini`, `.github/skills`, artefactos y builds.
- [ ] Corregir los 30 errores y 10 warnings del lint de aplicacion antes de convertirlo en gate.
- [ ] Crear scripts `test:unit`, `test:edge`, `test:contract`, `test:e2e` y `verify`.
- [ ] Mantener como minimo los 63 casos Node actuales.
- [ ] Ejecutar y mantener como minimo los 48 casos Deno actuales.
- [ ] Crear una migracion/snapshot base reproducible de Supabase.
- [ ] Versionar los RPC faltantes `activar_nuevo_manager`, `borrar_usuario_por_email` y `unlink_team_delegate`.
- [ ] Crear el `seed.sql` declarado en `supabase/config.toml`.
- [ ] Crear usuarios y fixtures anonimo, delegate, manager y admin en un entorno aislado.
- [ ] Probar que un reset limpio reconstruye esquema, RPC y fixtures.
- [ ] Instalar y configurar Playwright para Chromium, Firefox y WebKit.
- [ ] Automatizar login, logout y restauracion de sesion.
- [ ] Cubrir la matriz de rutas de la seccion 6.
- [ ] Congelar contratos observados de los siete endpoints y `manage-delegate-account`.
- [ ] Crear smoke tests para los dos scanners Edge.
- [ ] Evitar mutaciones destructivas en datos compartidos o produccion.
- [ ] Documentar seed y limpieza de fixtures.
- [ ] Agregar CI para instalacion, lint, Node, Deno, contratos, build y E2E smoke.

Puerta M1:

- `npm ci` funciona con toolchain fijada.
- Lint de codigo propio termina con cero errores y cero warnings.
- Pasan al menos 63 casos Node y 48 casos Deno.
- Supabase se reconstruye desde cero sin depender de funciones remotas invisibles.
- Las pruebas detectan una ruta rota, un rol incorrecto y un cambio de contrato HTTP.
- El conjunto puede ejecutarse localmente y contra Preview sin tocar produccion.

### M2. Next.js como host y API compatible con Bearer

Estimacion: 4 a 6 dias.

- [ ] Instalar la version estable de Next.js compatible con la version fijada de React.
- [ ] Fijar versiones exactas en `package-lock.json`.
- [ ] Crear `next.config.mjs`.
- [ ] Agregar `.next`, `next-env.d.ts` y salidas de pruebas a `.gitignore`.
- [ ] Crear root layout y metadata base.
- [ ] Crear una ruta catch-all temporal que monte la SPA actual como Client Component.
- [ ] Montar el arbol legacy sin importar `main.jsx` ni disparar `createRoot`.
- [ ] Mantener temporalmente `BrowserRouter`.
- [ ] Cambiar scripts a `next dev`, `next build` y `next start`.
- [ ] Crear helpers server-only compatibles con el Bearer token actual.
- [ ] Migrar los siete handlers de `api/` a Route Handlers conservando contratos observados.
- [ ] Eliminar bypass DEV de limits/suspension y fallback no-JSON del workspace despues de validar los handlers.
- [ ] Retirar el rewrite global a `/index.html` antes del primer Preview Next.
- [ ] Evitar que `api/` legacy y App Router reclamen simultaneamente los mismos paths.
- [ ] Conservar el deployment Vite inmutable, sus variables y su ID para rollback.
- [ ] Hacer que todas las URLs actuales abran dentro del host Next.

Puerta M2:

- `next build` pasa.
- Las pruebas legacy siguen pasando.
- Los siete Route Handlers pasan contratos con Bearer Auth.
- No existe rewrite global hacia `index.html`.
- No hay dos implementaciones activas del mismo path `/api`.
- Acceso directo a todas las rutas funciona en Preview.
- Aun no se elimina React Router.

### M3. Runtime, estilos, variables y fronteras

Estimacion: 3 a 5 dias.

- [ ] Configurar Styled Components con compiler y registry SSR.
- [ ] Mover CSS global al root layout.
- [ ] Sustituir `@tailwindcss/vite` por `@tailwindcss/postcss`.
- [ ] Crear `providers.jsx` con ThemeProvider y providers cliente.
- [ ] Migrar variables conforme a la seccion 9.
- [ ] Sustituir `import.meta.env.DEV`.
- [ ] Eliminar imports mediante `src/index.js` en fronteras servidor/cliente.
- [ ] Dividir/eliminar `src/index.js`, que reexporta `main.jsx` y puede ejecutar `createRoot` por efecto lateral.
- [ ] Romper los ciclos de importacion que impidan separar modulos.
- [ ] Crear helpers de rutas puros en `src/lib/navigation`.
- [ ] Clasificar los 41 consumidores Supabase como browser, server, realtime o privilegiados.
- [ ] Sustituir el singleton Supabase universal por el cliente correcto en cada frontera.
- [ ] Marcar dependencias browser-only y server-only.
- [ ] Definir `#modal-root` en el layout o migrar portales a `document.body`; Next no crea `#root`.
- [ ] Diseñar hidratacion controlada para `DivisionStore` persistente y ThemeStore.
- [ ] Adaptar `document.title` a Metadata API.

Puerta M3:

- No hay secretos privados en el bundle.
- No hay errores de Styled Components ni flash de estilos.
- No hay imports server-only alcanzables desde cliente.

### M4. Supabase Auth SSR y roles

Estimacion: 4 a 7 dias.

- [ ] Instalar `@supabase/ssr`.
- [ ] Crear cliente browser.
- [ ] Crear cliente server ligado a cookies.
- [ ] Crear cliente admin server-only.
- [ ] Implementar `proxy.js` y matcher.
- [ ] Refrescar tokens con verificacion valida.
- [ ] Implementar `requireUser` y `requireRole`.
- [ ] Crear layouts protegidos.
- [ ] Consolidar la duplicacion actual entre `AuthContext` y `useAuthStore`.
- [ ] Hidratar un unico provider cliente desde la identidad/perfil verificados en servidor.
- [ ] Mantener Realtime, Presence y avisos de suspension en Client Components.
- [ ] Preservar la regla actual: manager/delegate suspendidos son expulsados; admin no usa ese flag salvo cambio de seguridad aprobado.
- [ ] Adaptar login y logout a cookies SSR.
- [ ] Implementar callback PKCE para Google OAuth.
- [ ] Conservar login con Google y link/unlink de identidad Google.
- [ ] Validar y limitar el parametro de retorno del callback a rutas internas.
- [ ] Actualizar la allowlist de redirects de Supabase para Local, Preview y Production.
- [ ] Sustituir los errores OAuth del hash por query params compatibles con el callback.
- [ ] Probar expiracion y refresh de token.
- [ ] Evitar cache compartida en respuestas autenticadas.
- [ ] Validar la matriz anonimo/delegate/manager/admin.

Puerta M4:

- No hay flash de contenido privado.
- Una recarga conserva sesion y rol.
- Un usuario no puede acceder a datos o rutas de otro rol.
- Presence y suspension siguen funcionando.

### M5. API final: cookies, seguridad y `manage-delegate-account`

Estimacion: 4 a 7 dias.

- [ ] Completar las librerias server-only descritas en la seccion 7.
- [ ] Admitir cookie SSR y Bearer durante una ventana de compatibilidad medida.
- [ ] Proteger mutaciones con cookies mediante SameSite y validacion de `Origin`.
- [ ] Marcar handlers autenticados como runtime Node, dinamicos y no cacheables.
- [ ] Enviar `Cache-Control: private, no-store` en workspace y respuestas privadas.
- [ ] Probar que dos usuarios nunca comparten una respuesta cacheada.
- [ ] Migrar `manage-delegate-account` a `POST /api/delegates/account`.
- [ ] Cambiar su consumidor y conservar actions `get` y `update`.
- [ ] Probar propietario, `league_admin`, admin y usuario de otra liga.
- [ ] Comprobar usuarios suspendidos/eliminados y rol del objetivo en operaciones administrativas.
- [ ] Congelar o corregir explicitamente la politica de acceso a workspace.
- [ ] Preservar autorizacion user-scoped/RLS de `unlink_team_delegate`.
- [ ] Probar y endurecer compensacion ante fallos parciales de create, suspension, unlink y account update.
- [ ] Sanear errores internos de Supabase antes de responder.
- [ ] Agregar request/correlation ID y medicion por endpoint.
- [ ] Agregar rate limit servidor por usuario a los scanners o verificar uno equivalente en Supabase.
- [ ] Ejecutar pruebas de contrato y efectos persistidos de los ocho Route Handlers.
- [ ] Retirar Bearer interno solo si no existe consumidor externo documentado.
- [ ] Retirar `manage-delegate-account` Edge solo despues de comprobar cero trafico y rollback.
- [ ] Eliminar definitivamente `api/_lib` y `api/` si aun permanecen como fuente.

Puerta M5:

- Los ocho Route Handlers pasan la matriz HTTP, CSRF, cache y autorizacion.
- Los dos scanners Edge pasan smoke tests desde Preview.
- Ningun consumidor frontend de los siete paths originales necesita cambiar su URL.
- No existe acceso a service role desde cliente.
- No quedan bypass DEV, fallback no-JSON ni implementaciones duplicadas.

### M6. Rutas publicas y autenticacion

Estimacion: 2 a 4 dias.

Orden:

1. `/landing`
2. `/share/standings/[torneoId]`
3. `/login`
4. `/auth/callback`
5. `/invitation/[token]`
6. `/delegate/invitation/[token]`
7. `/`

- [ ] Crear pages y layouts nativos.
- [ ] Sustituir Links.
- [ ] Pasar params como props donde sea posible.
- [ ] Implementar metadata y Open Graph publicos.
- [ ] Probar error, cancelacion y exito del login Google.
- [ ] Probar retorno a `/configuracion` al vincular identidad Google.
- [ ] Definir loading, error y not-found.
- [ ] Retirar estas rutas del catch-all legacy.

Puerta M6:

- Todas funcionan con JS deshabilitado al nivel que corresponda.
- Acceso directo y recarga conservan comportamiento.
- Invitaciones invalidas y expiradas mantienen su feedback.

### M7. Shell privado y rutas simples

Estimacion: 3 a 5 dias.

- [ ] Crear layout privado con Sidebar.
- [ ] Migrar estado activo de Sidebar con `usePathname`.
- [ ] Migrar `/dashboard`.
- [ ] Migrar `/partidos`.
- [ ] Migrar `/configuracion`.
- [ ] Migrar `/liga` y `/liga/[tab]`.
- [ ] Migrar `/admin/managers`.
- [ ] Sustituir redirects cliente por redirects servidor cuando aplique.
- [ ] Eliminar `React.lazy` de AdminManagers.
- [ ] Retirar rutas migradas del catch-all.

Puerta M7:

- Shell conserva estado y responsive behavior.
- Roles y redirects coinciden con el contrato.
- Back/forward y refresh funcionan.

### M8. Equipos

Estimacion: 4 a 7 dias.

- [ ] Migrar rutas legacy `/equipos`.
- [ ] Migrar rutas canonicas por division.
- [ ] Pasar `divisionId` y `teamId` desde App Router.
- [ ] Conservar `teamId = crear`.
- [ ] Sustituir `location.state.initialView` por `?view=`.
- [ ] Preservar `view` al canonizar una ruta legacy y eliminarlo al cerrar detalle.
- [ ] Conservar que delegate permanezca en legacy y manager/admin canonice a la division seleccionada.
- [ ] Hidratar la division persistida sin flash ni redirect a una division incorrecta.
- [ ] Sustituir `preventScrollReset`.
- [ ] Probar modal de detalle, alta, edicion, transferencia y delegados.
- [ ] Probar rutas de manager y delegate por separado.
- [ ] Retirar rutas de equipos del catch-all.

Puerta M8:

- Cualquier vista de equipo importante tiene URL recargable y compartible.
- No hay diferencias funcionales entre ruta legacy y canonica.

### M9. Torneos y jornadas

Estimacion: 6 a 10 dias.

- [ ] Crear un helper puro y probado `parseTournamentRoute`.
- [ ] Crear paginas explicitas de cero a tres segmentos para rutas legacy.
- [ ] Crear la misma expansion explicita bajo `division/[divisionId]`.
- [ ] Delegar todas las paginas en un unico `TorneosPageClient`.
- [ ] Conservar torneo, tab y jornada en URL.
- [ ] Validar que jornada solo tenga significado bajo el tab `jornadas`.
- [ ] Canonizar division, torneo activo y tab exactamente como la aplicacion actual.
- [ ] Al cambiar division, conservar tab y descartar torneo/jornada.
- [ ] Migrar navegacion de `TorneosTemplate`.
- [ ] Migrar navegacion de `TorneoJornadasTab`.
- [ ] Migrar definicion, standings, goleadores y jornadas.
- [ ] Probar fixture, planificacion, resultados y playoffs.
- [ ] Probar escaneo de rol y cedula.
- [ ] Probar exports de calendario, standings, cedulas y resumen.
- [ ] Retirar rutas de torneos del catch-all.

Puerta M9:

- Todas las combinaciones validas de URL abren la misma vista antes y despues.
- Escaneos, planificacion, resultados y exports pasan pruebas.
- El catch-all legacy ya no recibe ninguna ruta funcional.

### M10. Browser-only, rendimiento e hidratacion

Estimacion: 3 a 5 dias.

- [ ] Revalidar los 64 archivos browser-sensitive del inventario.
- [ ] Marcar puntos de entrada interactivos con `"use client"`.
- [ ] Corregir inicializadores `localStorage` sin guard en `useTorneosLogic`.
- [ ] Mover `window.location.origin` fuera del render de TeamForm y DelegateInviteModal.
- [ ] Eliminar `window.innerWidth` del render inicial de TorneoDashboard.
- [ ] Revisar `Date.now()` inicial en vistas con countdown para evitar mismatch.
- [ ] Cargar PaddleOCR con `next/dynamic` y `ssr: false` cuando sea necesario.
- [ ] Aislar `@imgly/background-removal`.
- [ ] Convertir imports estaticos de `@imgly/background-removal` y `html-to-image` en cargas cliente diferidas.
- [ ] Aislar canvas, workers, portales, `html-to-image` y `jspdf`.
- [ ] Mover accesos a `localStorage` fuera de inicializacion de servidor.
- [ ] Corregir diferencias de hidratacion.
- [ ] Analizar bundle por ruta.
- [ ] Comparar metricas con baseline.
- [ ] Instrumentar errores cliente/servidor, Web Vitals, request IDs y latencia de API.
- [ ] Verificar movil, escritorio y reduced motion.

Puerta M10:

- Cero errores o warnings de hidratacion.
- Cero `window is not defined`.
- Ninguna ruta carga OCR/PDF si no lo necesita.
- No hay regresion superior al 10% en las metricas acordadas frente al baseline.

### M11. Corte, limpieza y observacion

Estimacion: 2 a 4 dias mas ventana de observacion.

- [ ] Ejecutar `verify` completo local.
- [ ] Desplegar Preview con entorno aislado.
- [ ] Ejecutar E2E y contratos contra Preview.
- [ ] Ejecutar smoke manual de flujos criticos.
- [ ] Confirmar proyecto, rama de produccion, dominio, runtime y variables reales de Vercel.
- [ ] Verificar que el rewrite SPA fue retirado desde M2.
- [ ] Eliminar `react-router-dom`.
- [ ] Eliminar `src/main.jsx`.
- [ ] Eliminar `src/routes` y `src/router.jsx`.
- [ ] Eliminar `index.html`.
- [ ] Eliminar `vite.config.js`.
- [ ] Eliminar Vite, plugin React Vite, plugin Tailwind Vite y React Refresh.
- [ ] Eliminar catch-all de compatibilidad.
- [ ] Ejecutar busquedas de residuos.
- [ ] Ensayar rollback en un alias no productivo.
- [ ] Probar Next mediante alias interno durante un ciclo funcional completo.
- [ ] Usar canary 5-10% si el plan de Vercel lo permite; si no, usar una cohorte interna por alias.
- [ ] Desplegar produccion.
- [ ] Ejecutar smoke post-deploy.
- [ ] Observar intensivamente la primera hora y mantener vigilancia reforzada 48-72 horas.
- [ ] Mantener deployment Vite y variables antiguas disponibles al menos siete dias.
- [ ] Permitir durante la ventana solo cambios de base de datos aditivos y compatibles con ambos deployments.

Puerta M11:

- Se cumple toda la Definition of Done.
- Produccion funciona sin codigo de compatibilidad.
- El rollback fue ensayado y documentado.

## 12. Matriz E2E minima

| Flujo | Anonimo | Delegate | Manager | Admin |
|---|---:|---:|---:|---:|
| Landing | Ver | Ver | Ver | Ver |
| Login | Ver | Redirect | Redirect | Redirect |
| Tabla publica | Ver | Ver | Ver | Ver |
| Invitaciones | Ver/validar | Ver/validar | Ver/validar | Ver/validar |
| `/` | Landing | Redirect equipos | Dashboard | Dashboard |
| Dashboard | Redirect login | Denegado | Ver | Ver |
| Partidos | Redirect login | Denegado | Ver | Ver |
| Equipos | Redirect login | Ver asignados | Ver | Ver |
| Torneos | Redirect login | Denegado | Ver | Ver |
| Liga | Redirect login | Denegado | Ver | Ver |
| Configuracion | Redirect login | Ver | Ver | Ver |
| Admin managers | Redirect login | Denegado | Denegado | Ver |

Flujos funcionales obligatorios:

- Login, logout, token refresh y sesion expirada.
- Suspension de cuenta mientras esta conectada.
- Presence de managers.
- Selector de division.
- Alta, edicion y detalle de equipo.
- Invitacion, cambio y desvinculacion de delegate.
- Creacion y configuracion de torneo.
- Fixture, jornadas, planificacion y resultados.
- Standings y goleadores.
- Escaneo de rol y cedula.
- Exports de imagen/PDF.
- Responsive movil y escritorio.
- Back, forward, refresh y acceso por URL copiada.

## 13. Puerta global de calidad

Se creara un script `npm run verify` que ejecute, como minimo:

```text
clean npm ci
lint
63+ Node unit tests
48+ Deno tests
API contract tests
Next production build
68 route/role expectations
E2E in Chromium, Firefox and WebKit
secret scan
residue checks
```

Busquedas de residuos esperadas al final:

```text
react-router-dom       -> 0 resultados
BrowserRouter          -> 0 resultados
<Routes / <Route       -> 0 resultados
import.meta.env        -> 0 resultados
@vitejs/plugin-react   -> 0 dependencias
@tailwindcss/vite      -> 0 dependencias
vite.config            -> archivo inexistente
src/main.jsx           -> archivo inexistente
src/routes             -> directorio inexistente
api/*.js legacy        -> directorio inexistente
rewrite a index.html   -> 0 resultados
```

## 14. Rollout y rollback

### Rollout

1. Confirmar rama y deployment que sirven produccion.
2. Crear baseline y deployment Vite inmutable recuperable.
3. Desplegar Vite baseline y Next Preview contra fixtures equivalentes.
4. Ejecutar el mismo conjunto de contratos y E2E en ambos.
5. Probar Next mediante alias interno durante un ciclo funcional.
6. Aplicar canary 5-10% si Vercel lo permite o cohorte interna por alias.
7. Promover frontend y API Next como un unico artefacto.
8. Ejecutar smoke inmediato de login, workspace, equipo, resultado, invitacion, OCR y ocho Route Handlers.
9. Observar intensivamente una hora y reforzar vigilancia 48-72 horas.
10. Mantener Vite recuperable al menos siete dias.

### Señales de rollback

- Login o refresh supera 2% de fallos durante cinco minutos.
- Usuarios ven datos o rutas de un rol incorrecto.
- API supera 1% de 5xx o cinco errores en cinco minutos.
- Dos smoke tests criticos consecutivos fallan.
- OCR o carga de imagenes deja de funcionar.
- No se pueden registrar resultados.
- Rutas compartidas o invitaciones dejan de abrir.
- Aparecen errores de hidratacion que bloquean interaccion.
- Una respuesta privada se cachea o se entrega a otro usuario.

### Procedimiento

1. Reasignar produccion al deployment Vite inmutable comprobado; no comenzar con un revert Git.
2. No revertir migraciones de base de datos automaticamente.
3. Mantener variables `VITE_*`, secretos y scanners Edge.
4. Ejecutar el smoke del deployment restaurado.
5. Informar que algunas sesiones podrian requerir login nuevamente.
6. Conservar logs, request IDs y deployment fallido.
7. Reproducir y corregir solo en Preview.
8. Repetir todas las puertas afectadas antes de un nuevo corte.

## 15. Definition of Done

No se puede marcar este plan como completado hasta comprobar cada punto:

- [ ] `npm run verify` termina con codigo 0.
- [ ] `npm ci` funciona en CI limpia con Node/npm fijados.
- [ ] Lint termina con cero errores y cero warnings.
- [ ] Pasan al menos 63 pruebas Node y 48 pruebas Deno.
- [ ] `next build` termina con codigo 0.
- [ ] Pasan las 68 expectativas ruta/rol y E2E en tres navegadores.
- [ ] Los ocho Route Handlers pasan contratos y efectos persistidos.
- [ ] Los dos scanners Edge pasan smoke tests desde la app Next.
- [ ] Todas las URLs de la seccion 6 pasan acceso directo y recarga.
- [ ] No existe `react-router-dom` en codigo ni dependencias.
- [ ] No existe Vite en scripts, dependencias o configuracion.
- [ ] No existe el directorio legacy `api/`.
- [ ] No existe el rewrite global hacia `index.html`.
- [ ] No existe capa catch-all legacy.
- [ ] No existe `import.meta.env`.
- [ ] Ningun secreto privado aparece en bundles o respuestas.
- [ ] Respuestas privadas son `private, no-store` y pasan aislamiento entre usuarios.
- [ ] Mutaciones por cookie pasan la prueba CSRF.
- [ ] Auth usa cookies SSR y verificacion de identidad segura.
- [ ] Roles se validan en servidor y no solo en UI.
- [ ] No hay errores de hidratacion.
- [ ] E2E no registra `pageerror` ni 5xx inesperados.
- [ ] Rutas ajenas a OCR/PDF no descargan sus bundles pesados.
- [ ] El entorno Supabase puede reconstruirse desde cero.
- [ ] No hay regresiones bloqueantes de accesibilidad o responsive.
- [ ] Error rate y rendimiento permanecen dentro de umbral durante 72 horas.
- [ ] El rollback fue ensayado y el deployment Vite sigue recuperable.
- [ ] No quedan bypass DEV, fallbacks ni exclusiones temporales.
- [ ] El inventario final de rutas y endpoints coincide con este documento.
- [ ] La evidencia final esta registrada.

## 16. Registro de evidencia

Actualizar esta tabla durante la ejecucion:

| Fase | Commit | Preview | Comandos ejecutados | Resultado | Fecha |
|---|---|---|---|---|---|
| M0 |  |  |  |  |  |
| M1 |  |  |  |  |  |
| M2 |  |  |  |  |  |
| M3 |  |  |  |  |  |
| M4 |  |  |  |  |  |
| M5 |  |  |  |  |  |
| M6 |  |  |  |  |  |
| M7 |  |  |  |  |  |
| M8 |  |  |  |  |  |
| M9 |  |  |  |  |  |
| M10 |  |  |  |  |  |
| M11 |  |  |  |  |  |

## 17. Referencias tecnicas

- Migracion oficial desde Vite: <https://nextjs.org/docs/pages/guides/migrating/from-vite>
- App Router: <https://nextjs.org/docs/app>
- Server y Client Components: <https://nextjs.org/docs/app/getting-started/server-and-client-components>
- Route Handlers: <https://nextjs.org/docs/app/getting-started/route-handlers>
- Styled Components: <https://nextjs.org/docs/app/guides/css-in-js>
- Supabase SSR: <https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs>
- Limites de Vercel Functions: <https://vercel.com/docs/functions/limitations>
