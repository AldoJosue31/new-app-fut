import PrivatePageShell from "../../../src/components/app/PrivatePageShell.jsx";
import { getPrivatePageAuth } from "../../../src/server/auth/privatePageAccess.js";
import { Home } from "../../../src/views/Home.jsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { follow: false, index: false },
  title: "Dashboard | Bracket App",
};

export default async function DashboardPage() {
  const pathname = "/dashboard";
  const initialAuth = await getPrivatePageAuth({ pathname });

  return (
    <PrivatePageShell initialAuth={initialAuth}>
      <Home />
    </PrivatePageShell>
  );
}
