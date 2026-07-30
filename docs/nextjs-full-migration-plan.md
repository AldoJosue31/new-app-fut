# Plan maestro: migracion completa a Next.js

Estado: **en ejecucion; corte local M11 verificado y rollout externo pendiente**

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
| M0 | Baseline y proteccion de cambios | COMPLETADA | Ninguna |
| M1 | Toolchain, entorno Supabase y red de seguridad | EN CURSO | M0 |
| M2 | Next.js como host y API compatible con Bearer | COMPLETADA LOCAL | M1 |
| M3 | Runtime, estilos, variables y fronteras cliente/servidor | COMPLETADA LOCAL | M2 |
| M4 | Supabase Auth SSR y matriz de roles | COMPLETA LOCALMENTE; ROLLOUT PENDIENTE | M3 |
| M5 | API final: cookies, seguridad y `manage-delegate-account` | EN CURSO; HARDENING LOCAL IMPLEMENTADO | M2, M4 |
| M6 | Rutas publicas y de autenticacion | COMPLETA LOCALMENTE; ROLLOUT PENDIENTE | M4 |
| M7 | Shell privado y rutas privadas simples | COMPLETA LOCALMENTE; ROLLOUT PENDIENTE | M4, M6 |
| M8 | Rutas de equipos | COMPLETA LOCALMENTE; ROLLOUT AISLADO PENDIENTE | M7 |
| M9 | Rutas de torneos y jornadas | COMPLETA LOCALMENTE EN ROUTING; ROLLOUT AISLADO PENDIENTE | M7 |
| M10 | Browser-only, rendimiento e hidratacion | COMPLETA LOCALMENTE; Preview y telemetria externa pendientes | M8, M9 |
| M11 | Corte, limpieza y observacion | EN CURSO; CORTE LOCAL DE FRAMEWORK VERIFICADO | M5, M10 |

## 11. Fases detalladas

### M0. Baseline y proteccion de cambios

Estimacion: 1 dia.

- [x] Confirmar rama y estado del worktree.
- [ ] Confirmar proyecto, rama, deployment ID y dominio que realmente sirven produccion.
- [x] Preservar el cambio existente en `ResultModal.jsx`.
- [x] Capturar versiones de Node, npm y dependencias.
- [x] Ejecutar y registrar lint actual.
- [x] Ejecutar y registrar pruebas unitarias actuales.
- [x] Ejecutar build Vite y guardar resultado.
- [x] Registrar lista de rutas, API y Edge Functions.
- [x] Capturar screenshots de rutas criticas en movil y escritorio.
- [x] Medir bundle y tiempos de carga iniciales.
- [x] Crear un tag o commit recuperable de baseline.

Puerta M0:

- Existe una referencia recuperable.
- Todo fallo preexistente esta documentado.
- No hay cambios del usuario sin identificar.

### M1. Toolchain, entorno Supabase y red de seguridad

Estimacion: 4 a 7 dias.

- [x] Fijar una version Node LTS soportada por Next en `.nvmrc`, `engines` y CI.
- [x] Fijar `packageManager` y comprobar `npm ci` en una maquina limpia.
- [x] Incorporar Deno 2 reproducible para las suites de Edge Functions.
- [x] Configurar Supabase CLI y Vercel CLI solo donde sean necesarios para pruebas/deploy. Supabase esta fijado; Vercel se difiere hasta M2.
- [x] Acotar ESLint al codigo propio e ignorar `.agents`, `.gemini`, `.github/skills`, artefactos y builds.
- [x] Corregir los 30 errores y 10 warnings del lint de aplicacion antes de convertirlo en gate.
- [x] Crear scripts `test:unit`, `test:edge`, `test:contract`, `test:e2e` y `verify`.
- [x] Mantener como minimo los 63 casos Node actuales.
- [x] Ejecutar y mantener como minimo los 48 casos Deno actuales.
- [ ] Crear una migracion/snapshot base reproducible de Supabase.
- [ ] Versionar los RPC faltantes `activar_nuevo_manager`, `borrar_usuario_por_email` y `unlink_team_delegate`.
- [x] Crear el `seed.sql` declarado en `supabase/config.toml`.
- [ ] Crear usuarios y fixtures anonimo, delegate, manager y admin en un entorno aislado.
- [ ] Probar que un reset limpio reconstruye esquema, RPC y fixtures.
- [x] Instalar y configurar Playwright para Chromium, Firefox y WebKit.
- [ ] Automatizar login, logout y restauracion de sesion.
- [ ] Cubrir la matriz de rutas de la seccion 6.
- [x] Congelar contratos observados de los siete endpoints y `manage-delegate-account`.
- [ ] Crear smoke tests para los dos scanners Edge.
- [x] Evitar mutaciones destructivas en datos compartidos o produccion.
- [ ] Documentar seed y limpieza de fixtures.
- [x] Agregar CI para instalacion, lint, Node, Deno, contratos, build y E2E smoke.

