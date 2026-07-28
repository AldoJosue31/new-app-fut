import PrivatePageShell from "../../../../src/components/app/PrivatePageShell.jsx";
import { getPrivatePageAuth } from "../../../../src/server/auth/privatePageAccess.js";
import { AdminManagers } from "../../../../src/views/AdminManagers.jsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { follow: false, index: false },
  title: "Gestion de Managers | Bracket App",
};

export default async function AdminManagersPage() {
  const pathname = "/admin/managers";
  const initialAuth = await getPrivatePageAuth({ pathname });

  return (
    <PrivatePageShell initialAuth={initialAuth}>
      <AdminManagers />
    </PrivatePageShell>
  );
}
