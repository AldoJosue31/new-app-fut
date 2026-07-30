import { redirect } from "next/navigation";

import Landing from "../../src/views/Landing.jsx";
import {
  getDefaultAuthenticatedPath,
} from "../../src/lib/auth/routeAccess.js";
import { getServerAuthSnapshot } from "../../src/server/auth/serverAuth.js";
import PublicPageProviders from "../../src/components/app/PublicPageProviders.jsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  alternates: { canonical: "/" },
  description:
    "Administra ligas, equipos, torneos, jornadas y resultados de futbol.",
  openGraph: {
    description:
      "Gestion integral para ligas y torneos de futbol.",
    images: ["/logo_app.png"],
    locale: "es_MX",
    title: "Bracket App",
    type: "website",
  },
  title: "Bracket App | Gestion de ligas de futbol",
};

export default async function HomePage() {
  const initialAuth = await getServerAuthSnapshot();

  if (initialAuth.status === "authenticated") {
    redirect(getDefaultAuthenticatedPath(initialAuth.profile.role));
  }

  return (
    <PublicPageProviders>
      <Landing />
    </PublicPageProviders>
  );
}