Puerta M1:

- `npm ci` funciona con toolchain fijada.
- Lint de codigo propio termina con cero errores y cero warnings.
- Pasan al menos 63 casos Node y 48 casos Deno.
- Supabase se reconstruye desde cero sin depender de funciones remotas invisibles.
- Las pruebas detectan una ruta rota, un rol incorrecto y un cambio de contrato HTTP.
- El conjunto puede ejecutarse localmente y contra Preview sin tocar produccion.

### M2. Next.js como host y API compatible con Bearer

Estimacion: 4 a 6 dias.

- [x] Instalar la version estable de Next.js compatible con la version fijada de React.
- [x] Fijar versiones exactas en `package-lock.json`.
- [x] Crear `next.config.mjs`.
- [x] Agregar `.next`, `next-env.d.ts` y salidas de pruebas a `.gitignore`.
- [x] Crear root layout y metadata base.
- [x] Crear una ruta catch-all temporal que monte la SPA actual como Client Component.
- [x] Montar el arbol legacy sin importar `main.jsx` ni disparar `createRoot`.
- [x] Mantener temporalmente `BrowserRouter`.
- [x] Cambiar scripts a `next dev`, `next build` y `next start`.
- [x] Crear helpers server-only compatibles con el Bearer token actual.
- [x] Migrar los siete handlers de `api/` a Route Handlers conservando contratos observados.
- [x] Eliminar bypass DEV de limits/suspension y fallback no-JSON del workspace despues de validar los handlers.
- [x] Retirar el rewrite global a `/index.html` antes del primer Preview Next.
- [x] Evitar que `api/` legacy y App Router reclamen simultaneamente los mismos paths.
- [x] Conservar el deployment Vite inmutable, sus variables y su ID para rollback.
- [x] Hacer que todas las URLs actuales abran dentro del host Next.

Puerta M2:

- `next build` pasa.
- Las pruebas legacy siguen pasando.
- Los siete Route Handlers pasan contratos con Bearer Auth.
- No existe rewrite global hacia `index.html`.
- No hay dos implementaciones activas del mismo path `/api`.
- Acceso directo a todas las rutas funciona en Preview.
- Aun no se elimina React Router.

Estado local al 2026-07-25: la implementacion y las puertas locales de M2
estan completas. El build de Next, los contratos Bearer, el build Vite de
rollback y 12 navegaciones directas/recargas pasaron. Preview y CI siguen
pendientes porque esta rama aun no se ha publicado. La evidencia detallada
esta en `docs/migration-evidence/m2/progress.md`.

### M3. Runtime, estilos, variables y fronteras

Estimacion: 3 a 5 dias.

