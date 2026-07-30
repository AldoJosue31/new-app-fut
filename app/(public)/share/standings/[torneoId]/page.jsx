import PublicPageProviders from "../../../../../src/components/app/PublicPageProviders.jsx";
import { loadPublicTournament } from "../../../../../src/server/public/publicPageData.js";
import { PublicStandings } from "../../../../../src/views/PublicStandings.jsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  description:
    "Consulta la tabla, goleadores y cuadro publico del torneo.",
  openGraph: {
    description:
      "Tabla y resultados publicos del torneo en Bracket App.",
    images: ["/logo_app.png"],
    locale: "es_MX",
    title: "Tabla publica | Bracket App",
    type: "website",
  },
  title: "Tabla publica | Bracket App",
};

export default async function PublicStandingsPage({ params }) {
  const { torneoId } = await params;
  const { bundle, error } = await loadPublicTournament(torneoId);

  return (
    <PublicPageProviders>
      <PublicStandings
        torneoId={torneoId}
        initialBundle={bundle}
        initialError={error}
      />
    </PublicPageProviders>
  );
}
