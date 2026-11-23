import Landing from "../../../src/views/Landing.jsx";
import PublicPageProviders from "../../../src/components/app/PublicPageProviders.jsx";
import { APP_NAME, BRAND_MARK } from "../../../src/lib/brand.js";

export const metadata = {
  alternates: { canonical: "/landing" },
  description:
    "Administra tu liga de futbol, equipos, torneos, jornadas y resultados desde un solo lugar.",
  openGraph: {
    description:
      "Gestion integral para ligas y torneos de futbol.",
    images: [BRAND_MARK],
    locale: "es_MX",
    title: `${APP_NAME} | Gestion de ligas`,
    type: "website",
  },
  title: `Gestiona tu liga | ${APP_NAME}`,
};

export default function LandingPage() {
  return (
    <PublicPageProviders>
      <Landing />
    </PublicPageProviders>
  );
}