- [x] Configurar Styled Components con compiler y registry SSR.
- [x] Mover CSS global al root layout.
- [x] Sustituir `@tailwindcss/vite` por `@tailwindcss/postcss`.
- [x] Crear `providers.jsx` con el registry y mantener Theme/Auth en el provider cliente legacy mientras Auth dependa de React Router.
- [x] Migrar variables conforme a la seccion 9.
- [x] Sustituir `import.meta.env.DEV`.
- [x] Eliminar imports mediante `src/index.js` en fronteras servidor/cliente.
- [x] Dividir/eliminar `src/index.js`, que reexporta `main.jsx` y puede ejecutar `createRoot` por efecto lateral.
- [x] Romper los ciclos de importacion que impidan separar modulos.
- [x] Crear helpers de rutas puros en `src/lib/navigation`.
- [x] Clasificar los 41 consumidores Supabase como browser, server, realtime o privilegiados.
- [x] Sustituir el singleton Supabase universal por el cliente correcto en cada frontera.
- [x] Marcar dependencias browser-only y server-only.
- [x] Definir `#modal-root` en el layout o migrar portales a `document.body`; Next no crea `#root`.
- [x] Diseñar hidratacion controlada para `DivisionStore` persistente y ThemeStore.
- [x] Adaptar `document.title` a Metadata API.

Puerta M3:

- No hay secretos privados en el bundle.
- No hay errores de Styled Components ni flash de estilos.
- No hay imports server-only alcanzables desde cliente.

Estado local al 2026-07-25: implementacion y puertas locales completas.
Lint 0/0, 77 pruebas Node, 53 Deno, contratos API/Edge, builds Next/Vite,
12 E2E y el escaneo de secretos del bundle pasaron. Preview y CI permanecen
pendientes hasta publicar intencionalmente la rama. Ver
`docs/migration-evidence/m3/progress.md`.

### M4. Supabase Auth SSR y roles

Estimacion: 4 a 7 dias.

- [x] Instalar `@supabase/ssr`.
- [x] Crear cliente browser.
- [x] Crear cliente server ligado a cookies.
- [x] Crear cliente admin server-only.
- [x] Implementar `proxy.js` y matcher.
- [x] Refrescar tokens con verificacion valida.
- [x] Implementar `requireUser` y `requireRole`.
- [ ] Crear layouts protegidos.
- [x] Consolidar la duplicacion actual entre `AuthContext` y `useAuthStore`.
- [x] Hidratar un unico provider cliente desde la identidad/perfil verificados en servidor.
- [x] Mantener Realtime, Presence y avisos de suspension en Client Components.
- [x] Preservar la regla actual: manager/delegate suspendidos son expulsados; admin no usa ese flag salvo cambio de seguridad aprobado.
- [x] Adaptar login y logout a cookies SSR.
- [x] Implementar callback PKCE para Google OAuth.
- [x] Conservar login con Google y link/unlink de identidad Google.
- [x] Validar y limitar el parametro de retorno del callback a rutas internas.
- [ ] Actualizar la allowlist de redirects de Supabase para Local, Preview y Production.
- [x] Sustituir los errores OAuth del hash por query params compatibles con el callback.
- [x] Probar expiracion y refresh de token a nivel de contrato.
- [x] Evitar cache compartida en respuestas autenticadas.
- [x] Validar la matriz anonimo/delegate/manager/admin con unitarias y E2E anonimo.

Puerta M4:

- No hay flash de contenido privado.
- Una recarga conserva sesion y rol.
- Un usuario no puede acceder a datos o rutas de otro rol.
- Presence y suspension siguen funcionando.

Estado local al 2026-07-26: implementacion SSR Auth completa. Manager, admin y
delegate pasaron login, recarga, rutas permitidas/prohibidas y logout contra el
build Next local conectado al proyecto hospedado, sin mutaciones de negocio.
La suspension real y Presence concurrente se difieren a usuarios aislados para
no alterar produccion. Tambien quedan como tareas de rollout los layouts por
route group y la allowlist de Preview/Production. Ver
`docs/migration-evidence/m4/progress.md` y
`docs/migration-evidence/m4/production-role-smoke.md`.

### M5. API final: cookies, seguridad y `manage-delegate-account`

Estimacion: 4 a 7 dias.

