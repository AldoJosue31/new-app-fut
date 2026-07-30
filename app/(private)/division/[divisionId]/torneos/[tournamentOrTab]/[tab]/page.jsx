import TournamentsPageContent from "../../../../../../../src/server/tournaments/TournamentsPageContent.jsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { follow: false, index: false },
  title: "Torneo | Bracket App",
};

export default async function DivisionTournamentTabPage({ params }) {
  const { divisionId, tab, tournamentOrTab } = await params;

  return (
    <TournamentsPageContent
      divisionId={divisionId}
      tab={tab}
      tournamentOrTab={tournamentOrTab}
    />
  );
}
