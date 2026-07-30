import TournamentsPageContent from "../../../../../src/server/tournaments/TournamentsPageContent.jsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { follow: false, index: false },
  title: "Torneos | Bracket App",
};

export default async function DivisionTournamentsPage({ params }) {
  const { divisionId } = await params;

  return <TournamentsPageContent divisionId={divisionId} />;
}
