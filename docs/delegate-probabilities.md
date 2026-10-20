# Análisis y probabilidades del Delegado

La sección aparece debajo del resumen de torneo en **Mi equipo**. Usa exclusivamente el torneo activo al que pertenece el equipo asignado al Delegado. No requiere migraciones ni escrituras en Supabase.

La presentación agrupa el análisis en un módulo con pestañas **Próximo rival** y **Temporada**. La primera concentra ambos escudos, el pronóstico en tiempo reglamentario y el rendimiento de apoyo; permite cambiar de rival mediante selector o flechas. En contenedores estrechos, los datos de contexto del rival se despliegan a petición. La temporada separa los objetivos de clasificación de los de ascenso y permanencia, distinguiendo la probabilidad total de liguilla de sus vías de acceso.

Las pestañas admiten flechas izquierda/derecha y Home/End; los detalles usan desplegables nativos. La composición responde al ancho del módulo y conserva el tema de la aplicación. Los cambios de presentación no modifican el modelo ni los datos usados para los cálculos.

## Datos y acceso

- `GET /api/delegates/teams/:teamId/forecast` verifica sesión, rol, cuenta activa, asignación del equipo y participación en el torneo antes de leer resultados o consultar el caché de cálculo.
- Comparte la carga autorizada con `/tournament`. Conserva el contrato y la selección de campos de esa ruta; las observaciones completas solo se procesan en el servidor.
- Consulta `tournaments`, `teams`, `jornadas`, `matches` y la disponibilidad de divisiones de destino en la misma categoría y liga. La respuesta incluye fechas únicamente de los partidos del equipo solicitante.
- La respuesta HTTP es privada y no almacenable. El caché de cálculo en memoria dura un minuto, admite 32 entradas e incluye equipo, configuración, participantes, jornadas, marcadores, puntos, estados, observaciones y fechas en su huella. Una corrección de estos datos invalida el cálculo anterior.
- La pantalla consulta al entrar, al recuperar foco/visibilidad, cada minuto mientras es visible y mediante **Actualizar**. Cancela respuestas de solicitudes anteriores y al desmontarse.

## Modelo deportivo

Se inicia con un resultado válido del equipo y otro partido del torneo que no lo involucre. Solo cuentan partidos terminados con ambos equipos participantes y marcadores enteros no negativos. Descansos, huecos, partidos cancelados y otros torneos no aportan resultados deportivos.

El modelo estima fuerzas de ataque y debilidad defensiva mediante un ajuste iterativo de Poisson regularizado. Usa una referencia equivalente a seis encuentros al promedio del torneo, para limitar el efecto de muestras pequeñas. El peso temporal se reduce a la mitad cada seis jornadas: usa las fechas de juego y la duración configurada de jornada si todos los resultados tienen fecha; en caso contrario, usa su jornada oficial. No supone ventaja de local por ser `team1`.

Los rivales comunes producen un ajuste residual pequeño sobre los goles estimados, limitado a ±0.12 en escala logarítmica. La forma, los antecedentes directos y los rivales comunes se muestran con marcadores reales, ordenados por fecha jugada; los resultados sin fecha se colocan al inicio por jornada oficial. Los resultados por default conservan sus puntos y goles oficiales en la tabla, pero se excluyen del ajuste de rendimiento.

La distribución de goles conserva la cola de marcadores altos. Ganar, empatar y perder se refiere al tiempo reglamentario y suma 100 después del redondeo por restos mayores. La dificultad compara `P(ganar) / (P(ganar) + P(perder))`: muy alta debajo de 0.30, alta debajo de 0.45, media debajo de 0.65 y baja a partir de 0.65. La posición y las tasas por partido se muestran como contexto, sin volver a introducir las mismas estadísticas como pesos adicionales.

Los parámetros iniciales no tienen calibración externa. La evaluación interna usa resultados de fechas anteriores al encuentro evaluado, excluye partidos sin fecha y nunca usa la jornada original de una reposición para introducir su resultado antes de tiempo. Expone Brier multiclase y una referencia uniforme para diagnóstico, sin presentar un porcentaje de acierto al usuario.

## Proyección de temporada

Se ejecutan 5,000 simulaciones reproducibles a partir de los datos actuales. La tabla inicial utiliza la misma función pura que las tablas de la app (`standingsSnapshot.js`), con todos los resultados terminados de fase regular. Se conservan puntos oficiales, reposiciones y doble default. Los nuevos resultados aplican puntos configurados y el punto extra de penales cuando corresponde. Sin datos de habilidad en tandas se asigna una probabilidad simétrica a ese punto.

La proyección exige fase de liga, participantes completos y calendario verificable: cada pareja debe aparecer exactamente el número de vueltas configurado, descontando cancelaciones. Los calendarios flexibles, incompletos, con cruces adicionales o resultados inválidos conservan los pronósticos de partidos, pero muestran la razón por la que no puede calcularse la temporada. No se crean cruces que no existen en la base.

La clasificación sigue puntos, diferencia de goles, goles a favor y menos partidos jugados. Un empate completo se reparte uniformemente entre posiciones y se comunica como pendiente de resolución oficial. Se simula el repechaje por mejor contra peor si aplica, incluidas sus vueltas, pase sin rival y desempate por mejor posición o penales.

Los objetivos muestran liguilla directa, entrar a repechaje, liguilla incluida la vía de repechaje, ascenso/descenso y permanencia según configuración. Si falta división de destino, la etiqueta es **Zona de ascenso/descenso**. Son eventos que pueden coincidir; no forman una distribución que deba sumar 100. Los rangos de puntos y posición cubren el 80 % central de las simulaciones.

Un 0 o 100 obtenido por simulación se presenta como `<1 %` o `>99 %`. La certeza solo se etiqueta para la fase regular terminada y sin empate completo del equipo. Si la liguilla ya comenzó se cierra la proyección de fase regular, conservando pronósticos para rivales de eliminatorias ya programados.

## Validación

- Pruebas unitarias: elegibilidad, normalización, simetría, colas de goles altos, defaults, puntos de penales, reposiciones, calendario incompleto, rivales comunes, empates completos, invalidación del caché y evaluación temporal.
- Pruebas de API y App Router: autenticación/asignación, cache privado, lectura sin escrituras, identificadores, métodos HTTP y ausencia de notas/fechas privadas de otros equipos.
- Comprobación local del motor con resultados reales consultados en Supabase para tres torneos, sin cambiar registros: dos calendarios completos produjeron proyecciones y uno flexible mostró su limitación.
- Revisión del componente React en navegador a 1440 px y 390 px, con tema claro/oscuro, selección de rival, detalles, actualización y estados de carga/error/vacío/calendario flexible/sin próximos rivales. Las capturas usan datos sintéticos identificados. No sustituyen una sesión interactiva autenticada en producción.
