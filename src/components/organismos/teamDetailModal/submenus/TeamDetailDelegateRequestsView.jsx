import React from "react";
import { RiArrowLeftLine } from "react-icons/ri";
import { LigaDelegateRequestsTab } from "../../tabs/liga/LigaDelegateRequestsTab";
import { BackButton, HeaderActions, InternalView } from "../styles";

export function TeamDetailDelegateRequestsView({
  canReview = false,
  loading = false,
  onBack,
  onRefresh,
  onReview,
  requests = [],
  team,
}) {
  return (
    <InternalView>
      <HeaderActions>
        <BackButton type="button" onClick={onBack}>
          <RiArrowLeftLine />
          <span>Volver a la ficha</span>
        </BackButton>
      </HeaderActions>

      <LigaDelegateRequestsTab
        canReview={canReview}
        loading={loading}
        onRefresh={onRefresh}
        onReview={onReview}
        requests={requests}
        subtitle={`Solo se muestran las solicitudes registradas para ${team?.name || "este equipo"}.`}
        title="Solicitudes del delegado"
      />
    </InternalView>
  );
}