- [x] Completar las librerias server-only descritas en la seccion 7.
- [x] Admitir cookie SSR y Bearer durante una ventana de compatibilidad medida.
- [x] Proteger mutaciones con cookies mediante SameSite y validacion de `Origin`.
- [x] Marcar handlers autenticados como runtime Node, dinamicos y no cacheables.
- [x] Enviar `Cache-Control: private, no-store` en workspace y respuestas privadas.
- [x] Probar que dos usuarios nunca comparten una respuesta cacheada.
- [x] Migrar `manage-delegate-account` a `POST /api/delegates/account`.
- [x] Cambiar su consumidor y conservar actions `get` y `update`.
- [x] Probar propietario, `league_admin`, admin y usuario de otra liga.
- [x] Comprobar usuarios suspendidos/eliminados y rol del objetivo en operaciones administrativas.
- [x] Congelar explicitamente la politica de workspace: usuario autenticado y propietario de la liga; otra liga responde `404`.
- [x] Preservar autorizacion user-scoped/RLS de `unlink_team_delegate`.
- [ ] Probar y endurecer compensacion ante fallos parciales de create, suspension, unlink y account update.
- [x] Sanear errores internos de Supabase antes de responder.
- [x] Agregar request/correlation ID.
- [ ] Agregar medicion por endpoint.
- [ ] Agregar rate limit servidor por usuario a los scanners o verificar uno equivalente en Supabase.
- [x] Ejecutar pruebas locales de contrato de los ocho Route Handlers.
- [ ] Ejecutar pruebas de efectos persistidos de los ocho Route Handlers en un proyecto aislado.
- [ ] Retirar Bearer interno solo si no existe consumidor externo documentado.
- [ ] Retirar `manage-delegate-account` Edge solo despues de comprobar cero trafico y rollback.
- [x] Eliminar definitivamente `api/_lib` y `api/` como fuentes activas.

Puerta M5:

- Los ocho Route Handlers pasan la matriz HTTP, CSRF, cache y autorizacion.
- Los dos scanners Edge pasan smoke tests desde Preview.
- Ningun consumidor frontend de los siete paths originales necesita cambiar su URL.
- No existe acceso a service role desde cliente.
- No quedan bypass DEV, fallback no-JSON ni implementaciones duplicadas.

Estado local al 2026-07-26: la implementacion principal y el hardening local de
M5 estan en curso avanzado. Los ocho Route Handlers compilan y sus contratos
locales cubren Bearer/cookie, CSRF por `Origin`, cache privada, request ID,
errores saneados y roles. `manage-delegate-account` ya tiene Route Handler y su
consumidor usa `/api/delegates/account`; la Edge Function se conserva solo como
rollback. Quedan pendientes las pruebas persistidas en un proyecto aislado, la
compensacion completa de operaciones multi-sistema, medicion, rate limiting de
scanners, Preview y el retiro basado en trafico de Bearer/Edge. Ver
`docs/migration-evidence/m5/progress.md`.

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

- [x] Crear pages y limites nativos para las rutas publicas.
- [x] Sustituir Links de React Router por navegacion web compatible con Next y el rollback Vite.
- [x] Pasar params como props donde sea posible.
- [x] Implementar metadata y Open Graph publicos.
- [x] Probar por contrato error, cancelacion y exito del login Google.
- [x] Probar por contrato retorno a `/configuracion` al vincular identidad Google.
- [x] Definir loading de datos, error y not-found.
- [x] Retirar estas rutas del catch-all legacy convirtiendolo en `[...legacyPath]`.

Puerta M6:

- Todas funcionan con JS deshabilitado al nivel que corresponda.
- Acceso directo y recarga conservan comportamiento.
- Invitaciones invalidas y expiradas mantienen su feedback.

Estado local al 2026-07-26: `/`, `/landing`, `/login`,
`/share/standings/[torneoId]`, `/invitation/[token]` y
`/delegate/invitation/[token]` son rutas explicitas de App Router.
Tabla publica e invitaciones reciben su lectura inicial desde el servidor con
el cliente Supabase publico; no usan service role. El HTML util sin JavaScript,
acceso directo, recarga, hidratacion y responsive pasaron 39 E2E en Chromium,
mobile Chromium y WebKit. El callback PKCE ya era nativo y sus contratos cubren
exito, cancelacion, errores y retorno interno. Preview, OAuth real hospedado y
una invitacion valida desechable quedan como validacion de rollout. Ver
`docs/migration-evidence/m6/progress.md`.

