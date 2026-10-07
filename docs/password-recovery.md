# Recuperación de contraseña

El login ofrece «¿Olvidaste tu contraseña?» y `/login?recovery=1` abre directamente la solicitud. `resetPasswordForEmail` envía el correo con `redirectTo` apuntando a `/auth/confirm?next=/restablecer-contrasena` en el origen de la aplicación. La respuesta es genérica para no revelar si existe una cuenta.

`/auth/confirm` verifica `token_hash` con `type=recovery`, escribe las cookies con el cliente SSR y redirige a `/restablecer-contrasena`. El destino es fijo; no se aceptan redirecciones arbitrarias. También admite `code` para el PKCE de la plantilla predeterminada, que requiere abrir el enlace en el navegador que solicitó el correo. El enlace personalizado con token hash permite abrirlo en otro navegador o dispositivo. El callback de Google conserva su ruta y comportamiento.

La nueva contraseña requiere una sesión validada por `getUser`, ocho caracteres como mínimo y confirmación idéntica. Supabase aplica además la política del proyecto; sus errores se muestran sin revelar detalles internos. Una actualización exitosa termina con `signOut({ scope: 'local' })` y una confirmación para volver al login. Si cerrar sesión falla, la contraseña ya se considera actualizada y se ofrece reintentar la salida. El login posterior mantiene los controles de rol y suspensión.

## Configuración del proyecto alojado

1. En Authentication → URL Configuration, conservar la URL de producción en Site URL y permitir los destinos de recuperación de producción y de los entornos que se utilicen. La aplicación genera el destino en su origen actual. Para localhost, autorizar ese origen y puerto; no usar la configuración local como reemplazo de la remota.
2. En Authentication → Emails → Reset password, usar `supabase/templates/recovery.html`. La plantilla usa `{{ .RedirectTo }}` (que ya incluye `?next=...`), `{{ .TokenHash }}` y `type=recovery`. Asunto: «Restablece tu contraseña de Bracket App». No cambiar las plantillas de OAuth, invitación o alta.
3. Comprobar SMTP, remitente y dominio verificado. El SMTP predeterminado de Supabase restringe el envío a miembros del equipo del proyecto y tiene límites bajos; para usuarios reales hace falta un SMTP propio o un Send Email Hook configurado. No se incluyen credenciales SMTP en el código.
4. Revisar expiración, frecuencia de envío y política de contraseñas. La interfaz espera 60 segundos entre solicitudes y gestiona también los rechazos de frecuencia del servidor. Su mínimo de ocho caracteres es deliberadamente más estricto que el mínimo local previo de seis; una política remota adicional sigue siendo autoritativa.

La plantilla y configuración local están versionadas. Modificar estos archivos no aplica cambios al proyecto alojado. No ejecutar `supabase config push` con toda la configuración local sobre producción: contiene opciones locales que no deben sustituir los ajustes existentes.

### Estado remoto verificado el 7 de octubre de 2026 (UTC)

Se aplicaron y se volvieron a consultar mediante la Management API del proyecto `onctxrztfpkijuawqqmo` estos tres campos: `mailer_subjects_recovery`, `mailer_templates_recovery_content` y `uri_allow_list`. El asunto en español y el HTML coinciden con la plantilla local. Se conservaron el Site URL `https://futbolapp.vercel.app`, los destinos existentes y todos los demás ajustes de Auth.

Se añadieron destinos de recuperación con la forma `/auth/confirm?next=%2Frestablecer-contrasena` para producción, `127.0.0.1` y `localhost` en los puertos 3000, 3181 y 4175, y `127.0.0.1:5173`. El destino `http://localhost:5173/**` ya estaba permitido y se conservó. Las URLs locales identifican la computadora donde se abre el enlace; para probar desde otro dispositivo hace falta una aplicación desplegada y accesible allí.

La consulta remota confirma que no hay SMTP propio ni Send Email Hook. El servicio predeterminado limita los destinatarios a miembros del equipo y permite dos correos por hora. La expiración del enlace es de 3600 segundos, el intervalo de reenvío es de 60 segundos y el mínimo remoto de contraseña sigue siendo seis caracteres; el formulario exige ocho. Habilitar el correo para todos los usuarios requiere un proveedor SMTP, un remitente verificado y sus credenciales, configuradas directamente en Supabase.

Se solicitó un correo real desde la interfaz local a la dirección de prueba autorizada. Tras corregir el destinatario, la interfaz mostró la confirmación y los registros de Auth confirmaron HTTP 200 en `/recover`. El usuario confirmó la recepción del correo en su buzón. La entrega real está comprobada; quedan por verificar la apertura del enlace, el cambio de contraseña y el acceso posterior.

Las rutas de producción `/auth/confirm` y `/restablecer-contrasena` devolvieron HTTP 404 durante la revisión. Falta desplegar la implementación actual antes de probar el flujo en producción; la configuración de Supabase ya está preparada para esas rutas.

## Verificación

```powershell
node --test tests/passwordRecovery.test.js tests/navigationRoutes.test.js tests/routeAccess.test.js
node --conditions=react-server --test tests/next-api/passwordRecovery.test.js tests/next-api/authCallback.test.js
npm run test:e2e:password-recovery
```

Las pruebas de navegador usan cuentas y tokens sintéticos con un servidor dedicado y no envían correos ni actualizan cuentas reales. La entrega al buzón de prueba ya fue confirmada usando el servicio predeterminado. Para completar la prueba real, el usuario debe abrir el enlace en la computadora donde se ejecuta la aplicación local, guardar una contraseña nueva y confirmar el acceso posterior. La prueba desde otro dispositivo requiere desplegar las rutas; los envíos a todos los usuarios requieren SMTP propio o Send Email Hook. Mantener por separado las pruebas existentes `auth-recovery`, que verifican recuperación de sesión y conexión.

Referencias: [recuperación de contraseña](https://supabase.com/docs/guides/auth/passwords?flow=pkce), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [plantillas](https://supabase.com/docs/guides/auth/auth-email-templates).
