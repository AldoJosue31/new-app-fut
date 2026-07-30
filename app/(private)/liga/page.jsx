import PrivatePageShell from "../../../src/components/app/PrivatePageShell.jsx";
import { getPrivatePageAuth } from "../../../src/server/auth/privatePageAccess.js";
import { Liga } from "../../../src/views/Liga.jsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { follow: false, index: false },
  title: "Mi Liga | Bracket App",
};

export default async function LeaguePage() {
  const pathname = "/liga";
  const initialAuth = await getPrivatePageAuth({ pathname });

  return (
    <PrivatePageShell initialAuth={initialAuth}>
      <Liga routeTab="general" />
    </PrivatePageShell>
  );
}
