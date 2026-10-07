---
name: Bracket App
description: Sistema visual existente para la operación de ligas amateur.
colors:
  primary: "#1cb0f6"
  light-text: "#3C3C3C"
  dark-text: "#fff"
  light-bgtotal: "#EDF3FB"
  dark-bgtotal: "#131F24"
  light-bgcards: "#ffffff"
  dark-bgcards: "#10191dff"
  light-bg4: "#eaeaea"
  dark-bg4: "#4E4E50"
  light-color2: "#E5E5E5"
  dark-color2: "#37464F"
  bg5: "#84d8ff"
  light-bg6: "rgba(132, 216, 255, 0.3)"
  dark-bg6: "rgba(132, 216, 255, 0.1)"
typography:
  body:
    fontFamily: "Poppins, sans-serif"
  title:
    fontFamily: "Poppins, sans-serif"
    fontSize: "30px"
    fontWeight: 700
  button:
    fontFamily: "Poppins, sans-serif"
    fontSize: "15px"
    fontWeight: 700
  field:
    fontFamily: "Poppins, sans-serif"
    fontSize: "17px"
  badge:
    fontFamily: "Poppins, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 700
    letterSpacing: "0.5px"
  tab:
    fontFamily: "Poppins, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  card: "16px"
  button: "16px"
  field: "15px"
  badge: "20px"
  tab: "14px"
spacing:
  card-padding: "30px"
  button-block: "10px"
  button-inline: "25px"
  field-padding: "12px"
  badge-block: "4px"
  badge-inline: "12px"
components:
  button-normal-light:
    backgroundColor: "{colors.light-bg4}"
    textColor: "{colors.light-text}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "10px 25px"
  button-normal-dark:
    backgroundColor: "{colors.dark-bg4}"
    textColor: "{colors.dark-text}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "10px 25px"
  field:
    backgroundColor: "transparent"
    typography: "{typography.field}"
    rounded: "{rounded.field}"
    padding: "{spacing.field-padding}"
    width: "100%"
  card-light:
    backgroundColor: "{colors.light-bgcards}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
    width: "100%"
  card-dark:
    backgroundColor: "{colors.dark-bgcards}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
    width: "100%"
  badge-light:
    backgroundColor: "{colors.light-bg4}"
    textColor: "{colors.light-text}"
    typography: "{typography.badge}"
    rounded: "{rounded.badge}"
    padding: "4px 12px"
  tab:
    backgroundColor: "transparent"
    typography: "{typography.tab}"
    rounded: "{rounded.tab}"
    padding: "10px 12px"
---

# Design System: Bracket App

## Overview

**Creative North Star: "Operación clara de ligas amateur"**

Este documento registra el sistema que ya existe en el código; el nombre expresa el propósito confirmado en PRODUCT.md, sin introducir una identidad nueva. El acento azul, los fondos claros o azul oscuro y los contenedores redondeados acompañan una herramienta profesional, cercana y práctica para administrar ligas.

La fuente de verdad sigue siendo `src/styles/themes.jsx`, `src/styles/GlobalStyles.jsx` y los componentes citados aquí. Los prefijos `light-` y `dark-` distinguen las dos variantes de las mismas claves del tema. Esta captura documenta primitivas existentes; no homogeneiza cada pantalla ni transforma la recuperación de contraseña en una plantilla global.

**Key Characteristics:**
- Acento azul compartido por ambos temas.
- Superficies y texto emparejados por tema.
- Poppins declarado y jerarquía con pesos medios o fuertes.
- Tarjetas redondeadas y controles reutilizables.
- Adaptación a escritorio, tablet y móvil según el componente.

## Colors

La paleta combina azul deportivo con fondos claros y superficies azul oscuro en el tema nocturno.

### Primary
- **Azul principal** (`primary`): identifica acciones y estados activos; lo usan controles, pestañas y tarjetas de operación.
- **Azul de selección** (`bg5`, `light-bg6`, `dark-bg6`): borde y fondo translúcido del indicador activo de TabsNavigation.

### Neutral
- **Texto del tema** (`light-text`, `dark-text`): contenido sobre las superficies correspondientes.
- **Fondo de aplicación** (`light-bgtotal`, `dark-bgtotal`): lienzo general y fondos de formularios que lo solicitan.
- **Superficie de tarjeta** (`light-bgcards`, `dark-bgcards`): Card y contenedores de acceso.
- **Superficie secundaria** (`light-bg4`, `dark-bg4`): botón normal, divisores y etiquetas sin color explícito.
- **Borde de formulario** (`light-color2`, `dark-color2`): InputText2 y BtnNormal.

**The Theme Pair Rule.** Usar fondo y texto del mismo tema; conservar la clave semántica en el componente en lugar de fijar una variante clara.

## Typography

**Display Font:** no existe una familia exclusiva para títulos en las primitivas muestreadas.
**Body Font:** Poppins, con sans-serif de respaldo, declarado en GlobalStyles.

El sistema usa una misma familia y distingue jerarquía con tamaño y peso. La carga global de Poppins no está resuelta por esa declaración: las fuentes autoalojadas añadidas en esta tarea pertenecen exclusivamente a RecoveryCard. No se registra la fuente de respaldo observada fuera de esa tarjeta como una elección visual nueva.

