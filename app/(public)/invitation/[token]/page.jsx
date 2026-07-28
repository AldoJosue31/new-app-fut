import { RegisterManagerTemplate } from "../../../../src/components/template/RegisterManagerTemplate.jsx";
import PublicPageProviders from "../../../../src/components/app/PublicPageProviders.jsx";
import { loadManagerInvitation } from "../../../../src/server/public/publicPageData.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { follow: false, index: false },
  title: "Invitacion de Manager | Bracket App",
};

export default async function ManagerInvitationPage({ params }) {
  const { token } = await params;
  const { invitation, error } = await loadManagerInvitation(token);

  return (
    <PublicPageProviders>
      <RegisterManagerTemplate
        token={token}
        initialInvitation={invitation}
        initialError={error}
      />
    </PublicPageProviders>
  );
}
