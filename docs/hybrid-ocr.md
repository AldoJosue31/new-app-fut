# Escaneo hibrido de roles y cedulas

Esta version separa la extraccion visual de la validacion del dominio. El OCR es una pista no confiable; solamente los participantes, planteles y reglas del torneo determinan que datos se pueden aplicar.

## Flujo y responsabilidades

1. React prepara la imagen y, cuando el navegador lo permite, ejecuta OCR local.
2. El cliente envia la imagen, el contexto registrado y opcionalmente `clientOcr` a la Edge Function.
3. La Edge Function sanitiza y limita `clientOcr`; nunca confia en IDs ni decisiones enviadas por el navegador.
4. Si el resultado local satisface las reglas deterministas del documento, se devuelve sin llamar a Gemini.
5. Si falta informacion o hay ambiguedad, se usa Gemini como respaldo semantico. Vision se consulta antes solamente cuando la politica de la funcion se cambia de forma explicita a `auto` o `google-vision`.
6. El usuario confirma el resultado antes de guardarlo. La fecha y hora detectadas siguen siendo opcionales.

Supabase Edge se mantiene como capa de autenticacion, validacion, cache y orquestacion. Los modelos OCR pesados no se ejecutan dentro de la funcion.

## Contrato comun de OCR

`clientOcr` y el adaptador de Vision usan el mismo formato:

```json
{
  "provider": "client",
  "text": "texto completo",
  "confidence": 0.91,
  "lines": [
    {
      "text": "Tigres vs Leones",
      "confidence": 0.94,
      "boundingBox": { "x": 0.12, "y": 0.24, "width": 0.34, "height": 0.03 }
    }
  ]
}
```

Las coordenadas estan normalizadas entre `0` y `1`. El servidor limita cantidad y longitud de lineas, elimina caracteres de control y recalcula cualquier decision de dominio.

La respuesta de las funciones conserva `scan` para no romper clientes existentes y agrega trazabilidad:

```json
{
  "scan": {},
  "scanMeta": {
    "provider": "client",
    "fallbackUsed": false,
    "confidence": 0.91
  }
}
```

`provider` indica quien produjo la evidencia usada para el resultado, no quien envio la solicitud. La interfaz no debe interpretar `confidence` como autorizacion para guardar sin confirmacion.

## Reglas de seguridad por documento

### Roles de juego

El OCR local puede evitar Gemini solamente cuando el parser encuentra la jornada completa y `selectScheduleForDivision` confirma:

- el cliente declara `complete=true`, `noSharedSourceLines=true` y una confianza minima por pareja igual o mayor al umbral del servidor;
- ambos equipos de cada cruce corresponden de forma unica a participantes de la division;
- ningun participante aparece dos veces en la jornada;
- la cantidad de cruces coincide con la esperada;
- si el numero de equipos es impar, existe exactamente un descanso valido, detectado o inferido;
- las filas de otras divisiones fueron descartadas.

Fecha y hora pueden quedar vacias sin invalidar los cruces. Nunca se inventan y siguen sujetas a confirmacion del usuario.

### Cedulas

La escritura manual no se acepta solo por la confianza global del OCR. El contrato para OCR cliente de cedulas queda preparado, pero el frontend actual todavia no lo produce: por ahora las cedulas siguen usando Gemini. Cuando se conecte un productor local, solo una cedula declarada completa y exacta podra evitar Gemini; una lectura parcial sera unicamente una pista para el respaldo remoto. Cada asignacion de jugador debera coincidir exactamente con el plantel registrado.

Reglas conservadoras:

- si ningun nombre coincide, se conserva el marcador del equipo y los goles quedan sin asignar;
- si dos jugadores son candidatos casi iguales, no se elige ninguno automaticamente;
- el marcador nunca se recalcula silenciosamente a partir de jugadores;
- una discrepancia entre marcador y eventos conserva la decision explicita ya existente en la interfaz;
- un `W.O.` solo se aplica si la evidencia y el equipo ausente son inequivocos;
- fecha, hora y arbitro pueden quedar sin aplicar sin invalidar el marcador.

Por lo anterior, la ruta local reduce llamadas principalmente en roles impresos. En cedulas manuscritas, Vision o Gemini seguiran siendo necesarios con mayor frecuencia; eso es una medida de precision, no un fallo del sistema.

## Configuracion

Los secretos se configuran en Supabase, nunca como variables `VITE_*` ni dentro del repositorio:

```powershell
npx supabase secrets set GOOGLE_CLOUD_VISION_API_KEY=valor
```

Variables de las funciones:

