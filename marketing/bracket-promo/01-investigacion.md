# Investigación de Bracket

## Método y alcance

Se contrastaron las descripciones del producto con componentes, hooks, servicios, políticas de navegación, handlers de servidor y migraciones. Se ejecutaron pruebas existentes y se añadieron comprobaciones de lectura de interfaz únicamente en este directorio. No se modificó código funcional ni se accedió a cuentas personales para preparar material publicitario.

Referencia de código al investigar: commit `449f0f03b4dcf95e12e255e5873c5b1bcfc01da8`. El build local utilizado por las pruebas de navegador fue generado el 29 de octubre de 2026. Por tanto, las pruebas visuales acreditan ese build; la revisión estática corresponde al árbol de código encontrado durante esta tarea. No se presenta esto como una certificación de producción.

Niveles de evidencia utilizados:

- **Implementación:** recorrido de código que conecta una interfaz con lógica y persistencia, o con un cálculo real.
- **Prueba automatizada:** comportamiento ejecutado con fixtures o dependencias simuladas; no certifica un servidor desplegado.
- **Interfaz observada:** pantalla abierta e interacción comprobada en navegador con datos sintéticos.
- **Pendiente remoto:** dependencias y despliegue que no se ejecutaron contra una liga real.

## 1. Arquitectura y estructura

| Área | Implementación encontrada | Implicación para la campaña |
|---|---|---|
| Plataforma | Aplicación web; Next.js 16.2.12, React 19.2, App Router | Se puede mostrar como web adaptable a teléfono y escritorio; no afirmar que es una app nativa de App Store o Google Play |
| Rutas | `app/(public)` y `app/(private)`, páginas de servidor y clientes especializados | La navegación y los permisos forman parte del producto real |
| Presentación | `src/views`, `src/components/template`, organismos, moléculas y átomos | Recrear las composiciones y controles existentes; simplificar por encuadre |
| Lógica | Hooks de páginas, `usePlanificacionMatches`, `useFixturePreview`, lógica de clasificación y utilidades | Las interacciones deben respetar el orden de operaciones y sus validaciones |
| Estado | Zustand: autenticación, divisiones, equipos, jugadores, tema y layout; borradores locales de planificación | No confundir un borrador visible con una jornada confirmada |
| Datos | Supabase: Postgres, Auth, Storage, RPC; clientes de navegador y servidor; API Next.js | Las funcionalidades dependen de autorización y servicios; no prometer trabajo completo sin conexión |
| Procesamiento documental | Edge Functions para cédulas y rol de juego; OCR y proveedor de visión con manejo de errores | Representar lectura asistida y revisión, con el tiempo resumido identificado |
| Estilo | styled-components, Tailwind en el proyecto, Framer Motion para algunas vistas | Extraer recursos reales sin reestilizar la aplicación funcional |
| Exportaciones | html-to-image, utilidades de imagen y jsPDF | Mostrar el formato que implementa cada exportación; la tabla principal del anuncio se descarga como PNG |

El README aún corresponde a una plantilla React/Vite; no describe la arquitectura vigente. `package.json`, las rutas y el código ejecutable tienen prioridad sobre ese texto.

## 2. Pantallas y navegación

| Pantalla / ruta | Contenido comprobado en código | Uso propuesto |
|---|---|---|
| `/`, `/landing`, `/login` | Presentación comercial y acceso | Tomar identidad y nombre; no reutilizar afirmaciones comerciales sin verificar |
| `/dashboard` | Resúmenes para manager/admin | Referencia de contexto; prescindible para no convertir el anuncio en un recorrido de menús |
| `/liga/:tab` | Configuración, plantilla de reglas, divisiones y árbitros | Base del beneficio «Tu liga. Tus reglas» |
| `/division/:id/equipos` y detalle de equipo | Equipos, plantillas, gestión de jugadores, datos y solicitudes | Equipos reales como entidades de la historia; datos de demostración ficticios |
| `/division/:id/torneos/:id/definir` | Configuración, participantes, sorteo/fixture y panel del torneo | Arranque del flujo de A y estación inicial de C |
| `…/jornadas/:id/list` y `…/grid` | Programación, estados de jornada, resultados y partidos pendientes | Escena central de organización |
| `…/standings` | Clasificación, vista de cuadro cuando corresponde, exportación y acceso público | Consecuencia visible del resultado |
| `…/goleadores` | Estadísticas de anotadores y su exportación | Material para una futura variante centrada en participantes |
| `/share/standings/:id` | Consulta pública, limitada por la publicación habilitada | Beneficio para equipos y afición, sin atribuirles permisos de administración |
| `/admin/managers` | Administración de cuentas manager, límites y suspensión | Función interna; no priorizar en publicidad de adquisición |
| `/configuracion` | Cuenta y preferencias según rol | Fuera de la narrativa principal |
| `/partidos` | Estado «Próximamente» | Excluir; las escenas de partidos deben usar Jornadas |

