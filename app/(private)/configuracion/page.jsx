import PrivatePageShell from "../../../src/components/app/PrivatePageShell.jsx";
import { getPrivatePageAuth } from "../../../src/server/auth/privatePageAccess.js";
import { Configuracion } from "../../../src/views/Configuracion.jsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { follow: false, index: false },
  title: "Configuracion | Bracket App",
};

const serializeSearch = (searchParams) => {
  const search = new URLSearchParams();
  Object.entries(searchParams || {}).forEach(([name, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(name, item));
    } else if (value !== undefined) {
      search.set(name, value);
    }
  });
  return search.toString();
};

export default async function ConfigurationPage({ searchParams }) {
  const pathname = "/configuracion";
  const resolvedSearchParams = await searchParams;
  const search = serializeSearch(resolvedSearchParams);
  const returnPath = search ? `${pathname}?${search}` : pathname;
  const initialAuth = await getPrivatePageAuth({
    pathname,
    returnPath,
  });

  return (
    <PrivatePageShell initialAuth={initialAuth}>
      <Configuracion />
    </PrivatePageShell>
  );
}
