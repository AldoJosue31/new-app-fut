# Landing contract

## Funcionalidades que deben conservarse

- Acceso publico desde `/` para usuarios sin sesion y desde `/landing`.
- Navegacion interna a secciones de funciones, operacion, planes y preguntas.
- Acciones hacia `/login` para inicio de sesion o creacion de cuenta.
- Toggle Light/Dark conectado a `useThemeStore` y a `src/styles/themes.jsx`.
- Uso del logo `public/logo_app.png`.

## Secciones y contenido obligatorio

- Header con marca, navegacion interna, toggle de tema y accion de login.
- Hero con propuesta funcional de Bracket App.
- Funciones principales: torneos, equipos, partidos, tablas publicas y managers.
- Flujo de operacion: configurar, operar y publicar.
- Planes como seccion reservada para informacion comercial.
- Preguntas basicas y footer.

## Fuentes de datos

- Copy local en `src/pages/landing/copy.js`.
- Tema global desde `useThemeStore`.
- Tokens visuales derivados de `themeStyle.landingPage`.
- Logo servido desde `/logo_app.png`.

## Rutas y acciones

- `/` muestra la landing cuando no hay usuario autenticado.
- `/landing` muestra la landing directamente.
- `/login` recibe las acciones principales de autenticacion.
- Los anchors internos usan `#funciones`, `#operacion`, `#planes` y `#faq`.

## Restricciones tecnicas

- No depender de componentes visuales legacy de `src/components/landing`.
- No introducir gradientes, patrones, animaciones, decoraciones o cards elaboradas en esta base.
- No romper `ThemeProvider`, `GlobalStyles`, autenticacion, rutas protegidas ni rutas publicas.
- Mantener CSS de landing aislado bajo `.landing-scope`.
- Evitar imports muertos, clases Tailwind obsoletas y assets no referenciados por la landing.
