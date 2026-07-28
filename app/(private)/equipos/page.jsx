import TeamsPageContent from "../../../src/server/teams/TeamsPageContent.jsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { follow: false, index: false },
  title: "Equipos | Bracket App",
};

export default function TeamsPage({ searchParams }) {
  return <TeamsPageContent searchParams={searchParams} />;
}
