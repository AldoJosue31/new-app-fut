import PublicPageProviders from "../../../src/components/app/PublicPageProviders.jsx";
import ResetPasswordTemplate from "../../../src/components/template/ResetPasswordTemplate.jsx";
import { createServerSupabaseClient } from "../../../src/lib/supabase/serverClient.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  robots: { follow: false, index: false },
  title: "Restablecer contraseña | Bracket App",
};

export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;
  let sessionState = "invalid";
  if (params?.error === "verification_unavailable") sessionState = "unavailable";
  else if (!params?.error) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.auth.getUser();
      if (data?.user?.id && !error) sessionState = "ready";
      else if (error?.status >= 500 || error?.name === "AuthRetryableFetchError") sessionState = "unavailable";
    } catch { sessionState = "unavailable"; }
  }
  return (
    <PublicPageProviders>
      <ResetPasswordTemplate sessionState={sessionState} />
    </PublicPageProviders>
  );
}