Fuentes: `src/lib/navigation/routes.js`, `src/lib/auth/routeAccess.js`, `src/components/template/LigaTemplate.jsx`, `TorneosTemplate.jsx`, `EquiposTemplate.jsx`, `PartidosTemplate.jsx`, `src/views/PublicStandings.jsx`.

## 3. Funcionalidades reales y valor publicitario

| Función | Evidencia de implementación | Verificación en esta sesión | Beneficio comprensible y representación |
|---|---|---|---|
| Configurar liga, categorías/divisiones, reglas y árbitros | `useLigaLogic.js` consulta e inserta/actualiza entidades; `LigaTemplate` conecta los tabs y callbacks | Código; no alta remota | Organizar una liga según su estructura. Un selector de división y reglas reales cambian el contexto del torneo |
| Equipos y jugadores | `useEquiposLogic.js`, `EquiposStore.jsx`, `JugadoresStore.jsx`, `TeamForm`, `PlayerManager` | Código; contratos del delegado y estadísticas probados | Equipos y plantillas en un mismo flujo. Incorporar fichas al bloque «Equipos del Torneo» |
| Requisitos de participación | `useTorneosLogic.js` valida cupo, mínimo de jugadores y participantes | Código; no creación completa en servidor | El organizador decide quién participa. Mostrar inclusión y estado listo sin omitir validaciones |
| Crear torneo y fixture | `handleSubmit` llama `iniciarTorneoService`; se insertan torneo, jornadas y partidos. Algoritmo Round Robin y vuelta adicional en `fixtureAlgorithms.js` | Código; pruebas de fixture, edición y restricciones | Pasar de equipos registrados a enfrentamientos concretos. El sorteo distribuye cruces por jornada |
| Revisar y editar fixture | `useFixturePreview.js`, `FixturePreviewModal`, validadores y solver; bloqueo de jornadas confirmadas y revisión de conflictos | Pruebas de lógica | Mantener control sobre el calendario. Mostrar una revisión, no un supuesto «calendario perfecto sin intervención» |
| Programación en lista y grilla | `JornadaPlanificacion`, `ScheduledMatchRow`, `WeeklyGridView`, `guardarJornadaService` | Navegación y borradores observados y probados en escritorio/móvil | Saber cuándo se juega. Cambiar hora, alternar vista y confirmar en su estado correcto |
| Reposiciones y pendientes | Planificador, tarjetas de pendientes, utilidades y mutaciones dedicadas | Código; parte de lógica de planificación ejecutada | Continuidad cuando una jornada cambia. Buena variante posterior; no cabe como capítulo adicional en A |
| Ocupación de otras divisiones | Consulta de partidos externos y presentación en planificación | Pruebas de navegador aprobadas | Ver contexto de otras divisiones al programar; no afirmar que existe asignación automática de todas las canchas |
| Registrar resultados y eventos | `ResultModal` prepara goles, participación, tarjetas, penales/default cuando aplica; servicio RPC `save_match_result_atomic` y migración correspondiente | Modal observado; contratos/concurrencia probados; no guardado remoto | Convertir lo sucedido en información ordenada. Mostrar planteles, marcador, revisión y «Sí, guardar» |
| Cargar y conservar foto de cédula | `useMatchCedulaPhoto`, `CedulaPhotoFlow`, servicio de Storage y gestión de borrado | Código; entrada al flujo observada | Mantener una referencia documental asociada al resultado. Sin prometer archivo ilimitado |
| Escaneo asistido de cédula | `CedulaScanFlow` → `invokeCedulaScan` → Edge Function `procesar-cedula`; interpretación, revisión de equipos/jugadores/goles, «Aplicar escaneo» y guardado separado | Entrada de escaneo observada; matching, resolución de goles y cliente probados; proveedor remoto no invocado | Pasar de papel a datos revisables. Fotografía → interpretación → revisión → marcador. Incluir «Lectura resumida» durante el salto temporal |
| Importar rol de juego desde imagen | `RolJuegoScanFlow`, OCR local, Edge Function, matching y persistencia de horarios aceptados | Código; persistencia de horarios probada | Aprovechar programación existente. Tema atractivo para otro anuncio; no mezclar ambos tipos de escaneo en 60 s |
| Clasificación acumulada | `buildTorneoStandingsSnapshot`, hook de clasificación y `StandingsTable`; puntos/resultados, cortes por jornada y reposiciones | Interfaz observada y pruebas de resultados/clasificación aprobadas | Hacer visible lo que significa un resultado. Tras guardar, subir la fila del ganador con puntos coherentes |
| Goleadores y estadísticas por equipo/jugador | `estadisticas.js`, `GoleadoresTab`, resultados y rendimiento de equipo | Código; pruebas de estadísticas por torneo aprobadas | Dar visibilidad a la competición y sus jugadores. Futuro anuncio con nombre y goles de ejemplo identificados |
| Liguilla/repechaje y cuadro | `playoffUtils.js`, `PlayoffAdvanceModal`, `PlayoffBracketView`; `handleConfirmPlayoffAdvance` crea jornadas/partidos y persiste la fase | Código; no recorrido completo de eliminatorias ejecutado | Hacer entendible el camino a la siguiente fase. No usarlo como prueba principal hasta validar un caso completo |
| Exportar materiales de la competición | Modales de rol, tabla, goleadores y cédulas; tabla usa `exportElementAsPNG` y controles Post/Historia, temas, combinaciones y colores de liga | Exportador de tabla abierto en escritorio/móvil; preferencias probadas; descarga no ejecutada | Comunicar con presentación cuidada. Elegir «Historia (9:16)» y visualizar la composición real |
| Compartir consulta pública | Toggle actualiza `is_public`; copia `/share/standings/:id`; loader llama `get_public_tournament_bundle`; SQL bloquea si no está publicado | Código UI/servidor/SQL; publicación y apertura pública válida pendientes remotas | Los equipos pueden consultar la tabla habilitada por el organizador. Mostrar habilitar → copiar → consultar; no simular publicación directa en redes |
| Delegados con alcance limitado | Invitación/vínculo de equipo, APIs de torneo y cuenta, solicitudes y revisión por manager según configuración | Código; pruebas de autorización y contrato con dependencias simuladas | Repartir tareas conservando control. Variante posterior con solicitudes de plantilla, sin dar permisos ficticios a jugadores |
| Pronósticos del delegado | Modelo estadístico `tournamentForecast.js`, API protegida y `DelegateForecastSection` | Código; presentación de probabilidades probada; predicciones no validadas contra temporada real | Es una estimación, no una promesa. Excluir de esta campaña para evitar porcentajes llamativos sin contexto |