### M7. Shell privado y rutas simples

Estimacion: 3 a 5 dias.

- [x] Crear layout privado con Sidebar.
- [x] Migrar estado activo de Sidebar con `usePathname`.
- [x] Migrar `/dashboard`.
- [x] Migrar `/partidos`.
- [x] Migrar `/configuracion`.
- [x] Migrar `/liga` y `/liga/[tab]`.
- [x] Migrar `/admin/managers`.
- [x] Sustituir redirects cliente por redirects servidor cuando aplique.
- [x] Eliminar `React.lazy` de AdminManagers.
- [x] Retirar rutas migradas del catch-all.

Puerta M7:

- Shell conserva estado y responsive behavior.
- Roles y redirects coinciden con el contrato.
- Back/forward y refresh funcionan.

Estado local al 2026-07-27: las seis rutas privadas simples son paginas
explicitas de App Router y usan un shell compartido con Sidebar, `usePathname`
y guardas SSR por rol. Manager, Admin y Delegado pasaron autenticacion real,
recarga, permisos, salida y lecturas sin mutaciones de negocio. El menu movil
paso a 390 x 844 y el historial Dashboard/Partidos paso atras y adelante. Los
gates finales reportan lint 0/0, 95 Node, 53 Edge, 21 Next/Auth, build Next,
45 E2E en Chromium/mobile/WebKit y build Vite. El Preview hospedado queda como
validacion de rollout. Ver `docs/migration-evidence/m7/progress.md`.

### M8. Equipos

Estimacion: 4 a 7 dias.

- [x] Migrar rutas legacy `/equipos`.
- [x] Migrar rutas canonicas por division.
- [x] Pasar `divisionId` y `teamId` desde App Router.
- [x] Conservar `teamId = crear`.
- [x] Sustituir `location.state.initialView` por `?view=`.
- [x] Preservar `view` al canonizar una ruta legacy y eliminarlo al cerrar detalle.
- [x] Conservar que delegate permanezca en legacy y manager/admin canonice a la division seleccionada.
- [x] Hidratar la division persistida sin flash ni redirect a una division incorrecta.
- [x] Sustituir `preventScrollReset`.
- [x] Probar modal de detalle, alta, edicion, transferencia y delegados sin enviar mutaciones a produccion.
- [x] Probar rutas de manager y delegate por separado.
- [x] Retirar rutas de equipos del catch-all.

Puerta M8:

- Cualquier vista de equipo importante tiene URL recargable y compartible.
- No hay diferencias funcionales entre ruta legacy y canonica.

Estado M8 (2026-07-27): completa localmente. Las cuatro rutas explicitas ya
usan App Router con guard SSR, validacion de segmentos y adaptador de
navegacion Next. Manager y delegate pasaron smoke real de rutas; los modales
de detalle, alta, edicion, transferencia y solicitudes se abrieron y cerraron
sin enviar formularios. Los gates reportan lint 0/0, 98 Node, 53 Edge, 21
Next/Auth, build Next, 51 E2E en Chromium/mobile/WebKit y build Vite. Las
mutaciones con fixtures desechables y el Preview hospedado quedan como
validacion de rollout. Ver `docs/migration-evidence/m8/progress.md`.

### M9. Torneos y jornadas

Estimacion: 6 a 10 dias.

- [x] Crear un helper puro y probado `parseTournamentRoute`.
- [x] Crear paginas explicitas de cero a tres segmentos para rutas legacy.
- [x] Crear la misma expansion explicita bajo `division/[divisionId]`.
- [x] Delegar todas las paginas en un unico adaptador cliente `NativeTournamentsPage`.
- [x] Conservar torneo, tab y jornada en URL.
- [x] Validar que jornada solo tenga significado bajo el tab `jornadas`.
- [x] Canonizar division, torneo activo y tab exactamente como la aplicacion actual.
- [x] Al cambiar division, conservar tab y descartar torneo/jornada.
- [x] Migrar navegacion de `TorneosTemplate`.
- [x] Migrar navegacion de `TorneoJornadasTab`.
- [x] Migrar definicion, standings, goleadores y jornadas a las rutas nativas.
- [ ] Probar fixture, planificacion, resultados y playoffs.
- [ ] Probar escaneo de rol y cedula.
- [ ] Probar exports de calendario, standings, cedulas y resumen.
- [x] Retirar rutas de torneos del catch-all.

