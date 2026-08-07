# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Managers que organizan y administran ligas de fútbol amateur. Usan la plataforma para coordinar una temporada real con poco tiempo, desde escritorio, tablet o móvil.

## Product Purpose

Bracket App centraliza la administración de ligas amateur en una sola plataforma. Permite configurar ligas y torneos, registrar equipos, programar jornadas, capturar resultados y compartir estadísticas y tablas con claridad. El éxito es que el manager pueda operar su liga con menos trabajo manual y menos información dispersa.

## Positioning

Una herramienta de operación para managers de ligas amateur que reúne la planeación, el registro de resultados y las estadísticas de un torneo en el mismo flujo de trabajo, sustituyendo hojas de cálculo y mensajes dispersos.

## Operating Context

Los managers configuran torneos, equipos y jornadas antes y durante una temporada. En días de partido registran programación, árbitros, plantillas, goles y resultados —incluso a partir de cédulas escaneadas— y después consultan o comparten tablas y estadísticas.

## Capabilities and Constraints

- Gestión de ligas, torneos, equipos, jugadores, jornadas, partidos, resultados y estadísticas.
- Registro de eventos de partido, penales, walkovers y arbitraje.
- Lectura e interpretación de cédulas para asistir el registro de resultados.
- Debe funcionar de forma responsiva y utilizable en escritorio, tablet y móvil.

## Brand Commitments

Bracket App debe sentirse profesional, confiable y cercana al fútbol amateur. La interfaz debe mantener un estándar alto de calidad de UI/UX: ordenada, clara, segura y práctica durante la operación, sin perder energía deportiva ni calidez humana.

## Evidence on Hand

- La aplicación implementa sus flujos de operación en `app/` y `src/`.
- El escaneo de cédulas y la revisión de su interpretación están implementados en `src/components/organismos/tabs/torneos/planificacion/result_modal_components/CedulaScanFlow.jsx`.
- No hay testimonios, benchmarks comerciales ni promesas cuantitativas confirmadas en el repositorio; no deben inventarse.

## Product Principles

1. Reducir la fricción operativa para que administrar una liga sea más simple que hacerlo con hojas de cálculo y chats.
2. Priorizar claridad, datos verificables y estados visibles en cada decisión del manager.
3. Mantener los flujos de planificación, captura de resultados y consulta de estadísticas conectados.
4. Conservar legibilidad, control y consistencia en pantallas de cualquier tamaño.
5. Diseñar cada acción importante para inspirar confianza y evitar errores al operar torneos reales.

## Accessibility & Inclusion

Apuntar a WCAG AA en contraste y estados de foco, conservar navegación por teclado en controles interactivos y respetar `prefers-reduced-motion` para reducir movimiento no esencial sin perder claridad de estado.