### Hierarchy
- **Title**: Title es un texto de tamaño fijo y peso fuerte; su semántica actual es un `span`, no una regla para títulos de documentos.
- **Button**: BtnNormal y Btnsave comparten tamaño y peso de acción.
- **Field**: InputText2 hereda la familia y usa su propio tamaño; las pantallas pueden proporcionar una variante.
- **Badge**: la etiqueta de estado usa peso fuerte, mayúsculas y tracking visible; esa transformación pertenece a Badge, no a encabezados ni textos de apoyo.
- **Tab**: TabsNavigation usa peso semibold y altura de línea compacta; reduce las etiquetas en móvil según sus props.

Los tamaños exactos observados están en el frontmatter. La escala `fontxs`–`fontxxxl` de themes.jsx no se convierte aquí en una jerarquía normativa: el muestreo no encontró consumo de esas claves en `src`.

## Layout

ContentContainer dispone el contenido en columna, con separación y gutters de 20px; su padding superior varía entre móvil (100px) y tablet (40px). Card ocupa el ancho disponible y acepta un máximo por prop, con 600px por defecto. Sidebar tiene anchos abierto y colapsado de 236px y 88px. Los breakpoints existentes son 576px, 768px, 992px y 1200px; cada componente decide cuáles utiliza.

Las pestañas operativas permiten desplazamiento horizontal, mantienen objetivos de al menos 44px y muestran o compactan etiquetas según contexto. No hay una única anchura ni una composición central obligatoria para todas las pantallas. El ancho de 448px y los gutters de 20px de recuperación se documentan en su surface brief.

## Elevation & Depth

El sistema combina superficies diferenciadas por tono con tratamientos específicos por componente. Card consulta `theme.boxshadowGray`, pero los temas actuales no definen esa clave; no se inventa una sombra para corregir esa ausencia. LoginTemplate tiene una sombra de respaldo suave y un fondo con gradientes preexistentes. Esos tratamientos de acceso no determinan la elevación de todo el producto. Los bordes inferiores de Btnsave y BtnNormal son un patrón heredado de esos controles, no una prescripción para nuevas acciones.

## Shapes

Card y los botones generales comparten esquinas amplias. InputText2 tiene un radio propio, las pestañas otro y Badge una silueta de cápsula. Los radios del frontmatter describen esos componentes; no forman una escala universal de esquinas para reinterpretar pantallas existentes.

## Components

### Buttons

BtnNormal es una acción secundaria temática: usa `bg4` y `text`, con el padding y radio del frontmatter. Btnsave recibe fondo y texto por props, por lo que no existe una asignación primaria universal verificable en ese componente. Ambos incluyen un tratamiento de borde inferior y desplazamiento al pulsar; se conserva como implementación heredada, sin canonizarlo como requisito. El estado deshabilitado comunica indisponibilidad. La nueva acción de recuperación y su tinta oscura son una variante local.

### Cards / Containers

Card usa `bgcards` y `text`, padding uniforme y un máximo configurable. Su sombra solicitada no se resuelve en los temas actuales. Conservar la adaptación por props; no aplicar el máximo de una pantalla de acceso a los paneles operativos.

### Inputs / Fields

InputText2 es un campo de ancho completo, fondo transparente y borde `color2`. Al enfocar cambia al azul principal; su etiqueta flotante se apoya en `bgcards`. La variante de LoginTemplate proporciona fondo `bgtotal`, radio y tamaño locales. La recuperación usa etiquetas superiores y foco visible explícito; sus valores permanecen en el surface brief.

### Chips

Badge muestra estados breves en una cápsula. Sin color explícito usa `bg4` y `text`; con color por prop deriva fondo y borde translúcidos. Las mayúsculas son propias de esta etiqueta.

### Navigation

TabsNavigation comunica la sección activa con texto azul y un indicador de fondo `bg6` con borde `bg5`. El hover cambia el color del texto y el foco visible tiene un contorno azul. Conserva desplazamiento horizontal y objetivos táctiles en móvil; adapta las etiquetas a sus props y al breakpoint tablet.

**The Surface Scope Rule.** Una variante que resuelve una tarea local se registra en su brief; sólo las decisiones reutilizadas y confirmadas pertenecen al sistema compartido.

## Do's and Don'ts

### Do:
- **Do** resolver superficie, texto y bordes desde el mismo tema.
- **Do** reutilizar primitivas y respetar las variantes y props de cada pantalla.
- **Do** mantener foco visible, navegación por teclado y adaptación móvil conforme al compromiso de accesibilidad de PRODUCT.md.
- **Do** distinguir una declaración tipográfica de una fuente efectivamente cargada.

### Don't:
- **Don't** convertir composición, anchura o controles exclusivos de recuperación en normas para toda la aplicación.
- **Don't** inventar valores para tokens declarados pero ausentes en los temas.
- **Don't** convertir una deriva heredada de contraste, semántica, foco o carga de fuentes en una regla que deban heredar nuevas superficies.
