import TeamsPageContent from "../../../../../../src/server/teams/TeamsPageContent.jsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { follow: false, index: false },
  title: "Equipo | Bracket App",
};

export default async function DivisionTeamPage({
  params,
  searchParams,
}) {
  const { divisionId, teamId } = await params;

  return (
    <TeamsPageContent
      divisionId={divisionId}
      teamId={teamId}
      searchParams={searchParams}
    />
  );
}