| Variable | Valores | Uso |
| --- | --- | --- |
| `CEDULA_OCR_PROVIDER` | `client-only`, `auto`, `google-vision`, `gemini`, `disabled` | Seleccion para cedulas; predeterminado `client-only` |
| `ROL_JUEGO_OCR_PROVIDER` | `client-only`, `auto`, `google-vision`, `gemini`, `disabled` | Seleccion para roles; predeterminado `client-only` |
| `GOOGLE_CLOUD_VISION_API_KEY` | secreto | Habilita Vision en modo `auto` |
| `GOOGLE_CLOUD_VISION_TIMEOUT_MS` | milisegundos | Tiempo maximo de Vision; el servidor limita valores extremos |
| `GOOGLE_CLOUD_VISION_PARENT` | `projects/ID/locations/us` o `eu` | Fija residencia regional opcional |
| `ROL_JUEGO_CLIENT_OCR_MIN_CONFIDENCE` | numero de `0.76` a `0.99` | Umbral del rol local; predeterminado `0.76`, solo puede endurecerse |
| `GEMINI_API_KEY` | secreto | Respaldo semantico existente |

Modos recomendados:

- `client-only` (predeterminado): usa OCR local valido y pasa directamente a Gemini cuando queda incompleto; no duplica llamadas remotas.
- `auto`: prioriza cualquier `clientOcr` recibido; si no existe, usa Vision cuando hay clave. Gemini interpreta despues los campos que no superen la validacion determinista. No se llama a Vision despues de una lectura cliente parcial para evitar duplicar OCR remoto.
- `google-vision`: usa Vision cuando no existe OCR local; Gemini interpreta los campos que la salida documental no puede validar por si sola.
- `gemini`: comportamiento remoto anterior, util para comparar precision.
- `disabled`: desactiva la capa OCR previa y conserva el respaldo Gemini.

Antes de desplegar, comprobar en un proyecto de prueba que la API de Vision este habilitada, la clave este restringida a esa API y las funciones conserven autenticacion. No usar `service_role` en React.

PaddleOCR descarga por defecto sus pesos desde `paddle-model-ecology.bj.bcebos.com` la primera vez que se usa el escaner local. Para produccion conviene copiar los archivos `.tar` versionados a infraestructura propia y configurar `textDetectionModelAsset` y `textRecognitionModelAsset`; asi se controla disponibilidad, cache y procedencia de los modelos. Los pesos no se incluyen en este repositorio.

## Benchmark reproducible

Las imagenes y anotaciones pueden contener datos personales. Guardar el conjunto fuera del repositorio, anonimizar cuando sea posible y no registrar texto OCR completo en logs de produccion.

El script admite JSON o JSONL. Cada muestra compara solamente las propiedades presentes en `expected`, de modo que se pueden anotar campos gradualmente:

```json
{
  "id": "rol-001",
  "type": "rol",
  "expected": {
    "matches": [
      { "localTeamId": "12", "visitorTeamId": "18", "date": "2026-07-13", "time": "19:00" }
    ],
    "byeTeamId": "7"
  },
  "actual": {
    "matches": [
      { "localTeamId": "12", "visitorTeamId": "18", "date": "2026-07-13", "time": "19:00" }
    ],
    "byeTeamId": "7"
  },
  "meta": { "provider": "client", "fallbackUsed": false, "durationMs": 840 }
}
```

Ejecutar:

```powershell
node scripts/benchmark-hybrid-ocr.mjs C:\ruta-privada\dataset.jsonl
node scripts/benchmark-hybrid-ocr.mjs C:\ruta-privada\dataset.jsonl --json
```

El reporte muestra:

- tasa de solicitudes con respuesta;
- documentos completamente correctos;
- precision de campos escalares;
- precision, recall y F1 de colecciones como partidos o jugadores;
- uso de fallback y distribucion por proveedor y pipeline (`google-vision->gemini`, por ejemplo);
- latencias p50 y p95.

### Conjunto minimo y criterio de salida

Usar fotografias reales de varios telefonos, iluminacion, inclinacion y resolucion. Separar al menos estos grupos:

- roles de una y varias divisiones;
- roles con fecha/hora parcial y equipos en descanso;
- cedulas impresas;
- cedulas manuscritas legibles y dificiles;
- marcadores discrepantes, jugadores no registrados y `W.O.`.

Comparar `gemini`, `google-vision` y `auto` sobre exactamente las mismas imagenes. El cambio se acepta cuando no aumenta las asignaciones falsas de equipos o jugadores, mantiene las reglas de marcador y fixture, reduce el porcentaje de llamadas a Gemini y mejora o conserva la latencia p95. La tasa de fallback no debe reducirse a costa de aceptar documentos ambiguos.

## Pruebas locales

```powershell
node --test tests/*.test.js
deno test supabase/functions/_shared/documentOcr_test.ts supabase/functions/procesar-cedula/*_test.ts supabase/functions/procesar-rol-juego/*_test.ts
```

Las pruebas de Edge no necesitan claves reales: el adaptador HTTP debe recibir `fetch` inyectado y usar respuestas simuladas. Las verificaciones contra el proyecto remoto se ejecutan por separado con los scripts `verify-cedula-edge.mjs` y `verify-rol-juego-edge.mjs`.