Puerta M9:

- Todas las combinaciones validas de URL abren la misma vista antes y despues.
- Escaneos, planificacion, resultados y exports pasan pruebas.
- El catch-all legacy ya no recibe ninguna ruta funcional.

Estado M9 (2026-07-27): completa localmente en routing. Ocho paginas
explicitas cubren las rutas legacy y canonicas, con helper puro, guard SSR,
adaptador Next y sincronizacion de torneo, tab y jornada en URL. El smoke real
de Manager paso para el estado sin torneo activo en sus cuatro divisiones y no
ejecuto mutaciones de negocio. Los gates confirmados reportan lint 0/0, 102
Node, 53 Edge, 21 Next/Auth/API, build Next, build Vite y 57 E2E. El build Vite
final paso despues del patch de `AuthStore` con 1026 modulos en
aproximadamente 39 segundos; solo emitio los warnings conocidos de OpenCV y
chunks grandes. El reset de `DivisionStore` entre roles quedo confirmado:
Manager salio desde
`/division/94/torneos/definir`; Admin abrio `/torneos` sin heredar division ni
mostrar `División no encontrada`, y tras recarga canonizo a
`/torneos/definir` conservando el estado sin division. Ambas sesiones cerraron
sin mutaciones de negocio. Preview hospedado y flujos con torneo activo,
escaneos y exports quedan pendientes sobre fixtures aislados. Ver
`docs/migration-evidence/m9/progress.md`.

### M10. Browser-only, rendimiento e hidratacion

Estimacion: 3 a 5 dias.

- [x] Revalidar los 64 archivos browser-sensitive del inventario.
- [x] Marcar puntos de entrada interactivos con `"use client"`.
- [x] Corregir inicializadores `localStorage` sin guard en `useTorneosLogic`.
- [x] Mover `window.location.origin` fuera del render de TeamForm y DelegateInviteModal.
- [x] Eliminar `window.innerWidth` del render inicial de TorneoDashboard.
- [x] Revisar `Date.now()` inicial en vistas con countdown para evitar mismatch.
- [x] Cargar PaddleOCR de forma diferida cuando el usuario inicia un escaneo.
- [x] Aislar `@imgly/background-removal`.
- [x] Convertir imports estaticos de `@imgly/background-removal` y `html-to-image` en cargas cliente diferidas.
- [x] Aislar canvas, workers, portales, `html-to-image` y `jspdf`.
- [x] Mover accesos a `localStorage` fuera de inicializacion de servidor.
- [x] Corregir diferencias de hidratacion.
- [x] Analizar bundle por ruta.
- [x] Comparar metricas con baseline.
- [x] Instrumentar errores cliente/servidor, Web Vitals, request IDs y latencia de API.
- [x] Verificar movil, escritorio y reduced motion.

Puerta M10:

- Cero errores o warnings de hidratacion.
- Cero `window is not defined`.
- Ninguna ruta carga OCR/PDF si no lo necesita.
- No hay regresion superior al 10% en las metricas acordadas frente al baseline.

M10 quedo completada localmente el 2026-07-27. El inventario evoluciono a 73
archivos browser-sensitive y no conserva inicializadores de estado que lean
directamente `window`, storage o `Date.now()`. PaddleOCR, IMG.LY,
`html-to-image` y jsPDF quedaron fuera de los grafos iniciales auditados. El
shell de Torneos redujo 59.5% su gzip frente al baseline; incluso el tab mas
pesado, Jornadas, redujo 27.0%. Landing redujo aproximadamente 33.6% y Equipos
7.7%. Se agregaron buffers locales para Web Vitals y errores cliente,
`Server-Timing`/request IDs en Route Handlers y pruebas reales de TTFB. La
validacion movil encontro y corrigio el menu no funcional de Landing con
estado accesible y cierre por Escape. Los gates finales reportan lint 0/0,
102 Node, 53 Edge, 21 Next/Auth/API, build Next, build Vite y 60 E2E. La
telemetria externa, Preview y el adelgazamiento de traces server quedan para
M11. Ver `docs/migration-evidence/m10/progress.md`.

