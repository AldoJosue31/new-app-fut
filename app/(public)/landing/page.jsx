import Landing from "../../../src/views/Landing.jsx";
import PublicPageProviders from "../../../src/components/app/PublicPageProviders.jsx";

export const metadata = {
  alternates: { canonical: "/landing" },
  description:
    "Administra tu liga de futbol, equipos, torneos, jornadas y resultados desde un solo lugar.",
  openGraph: {
    description:
      "Gestion integral para ligas y torneos de futbol.",
    images: ["/logo_app.png"],
    locale: "es_MX",
    title: "Bracket App | Gestion de ligas",
    type: "website",
  },
  title: "Gestiona tu liga | Bracket App",
};

export default function LandingPage() {
  return (
    <PublicPageProviders>
      <Landing />
    </PublicPageProviders>
  );
}
