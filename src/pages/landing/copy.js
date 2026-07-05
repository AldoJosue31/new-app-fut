// src/pages/landing/copy.js

import { v } from "../../styles/variables";

export const landingCopy = {
  nav: {
    logoText: "Bracket App",
    logoImg: v.logo,
    links: [
      { label: "Plataforma", href: "#producto" },
      { label: "Proceso", href: "#como-funciona" },
      { label: "App", href: "#preview" },
      { label: "Ventajas", href: "#ventajas" },
      { label: "Testimonios", href: "#testimonios" },
      { label: "Precios", href: "#planes" },
      { label: "FAQ", href: "#faq" },
    ],
    ctaLogin: "Iniciar sesión",
    ctaStart: "Empieza gratis",
  },
  hero: {
    eyebrow: "",
    titleLine1: "Gestiona tu liga de fútbol",
    titleAccent: "sin complicaciones",
    subtitle:
      "Automatiza torneos, controla equipos y publica estadísticas en tiempo real. La herramienta definitiva para dirigentes de fútbol.",
    ctaPrimary: "Crear mi liga gratis",
    ctaSecondary: "Inicia sesión",
    stats: [
      { value: "+120", label: "Ligas" },
      { value: "+1,800", label: "Equipos" },
      { value: "+42k", label: "Partidos" },
    ],
  },
  features: {
    eyebrow: "",
    title: "Control total de tu torneo",
    items: [
      {
        icon: "trophy",
        title: "Torneos",
        text: "Formatos personalizados, liguillas y repechajes automáticos.",
      },
      {
        icon: "team",
        title: "Equipos",
        text: "Plantillas, transferencias y control de dorsales centralizado.",
      },
      {
        icon: "calendar",
        title: "Partidos",
        text: "Resultados, goles y cédulas listas para imprimir.",
      },
      {
        icon: "chart",
        title: "Estadísticas",
        text: "Tabla general y goleadores en tiempo real.",
      },
    ],
  },
  howItWorks: {
    eyebrow: "",
    title: "Comienza en 3 pasos",
    steps: [
      { n: "01", title: "Configura", text: "Crea tu liga y define tus reglas." },
      { n: "02", title: "Registra", text: "Agrega equipos y jugadores." },
      { n: "03", title: "Publica", text: "Genera el calendario y comparte el enlace público." },
    ],
  },
  benefits: {
    eyebrow: "",
    title: "Olvídate de las hojas de cálculo",
    cards: [
      {
        icon: "shield",
        title: "Multi-división",
        text: "Administra múltiples categorías desde un solo panel.",
      },
      {
        icon: "savings",
        title: "Escalable",
        text: "La plataforma crece al ritmo de tu liga.",
      },
      {
        icon: "chart-up",
        title: "Datos Seguros",
        text: "Respaldo en la nube y acceso desde cualquier dispositivo.",
      },
    ],
  },
  testimonial: {
    quote:
      "Antes gestionaba la liga con Excel y WhatsApp. Con Bracket App todo está en un solo lugar y mis equipos saben qué pasa en tiempo real. Cambió mi forma de dirigir.",
    author: "Aldo García",
    role: "Administrador de Liga",
  },
  pricing: {
    eyebrow: "",
    title: "Precios transparentes",
    subtitle: "Elige el plan ideal para tu liga y paga solo por las divisiones que necesitas.",
    cycles: {
      monthly: { key: "monthly", label: "Mensual", note: "Pago cada mes" },
      semester: { key: "semester", label: "Semestral", note: "Pago cada 6 meses" },
      annual: { key: "annual", label: "Anualidad", note: "Pago cada año" },
    },
    savingLabel: "Ahorras",
    ctaLabel: "Elegir plan",
    currency: "MXN",
    plans: [
      {
        id: "basico",
        name: "BÁSICO",
        badge: "1",
        divisions: "1 División",
        prices: {
          monthly: { amount: 600 },
          semester: { amount: 3300, save: 300, percent: "8.3%" },
          annual: { amount: 6000, save: 1200, percent: "16.7%" },
        },
        features: ["Gestión de 1 división", "Plantillas ilimitadas", "Estadísticas básicas", "Soporte estándar"],
      },
      {
        id: "intermedio",
        name: "INTERMEDIO",
        badge: "2",
        divisions: "2 Divisiones",
        prices: {
          monthly: { amount: 1050 },
          semester: { amount: 5100, save: 400, percent: "6.3%" },
          annual: { amount: 10800, save: 1800, percent: "14.3%" },
        },
        features: [
          "Gestión de 2 divisiones",
          "Plantillas ilimitadas",
          "Estadísticas avanzadas",
          "Cédulas de juego",
          "Soporte prioritario",
        ],
      },
      {
        id: "profesional",
        name: "PROFESIONAL",
        badge: "3",
        divisions: "3 Divisiones",
        highlight: true,
        prices: {
          monthly: { amount: 1450 },
          semester: { amount: 8000, save: 700, percent: "8.0%" },
          annual: { amount: 15000, save: 2400, percent: "13.8%" },
        },
        features: [
          "Gestión de 3 divisiones",
          "Plantillas ilimitadas",
          "Estadísticas avanzadas",
          "Cédulas de juego",
          "Exportación a PDF",
          "Soporte 24/7",
        ],
      },
      {
        id: "regional",
        name: "REGIONAL",
        badge: "4-5",
        divisions: "4 a 5 Divisiones",
        prices: {
          monthly: { amount: 1900 },
          semester: { amount: 10500, save: 900, percent: "7.9%" },
          annual: { amount: 19500, save: 3300, percent: "14.5%" },
        },
        features: [
          "Gestión de 4 a 5 divisiones",
          "Plantillas ilimitadas",
          "Estadísticas avanzadas",
          "Cédulas de juego",
          "Exportación a PDF",
          "Soporte prioritario",
        ],
      },
      {
        id: "elite",
        name: "ÉLITE",
        badge: "6-8",
        divisions: "6 a 8 Divisiones",
        prices: {
          monthly: { amount: 2600 },
          semester: { amount: 14500, save: 1100, percent: "7.1%" },
          annual: { amount: 27000, save: 4200, percent: "13.9%" },
        },
        features: [
          "Gestión de 6 a 8 divisiones",
          "Plantillas ilimitadas",
          "Estadísticas avanzadas",
          "Cédulas de juego",
          "Exportación a PDF",
          "Soporte 24/7",
        ],
      },
    ],
    finePrint: "Precios en MXN. IVA incluido.",
  },
  faq: {
    eyebrow: "",
    title: "Preguntas Frecuentes",
    items: [
      { q: "¿Puedo cambiar de plan?", a: "Sí, puedes ajustar tu plan en cualquier momento desde el panel." },
      { q: "¿Necesito tarjeta para empezar?", a: "No, crea tu cuenta y explora gratis." },
      { q: "¿Puedo compartir la tabla?", a: "Sí, obtienes un enlace público para tu afición." },
    ],
  },
  finalCta: {
    tagline: "Gestión Profesional",
    title: "Lleva tu liga al siguiente nivel",
    subtitle: "Comienza a profesionalizar tu torneo hoy mismo.",
    ctaPrimary: "Crear cuenta",
    ctaSecondary: "Hablar con ventas",
  },
  footer: {
    tagline: "Bracket App - Plataforma de gestión deportiva.",
    columns: [],
    copyright: "© {year} Bracket App. Todos los derechos reservados.",
  },
};
