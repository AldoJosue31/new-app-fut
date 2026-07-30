import PrivatePageShell from "../../../../src/components/app/PrivatePageShell.jsx";
import { getPrivatePageAuth } from "../../../../src/server/auth/privatePageAccess.js";
import { Liga } from "../../../../src/views/Liga.jsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { follow: false, index: false },
  title: "Mi Liga | Bracket App",
};

export default async function LeagueTabPage({ params }) {
  const { tab } = await params;
  const pathname = `/liga/${encodeURIComponent(tab)}`;
  const initialAuth = await getPrivatePageAuth({ pathname });

  return (
    <PrivatePageShell initialAuth={initialAuth}>
      <Liga routeTab={tab} />
    </PrivatePageShell>
  );
}
