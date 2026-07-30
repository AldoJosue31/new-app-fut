import TeamsPageContent from "../../../../../src/server/teams/TeamsPageContent.jsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { follow: false, index: false },
  title: "Equipos | Bracket App",
};

export default async function DivisionTeamsPage({
  params,
  searchParams,
}) {
  const { divisionId } = await params;

  return (
    <TeamsPageContent
      divisionId={divisionId}
      searchParams={searchParams}
    />
  );
}
