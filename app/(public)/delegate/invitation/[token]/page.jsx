import { RegisterDelegateTemplate } from "../../../../../src/components/template/RegisterDelegateTemplate.jsx";
import PublicPageProviders from "../../../../../src/components/app/PublicPageProviders.jsx";
import { loadDelegateInvitation } from "../../../../../src/server/public/publicPageData.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { follow: false, index: false },
  title: "Invitacion de Delegado | Bracket App",
};

export default async function DelegateInvitationPage({ params }) {
  const { token } = await params;
  const { invitation, error } = await loadDelegateInvitation(token);

  return (
    <PublicPageProviders>
      <RegisterDelegateTemplate
        token={token}
        initialInvitation={invitation}
        initialError={error}
      />
    </PublicPageProviders>
  );
}