Los nombres de archivo abreviados de la tabla se ubican en `src/hooks`, `src/components`, `src/services`, `src/utils`, `src/server` y `supabase` conforme al inventario del proyecto. El snapshot de recursos registra rutas exactas de los archivos centrales.

## 4. Roles: qué puede hacer cada persona

| Rol | Alcance real encontrado | Ángulo publicitario |
|---|---|---|
| Manager / organizador | Configura su liga; divisiones y árbitros; equipos, plantillas, torneos, programación, resultados y publicación. El workspace se consulta por propiedad de la liga | «Tú haces que la liga funcione». Público principal de A y B |
| Admin | Acceso por políticas a módulos administrativos y gestión de managers: creación, credenciales, límites, suspensión y borrado | Beneficio de operación interna, secundario para esta campaña. El acceso a una ruta no demuestra acceso irrestricto a todas las ligas |
| Delegado | Equipos asignados, gestión/solicitudes sobre equipo y jugadores, estadísticas y torneo del equipo; pronósticos con autorización. Algunos cambios requieren aprobación del manager según la liga | «Tu equipo tiene un lugar para consultar y gestionar lo que le corresponde». No mostrar al delegado editando el torneo |
| Público / participante sin cuenta de delegado | Consulta del torneo publicado por el enlace público; visibilidad de goleadores condicionada por la configuración | «Consulta la competición que organiza tu liga». No inventar cuentas o funciones individuales de jugador |

## 5. Prioridad de beneficios

| Prioridad | Audiencia | Beneficio que promocionamos | Por qué interesa | Prueba visual |
|---|---|---|---|---|
| 1 | Organizadores | Conectar reglas, equipos y jornada | Evita tener que reconstruir el contexto entre herramientas distintas; no cuantificamos ahorro | Los mismos equipos pasan de participantes a cruces y horario |
| 2 | Managers | Registrar con revisión y control | El día de partido necesita decisiones claras y confirmaciones | Cédula, datos interpretados, revisión de marcador y guardado |
| 3 | Organizadores y equipos | Dar al resultado una presentación compartible | El trabajo administrativo se vuelve información útil para la competición | Tabla actualizada y exportación Historia |
| 4 | Participantes y afición | Consultar la tabla que la liga publica | Facilita encontrar información de la competición | Control Público/Privado y vista pública como destino de consulta |
| 5 | Managers y delegados | Colaborar con permisos y revisión | Distribuye responsabilidades | Invitación y solicitud revisada; reservar para segunda campaña |

