import PrivatePageShell from "../../../src/components/app/PrivatePageShell.jsx";
import { getPrivatePageAuth } from "../../../src/server/auth/privatePageAccess.js";
import { Partidos } from "../../../src/views/Partidos.jsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { follow: false, index: false },
  title: "Partidos | Bracket App",
};

export default async function MatchesPage() {
  const pathname = "/partidos";
  const initialAuth = await getPrivatePageAuth({ pathname });

  return (
    <PrivatePageShell initialAuth={initialAuth}>
      <Partidos />
    </PrivatePageShell>
  );
}