### M11. Corte, limpieza y observacion

Estimacion: 2 a 4 dias mas ventana de observacion.

- [x] Ejecutar el conjunto completo de gates locales de `verify`.
- [ ] Desplegar Preview con entorno aislado.
- [ ] Ejecutar E2E y contratos contra Preview.
- [ ] Ejecutar smoke manual de flujos criticos.
- [ ] Confirmar proyecto, rama de produccion, dominio, runtime y variables reales de Vercel.
- [x] Verificar que el rewrite SPA fue retirado desde M2.
- [x] Eliminar `react-router-dom`.
- [x] Eliminar `src/main.jsx`.
- [x] Eliminar `src/routes` y `src/router.jsx`.
- [x] Eliminar `index.html`.
- [x] Eliminar `vite.config.js`.
- [x] Eliminar Vite, plugin React Vite, plugin Tailwind Vite y React Refresh.
- [x] Eliminar catch-all de compatibilidad.
- [x] Ejecutar busquedas de residuos.
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

Estado local al 2026-07-27: el corte de framework esta completo y verificado.
React Router DOM, Vite, Fast Refresh, el arranque SPA, el catch-all y sus
archivos puente ya no existen en codigo, scripts, dependencias ni lockfile. Una
ruta desconocida devuelve el 404 raiz de la aplicacion. Pasaron lint estricto,
102 Node, 53 Edge, 21 Next/Auth/API, build Next y 63 E2E en Chromium, WebKit y
Chromium movil. Preview, smoke funcional aislado, telemetria externa,
canary/alias, rollback ensayado y produccion siguen pendientes. Los providers y
adaptadores cliente Next se movieron a `src/components/app`; `src/legacy` ya no
existe. Solo se conserva la migracion puntual `legacySession*` para convertir
sesiones antiguas de local storage a cookies SSR. El trace de Torneos bajo de
24.50 MB a 3.20 MB y ya no contiene Paddle, ONNX ni jsPDF. Ver
`docs/migration-evidence/m11/progress.md`.

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
- [x] Lint termina con cero errores y cero warnings.
- [x] Pasan al menos 63 pruebas Node y 48 pruebas Deno.
- [x] `next build` termina con codigo 0.
- [ ] Pasan las 68 expectativas ruta/rol y E2E en tres navegadores.
- [ ] Los ocho Route Handlers pasan contratos y efectos persistidos.
- [ ] Los dos scanners Edge pasan smoke tests desde la app Next.
- [ ] Todas las URLs de la seccion 6 pasan acceso directo y recarga.
- [x] No existe `react-router-dom` en codigo ni dependencias.
- [x] No existe Vite en scripts, dependencias o configuracion.
- [x] No existe el directorio legacy `api/`.
- [x] No existe el rewrite global hacia `index.html`.
- [x] No existe capa catch-all legacy.
- [x] No existe `import.meta.env`.
- [ ] Ningun secreto privado aparece en bundles o respuestas.
- [x] Respuestas privadas son `private, no-store` y pasan aislamiento entre usuarios.
- [x] Mutaciones por cookie pasan la prueba CSRF.
- [x] Auth usa cookies SSR y verificacion de identidad segura.
- [x] Roles se validan en servidor y no solo en UI.
- [x] No hay errores de hidratacion.
- [x] E2E no registra `pageerror` ni 5xx inesperados.
- [x] Rutas ajenas a OCR/PDF no descargan sus bundles pesados.
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
| M0 | `0c08368` | Aplicacion Vite local | build, lint, 63 Node, capturas 8 viewports | COMPLETADA; ver `docs/migration-evidence/m0/baseline.md` | 2026-07-25 |
| M1 | Sin commit aun | Artefacto Vite local | npm ci, lint 0/0, 74 Node, 53 Deno, 16 contratos, build, 12 E2E, Supabase 28/28 | EN CURSO; faltan snapshot/reset y fixtures aislados en un runtime compatible; ver `docs/migration-evidence/m1/progress.md` | 2026-07-25 |
| M2 | Sin commit aun | Host Next local | lint, 74 Node, 53 Deno, contratos, Next/Vite build, 12 E2E | COMPLETADA LOCAL; ver `docs/migration-evidence/m2/progress.md` | 2026-07-25 |
| M3 | Sin commit aun | Host Next local | lint, 77 Node, 53 Deno, contratos, Next/Vite build, bundle scan, 12 E2E | COMPLETADA LOCAL; ver `docs/migration-evidence/m3/progress.md` | 2026-07-25 |
| M4 | Sin commit aun | Host Next SSR local | login real de 3 roles, lint, 87 Node, 15 Next/Auth, 53 Edge, Next/Vite build, bundle scan, 21 E2E | COMPLETA LOCALMENTE; rollout aislado/allowlist/layouts pendientes; ver `docs/migration-evidence/m4/progress.md` | 2026-07-26 |
| M5 | Sin commit aun | Host Next local | lint, 95 Node, 53 Edge, 21 Next/Auth, Next/Vite build, contratos API | HARDENING LOCAL IMPLEMENTADO; efectos aislados, metricas, rate limits y rollout pendientes; ver `docs/migration-evidence/m5/progress.md` | 2026-07-26 |
| M6 | Sin commit aun | Host Next local | lint, 95 Node, 21 Next/Auth, Next/Vite build, 39 E2E | COMPLETA LOCALMENTE; rollout pendiente; ver `docs/migration-evidence/m6/progress.md` | 2026-07-26 |
| M7 | Sin commit aun | Host Next local | 3 roles reales, lint, 95 Node, 53 Edge, 21 Next/Auth, Next/Vite build, 45 E2E | COMPLETA LOCALMENTE; rollout pendiente; ver `docs/migration-evidence/m7/progress.md` | 2026-07-27 |
| M8 | Sin commit aun | Host Next local | 2 roles reales, lint, 98 Node, 53 Edge, 21 Next/Auth, Next/Vite build, 51 E2E | COMPLETA LOCALMENTE; mutaciones aisladas/rollout pendientes; ver `docs/migration-evidence/m8/progress.md` | 2026-07-27 |
| M9 | Sin commit aun | Host Next local | Manager real sin torneo activo en 4 divisiones; reset Manager/Admin confirmado; lint, 102 Node, 53 Edge, 21 Next/Auth/API, Next/Vite build, 57 E2E | COMPLETA LOCALMENTE EN ROUTING; Preview hospedado y flujos con torneo activo/exports aislados pendientes; ver `docs/migration-evidence/m9/progress.md` | 2026-07-27 |
| M10 | Sin commit aun | Host Next local | lint, 102 Node, 53 Edge, 21 Next/Auth/API, Next/Vite build, bundle audit, Web Vitals/errores, desktop/mobile/reduced motion, 60 E2E | COMPLETA LOCALMENTE; Preview, telemetria externa y server traces pendientes; ver `docs/migration-evidence/m10/progress.md` | 2026-07-27 |
| M11 | Sin commit aun | Host Next local | lockfile offline, residuos, refactor providers, traces, lint, 102 Node, 53 Edge, 21 Next/Auth/API, build Next, 63 E2E, 404 real | CORTE LOCAL VERIFICADO; rollout/observacion pendientes; ver `docs/migration-evidence/m11/progress.md` | 2026-07-27 |

## 17. Referencias tecnicas

- Migracion oficial desde Vite: <https://nextjs.org/docs/pages/guides/migrating/from-vite>
- App Router: <https://nextjs.org/docs/app>
- Server y Client Components: <https://nextjs.org/docs/app/getting-started/server-and-client-components>
- Route Handlers: <https://nextjs.org/docs/app/getting-started/route-handlers>
- Styled Components: <https://nextjs.org/docs/app/guides/css-in-js>
- Supabase SSR: <https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs>
- Limites de Vercel Functions: <https://vercel.com/docs/functions/limitations>