La diferencia defendible frente a hojas y mensajes es **la conexión del flujo y sus estados**, más la lectura asistida de documentos y las salidas visuales. No se afirma exclusividad frente a competidores ni superioridad probada.

## 6. Afirmaciones descartadas

- Cifras de usuarios, ahorro de tiempo, ingresos, eficacia del OCR o crecimiento.
- Testimonios de la landing, precios, descuentos, gratuidad, soporte 24/7 y plantillas ilimitadas.
- «En vivo», «instantáneo» o «tiempo real» como promesa de todos los módulos. La consulta pública utiliza un bundle cargado; no se acreditó difusión continua del marcador.
- Transmisiones, streaming, arbitraje en vivo, venta de entradas, cobros, reservas automáticas de canchas, chat/WhatsApp integrado o notificaciones push.
- Instalación desde tiendas nativas, acceso completo sin conexión o disponibilidad universal sin condiciones.
- Lectura de cédulas sin errores o guardado automático sin revisión humana.
- Programación operativa en la página «Partidos», aún sin implementar.

## 7. Evidencias ejecutadas y límites

Las 159 pruebas seleccionadas cubren acceso y rutas, fixture y restricciones, planificación/edición, matching y diferencias de cédula, cliente de escaneo, resultados/concurrencia, estadísticas, contratos de delegado, exportaciones y colores. Están registradas en `research/unit-tests.log`.

Las 14 pruebas existentes de `tests/e2e/tournament-views.spec.js` pasaron en escritorio y móvil. Otras 4 comprobaciones creadas aquí abrieron clasificación/exportación y resultado/entrada al escaneo. Las capturas se encuentran en `research/ui-artifacts`, y el reporte de las cuatro comprobaciones editoriales está en `research/ui-report/index.html`. La segunda ejecución reemplazó el reporte visual de la primera; sus 14 aprobaciones se registran en el resumen de esta investigación, no como parte del JSON de cuatro casos.

No se invocaron proveedores de lectura pagos ni se enviaron cambios a producción. Los tests contractuales simulan los clientes de datos; la inspección SQL demuestra una implementación disponible en el repositorio, no su despliegue. Antes de representar la lectura OCR como una demostración de una ejecución real habrá que obtener una lectura válida y revisada de la cédula de ejemplo. La animación propuesta se rotulará como demostración ilustrativa y nunca como grabación de una liga real.

## 8. Identidad encontrada

- Logo oficial: `public/logo_app.png`, referenciado por `v.logo`, landing, sidebar y metadata. Escudo con balón y conexiones de competición; archivo original de 500 × 500 píxeles con transparencia. SHA-256: `8FDFD91BBC70C43CE0B3FD13683C8EC5563A913D4C70E5BB411620B776179217`.
- `public/logo_gen.png` es el recurso genérico y no reemplaza al logo oficial.
- Azul principal del tema: `#1CB0F6`; azul de selección `#84D8FF`; fondo claro `#EDF3FB`; tarjeta blanca; fondo oscuro `#131F24`; tarjeta oscura `#10191D`; texto claro `#3C3C3C` y blanco en oscuro.
- El logo contiene además verdes/azules propios que deben conservarse. No recolorear el PNG para igualarlo al acento de la interfaz.
- Poppins se declara globalmente y hay WOFF2 locales en pesos 400/600/700 con SIL OFL. Actualmente esos archivos se cargan expresamente en recuperación de contraseña; declarar una familia no acredita su carga en todas las pantallas. En los videos se incrustará Poppins para garantizar la intención de marca.
- No se encontró un wordmark vectorial independiente. «Bracket» podrá componerse como texto junto al archivo oficial, sin presentarlo como un logo sustituto.

## Conclusión de investigación

La campaña tiene material verificable para una historia de organización → registro → comunicación. Las escenas principales se apoyan en flujos implementados y controles observados. El mayor cuidado de fidelidad corresponde al escaneo remoto, la publicación pública y la continuidad de los datos entre pantallas: se documentarán como reconstrucciones ilustrativas, con revisión y estados explícitos.
