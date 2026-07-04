# Bracket App — Instrucciones para Codex

## Proyecto

* Usa Tailwind CSS para la interfaz.
* Respeta el sistema Light/Dark definido en `src/styles/themes.jsx`.
* Usa `public/logo_app.png` como logo oficial.
* Consulta `docs/LANDING_CONTRACT.md` para conocer las funciones, contenido y acciones obligatorias de la landing.

## Landing page

* `docs/LANDING_CONTRACT.md` es la fuente de verdad funcional de la landing.
* Conserva las rutas, datos, navegación, autenticación y acciones descritas en ese documento.
* La estructura visual actual no es una referencia obligatoria.
* Cuando se solicite un rediseño completo, crea desde cero el layout, la jerarquía, las secciones y los componentes visuales.
* No conserves la composición anterior solo para reutilizar código.
* No consultes historial de Git, commits, ramas, archivos eliminados, capturas ni versiones anteriores de la landing, salvo que el usuario lo solicite explícitamente.
* No agregues descripciones visuales del diseño actual a `LANDING_CONTRACT.md`.
* Se pueden reemplazar o eliminar componentes visuales si no contienen funcionalidad necesaria.
* Elimina estilos, imports, componentes y assets que queden sin uso después de un rediseño.

## Implementación

* Mantén el código responsive y accesible.
* Reutiliza lógica funcional, pero no fuerces la reutilización de componentes visuales.
* No cambies módulos ajenos a la tarea.
* No instales nuevas dependencias salvo que sean necesarias.
* No uses Anime.js salvo que el usuario lo solicite explícitamente.
* Mantén compatibilidad con los temas Light/Dark existentes.

## Validación

Antes de terminar:

* Ejecuta `npm run build`.
* Ejecuta lint si existe un script configurado.
* Corrige errores provocados por los cambios.
* Revisa que no queden imports, componentes o estilos sin uso.
* Comprueba la landing en escritorio y móvil.

## Respuesta

* Realiza los cambios directamente.
* No muestres archivos completos en la respuesta.
* No expliques cada paso realizado.
* Resume únicamente los cambios importantes y el resultado de las validaciones, en un máximo de 5 puntos.
