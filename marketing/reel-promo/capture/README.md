# Capturador de Bracket App

Saca capturas animables de la app real con datos ficticios, sin tocar Supabase de producción.

## Cómo funciona

1. `mock-supabase.mjs` es un Supabase falso en `127.0.0.1:54399`: PostgREST (select con relaciones, filtros,
   orden, conteo y escrituras en memoria), RPC (`rpc.mjs`), Auth con sesiones demo, Storage y Edge Functions.
   Los datos salen de `seed.mjs` (liga, 16 equipos, plantillas, jornadas, resultados y goles ficticios).
   Escenarios: `temporada` (jornada 8 en curso) y `liguilla` (fase regular terminada).
2. La app corre con `next dev` en `127.0.0.1:4180` apuntando al Supabase falso.
3. `shots.mjs` recorre cada bloque con Playwright (organizador, delegado o anónimo), en escritorio y móvil,
   tema oscuro, con Poppins cargada desde `public/fonts/poppins`.
4. `snapshot.mjs` guarda cada estado (`.html`, `.css`, `.png`, `.json`, `piezas/`) en `../capturas/`.
5. `to-hyperframes.mjs` convierte un estado en una escena de HyperFrames.

## Volver a capturar

```powershell
node marketing/reel-promo/capture/mock-supabase.mjs
```

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54399"; $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="demo-anon-key"; $env:SUPABASE_SERVICE_ROLE_KEY="demo-service-key"; node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 4180
```

```powershell
node marketing/reel-promo/capture/shots.mjs
```

```powershell
node marketing/reel-promo/capture/build-index.mjs
```

Una sola toma o un solo dispositivo: `node marketing/reel-promo/capture/shots.mjs 04-resultado --device=mobile`.

Comprobar que el HTML congelado se ve igual que la app: `node marketing/reel-promo/capture/verify.mjs` y luego
`python marketing/reel-promo/capture/compare.py`.
