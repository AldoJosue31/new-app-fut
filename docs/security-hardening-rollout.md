# Endurecimiento de Supabase, RLS y CORS

## Contrato de acceso

| Recurso | Anonimo | Usuario autenticado activo | Service role |
| --- | --- | --- | --- |
| Pagina publica de torneo | RPC `get_public_tournament_bundle` | Mismo RPC | Acceso interno |
| Tablas de liga, division y competencia | Sin privilegios de tabla | Solo ligas administradas o delegadas | Acceso completo |
| Tablas sensibles | Sin privilegios de tabla | RLS existente por rol, liga, equipo o identidad | Acceso completo |
| Bucket `logos` | Lectura del bucket publico | Escritura limitada por ruta y RLS | Acceso interno |
| Escaneres OCR | No permitido | JWT activo y cuota por usuario | No es un flujo de usuario |

La migracion `20260731120000_harden_public_access_and_edge_rate_limits.sql`
mantiene intactos los permisos DML de `authenticated`. Solo elimina la lectura
anonima directa y sustituye las lecturas publicas incondicionales por alcance de
liga. Esto evita cambiar las operaciones de administradores y delegados.

## Configuracion Edge

Definir estos secretos antes de desplegar las funciones:

```text
EDGE_ALLOWED_ORIGINS=https://preview-estable.example,https://app.example,http://localhost:3000
EDGE_RATE_LIMIT_MODE=shadow
```

`EDGE_ALLOWED_ORIGINS` acepta origenes exactos separados por comas. Si el
frontend local invoca las Edge Functions remotas, los origenes locales que se
usen en los puertos 3000, 4173 y 5173 deben agregarse al mismo secreto. El valor
`*` existe solo como rollback de emergencia; no debe quedar en produccion.

Los limites de ventana fija son:

- `procesar-cedula`: 20 solicitudes por usuario activo cada 10 minutos.
- `procesar-rol-juego`: 10 solicitudes por usuario activo cada 10 minutos.

`shadow` registra fallas y excesos sin interrumpir escaneos. `enforce` devuelve
429 con `Retry-After`. `off` omite temporalmente el contador y se reserva para
rollback.

## Orden de despliegue

1. Crear o reutilizar una rama Supabase aislada.
2. Aplicar la migracion y ejecutar `supabase/tests/security_access_matrix.sql`.
3. Probar como admin, manager y delegate: dashboard, equipos, jugadores,
   torneos, jornadas, resultados y exportaciones.
4. Probar como anonimo un torneo publico y uno privado mediante el RPC. Confirmar
   que las consultas REST directas a tablas respondan 401/403.
5. Configurar un alias Preview estable en `EDGE_ALLOWED_ORIGINS` y desplegar las
   tres Edge Functions con `verify_jwt = true`.
6. Mantener `EDGE_RATE_LIMIT_MODE=shadow` durante el canary y revisar 401, 403,
   429, 5xx, latencia y volumen de llamadas.
7. Cambiar a `enforce`; despues aplicar la migracion y las funciones al proyecto
   activo.
8. Ejecutar los asesores de seguridad y rendimiento de Supabase.

## Rollback sin reabrir datos anonimos

- Limitador: cambiar `EDGE_RATE_LIMIT_MODE=off` y conservar JWT obligatorio.
- CORS: agregar temporalmente el origen faltante. Usar `*` solo si el incidente
  impide identificar el origen y retirarlo inmediatamente despues.
- Lecturas autenticadas: aplicar
  `supabase/rollback/20260731120000_authenticated_compatibility_read.sql`. Este
  rollback abre lectura entre usuarios autenticados, pero nunca restaura acceso
  anonimo a tablas base.
- Acceso publico: no requiere rollback de tablas; permanece en el RPC seguro.

## Retiro de la funcion heredada

`manage-delegate-account` se mantiene como artefacto de rollback mientras tenga
trafico. No debe eliminarse hasta observar cero invocaciones funcionales durante
una ventana acordada y comprobar que `/api/delegates/account` conserva cambios
de Auth, auditoria y notificaciones. Mientras exista, comparte la misma lista
CORS exacta y conserva `verify_jwt = true`.
