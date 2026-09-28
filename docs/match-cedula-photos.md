# Fotos de cédulas de partido

El botón Cargar cédula junto a Escanear cédula en la cabecera de `ResultModal`
abre el mismo selector de imagen: archivo, cámara en móvil o portapapeles (botón
Pegar imagen y Ctrl/Cmd + V). El flujo permite verla completa, guardarla sin
modificar el marcador y eliminarla. Una foto pendiente también se
guarda al confirmar el marcador. Al aplicar un escaneo, la opción de conservar
la foto está activada por defecto; se puede desactivar antes de aplicar.
Si ya hay una foto en el partido, Escanear cédula abre directamente su vista
previa y permite cambiarla antes del OCR. Aplicar ese escaneo no vuelve a subir
la misma foto. En la captura manual, una pestaña en el borde izquierdo despliega
la imagen junto al formulario; se puede ampliar y ocultar sin perder los datos.

La compresión ocurre en el navegador. Se genera JPG de hasta 500 KB, empezando
con 2200 px en el lado mayor y reduciendo calidad/dimensiones cuando hace falta.
El OCR sigue utilizando su propia imagen y recortes, con mayor calidad. Si el
navegador no puede convertir el archivo, se informa el error sin subir el original.

Supabase usa el bucket privado `match-cedulas` y la ruta
`league_id/tournament_id/match_id.jpg`. Reemplazar una foto reutiliza su objeto.
Las políticas permiten acceso solo a administradores activos de esa liga y
validan que el partido pertenezca al torneo para las cargas. Las fotos se
descargan con autenticación y se muestran mediante URL temporal local.

Finalizar/Borrar torneo bloquea primero nuevas cargas, borra las fotos con la
API de Storage en lotes y finalmente elimina el torneo. El bloqueo de fila usado
por las políticas serializa cargas admitidas con la limpieza. Si Storage falla,
el torneo se conserva para reintentar y se informa el error. Limpiar resultados
conserva el torneo y sus fotos. La limpieza recorre la carpeta completa, incluidos
archivos de partidos que se hubieran quitado del fixture.

La foto tiene guardado independiente del resultado: si falla el guardado del
marcador después de guardar la foto, esta permanece disponible en el partido.

Verificación: `tests/cedulaPhotos.test.js` cubre compresión, límites, reemplazo,
lectura exacta, paginación y fallos de limpieza. La prueba SQL
`supabase/tests/match_cedula_storage.sql` verifica permisos y bloqueo de cargas
en una transacción que se revierte; necesita un partido de un torneo activo.
