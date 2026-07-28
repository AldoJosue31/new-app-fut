import TournamentsPageContent from "../../../../../../src/server/tournaments/TournamentsPageContent.jsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { follow: false, index: false },
  title: "Jornada | Bracket App",
};

export default async function TournamentRoundPage({ params }) {
  const { jornadaId, tab, tournamentOrTab } = await params;

  return (
    <TournamentsPageContent
      jornadaId={jornadaId}
      tab={tab}
      tournamentOrTab={tournamentOrTab}
    />
  );
}
