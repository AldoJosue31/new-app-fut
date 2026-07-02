/**
 * Textos centralizados de la Landing.
 * Estructura pensada para migrar a react-i18next después:
 * cada key aquí = una key en locales/es/landing.json
 */
export const landingCopy = {
  nav: {
    logo: "Bracket App",
    links: [
      { label: "Producto", href: "#producto" },
      { label: "Cómo funciona", href: "#como-funciona" },
      { label: "Planes", href: "#planes" },
      { label: "Preguntas", href: "#faq" },
    ],
    ctaLogin: "Iniciar sesión",
    ctaStart: "Empieza gratis",
  },
  hero: {
    eyebrow: "Plataforma para ligas amateur",
    titleLine1: "Domina tu liga",
    titleAccent: "como un profesional",
    subtitle:
      "Gestiona torneos, equipos, jornadas y estadísticas de tu liga amateur de fútbol desde un solo lugar. Diseñado para dirigentes que aman el juego.",
    ctaPrimary: "Empieza gratis",
    ctaSecondary: "Ver demo",
    stats: [
      { value: "+120", label: "Ligas gestionadas" },
      { value: "+1,800", label: "Equipos activos" },
      { value: "+42k", label: "Partidos registrados" },
    ],
  },
  features: {
    eyebrow: "Todo lo que necesitas",
    title: "Un ecosistema completo para tu liga",
    items: [
      {
        icon: "trophy",
        title: "Torneos",
        text: "Crea torneos con formato personalizado: puntos, empates, desempates y reglas propias.",
      },
      {
        icon: "team",
        title: "Equipos",
        text: "Registro de jugadores, cambios de plantilla, transferencias y sanciones.",
      },
      {
        icon: "calendar",
        title: "Partidos",
        text: "Programación de jornadas, resultados en vivo y cédulas oficiales.",
      },
      {
        icon: "chart",
        title: "Estadísticas",
        text: "Tabla general, goleadores, tarjetas y métricas que impresionan.",
      },
    ],
  },
  howItWorks: {
    eyebrow: "Simple, rápido, potente",
    title: "Tu liga corriendo en 3 pasos",
    steps: [
      {
        n: "01",
        title: "Crea tu liga",
        text: "Configura tu organización, divisiones y estilo de competencia en minutos.",
      },
      {
        n: "02",
        title: "Registra equipos",
        text: "Invita managers, sube plantillas y organiza los grupos según tu formato.",
      },
      {
        n: "03",
        title: "Compite y publica",
        text: "Programa jornadas, captura resultados y comparte la tabla pública con tu comunidad.",
      },
    ],
  },
  showcase: {
    eyebrow: "Producto",
    title: "Un panel pensado para dirigentes que van en serio",
    text: "Interfaz limpia, responsive y con todas las herramientas al alcance. Dashboards, cédulas, alineaciones y estadísticas listas para compartir.",
    bullets: [
      "Dashboard con métricas clave en tiempo real",
      "Cédulas de partido oficiales imprimibles",
      "Enlace público de tabla general para tu afición",
      "Modo texto para compartir en WhatsApp y redes",
    ],
  },
  benefits: {
    eyebrow: "Por qué Bracket App",
    title: "Menos hojas de cálculo, más fútbol",
    cards: [
      {
        icon: "shield",
        title: "Precios por división",
        text: "Paga solo por lo que necesitas. Escala cuando crezca tu liga.",
      },
      {
        icon: "savings",
        title: "Ahorra más",
        text: "Con nuestros planes semestrales y anuales ahorras hasta un 16.7%.",
      },
      {
        icon: "chart-up",
        title: "Fácil y seguro",
        text: "Administra tu liga de forma rápida y eficiente, respaldada en la nube.",
      },
    ],
  },
  testimonial: {
    quote:
      "Antes gestionaba 3 divisiones con Excel y WhatsApp. Con Bracket App todo está en un solo lugar y mis equipos saben qué pasa en tiempo real. Cambió mi forma de dirigir la liga.",
    author: "Carlos Méndez",
    role: "Presidente · Liga Sabatina Kravitt",
  },
  pricing: {
    eyebrow: "Planes",
    title: "Elige el plan ideal para tu liga",
    subtitle:
      "Precios por división. Paga solo por lo que necesitas. Cambia de plan cuando quieras.",
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
      },
    ],
    finePrint: "Todos los precios en pesos mexicanos (MXN). IVA incluido.",
  },
  faq: {
    eyebrow: "Preguntas frecuentes",
    title: "Resolvamos tus dudas",
    items: [
      {
        q: "¿Puedo cambiar de plan cuando quiera?",
        a: "Sí. Puedes subir o bajar de plan en cualquier momento desde tu panel. El cambio se aplica en el siguiente ciclo de facturación.",
      },
      {
        q: "¿Necesito tarjeta de crédito para empezar?",
        a: "No. Puedes crear tu cuenta y explorar la plataforma antes de contratar un plan.",
      },
      {
        q: "¿Qué pasa si mi liga crece durante el año?",
        a: "Cambias al plan superior en cualquier momento. Solo pagas la diferencia proporcional al tiempo restante.",
      },
      {
        q: "¿Los datos de mi liga están seguros?",
        a: "Sí. Toda la información se almacena en la nube con Supabase y respaldos automáticos.",
      },
      {
        q: "¿Puedo compartir la tabla con mi afición?",
        a: "Por supuesto. Cada torneo tiene un enlace público que puedes compartir en redes o WhatsApp.",
      },
    ],
  },
  finalCta: {
    tagline: "Más organización · Más control · Más pasión por el fútbol",
    title: "Lleva tu liga al siguiente nivel",
    subtitle: "¡Elige tu plan hoy!",
    ctaPrimary: "Empieza gratis",
    ctaSecondary: "Hablar con ventas",
  },
  footer: {
    tagline: "Gestión profesional para ligas amateur de fútbol.",
    columns: [
      {
        title: "Producto",
        links: [
          { label: "Funciones", href: "#producto" },
          { label: "Planes", href: "#planes" },
          { label: "Cómo funciona", href: "#como-funciona" },
        ],
      },
      {
        title: "Empresa",
        links: [
          { label: "Sobre nosotros", href: "#" },
          { label: "Contacto", href: "#" },
          { label: "Blog", href: "#" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Términos", href: "#" },
          { label: "Privacidad", href: "#" },
          { label: "Cookies", href: "#" },
        ],
      },
    ],
    copyright: "© {year} Bracket App. Todos los derechos reservados.",
  },
};
