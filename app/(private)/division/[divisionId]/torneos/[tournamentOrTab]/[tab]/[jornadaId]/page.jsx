import TournamentsPageContent from "../../../../../../../../src/server/tournaments/TournamentsPageContent.jsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { follow: false, index: false },
  title: "Jornada | Bracket App",
};

export default async function DivisionTournamentRoundPage({
  params,
}) {
  const {
    divisionId,
    jornadaId,
    tab,
    tournamentOrTab,
  } = await params;

  return (
    <TournamentsPageContent
      divisionId={divisionId}
      jornadaId={jornadaId}
      tab={tab}
      tournamentOrTab={tournamentOrTab}
    />
  );
}
