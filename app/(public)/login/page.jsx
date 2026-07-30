import { redirect } from "next/navigation";

import LoginTemplate from "../../../src/components/template/LoginTemplate.jsx";
import {
  getDefaultAuthenticatedPath,
} from "../../../src/lib/auth/routeAccess.js";
import {
  ROUTES,
  sanitizeInternalPath,
} from "../../../src/lib/navigation/routes.js";
import PublicPageProviders from "../../../src/components/app/PublicPageProviders.jsx";
import { getServerAuthSnapshot } from "../../../src/server/auth/serverAuth.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { follow: false, index: false },
  title: "Ingresar | Bracket App",
};

const readSearchValue = (value) =>
  Array.isArray(value) ? value[0] : value;

export default async function LoginPage({ searchParams }) {
  const [initialAuth, resolvedSearchParams] = await Promise.all([
    getServerAuthSnapshot(),
    searchParams,
  ]);

  if (initialAuth.status === "authenticated") {
    const fallback = getDefaultAuthenticatedPath(
      initialAuth.profile.role,
    );
    const destination = sanitizeInternalPath(
      readSearchValue(resolvedSearchParams?.next),
      fallback,
    );
    redirect(destination === ROUTES.LOGIN ? fallback : destination);
  }

  return (
    <PublicPageProviders initialAuth={initialAuth}>
      <LoginTemplate />
    </PublicPageProviders>
  );
}
