import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import styled from "styled-components";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { RiFileList3Line, RiGroupLine } from "react-icons/ri";
import { IoMdFootball } from "react-icons/io";
import { ContentContainer } from "../atomos/ContentContainer";
import { PageHeader } from "../moleculas/PageHeader";
import { BtnNormal } from "../moleculas/BtnNormal";
import { TabsNavigation, TabContent } from "../moleculas/TabsNavigation";
import { Skeleton } from "../atomos/Skeleton";
import { Toast } from "../atomos/Toast";
import {
  TeamCard,
  TeamForm,
  TeamTransferModal,
  TeamDetailModal,
  PlayerManager,
  Card,
  BtnGreen,
} from "../../index";
import { Modal } from "../organismos/Modal";
import { ConfirmModal } from "../organismos/ConfirmModal";
import { EmptyState } from "../organismos/EmptyState";
import { supabase } from "../../supabase/supabase.config";
import { useDivisionStore } from "../../store/DivisionStore";
import { ROLES } from "../../utils/constants";

export const EquiposTemplate = ({
  equipos,
  division,
  loading,
  isUploading,
  form,
  preview,
  file,
  originalFile,
  isFormOpen,
  setIsFormOpen,
  teamToEdit,
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  onFormChange,
  onFileChange,
  onClearImage,
  onGenerateLogo,
  onRemoveBg,
  onSave,
  onDelete,
  onCreate,
  onEdit,
  onConfirmDelete,
  onDelegateLinkStateChanged,
  onDelegateRequestSubmitted,
  tabs,
  participatingIds = [],
  state,
  setState,
  accessRole,
  canCreateTeams = true,
  canDeleteTeams = true,
  canTransferTeams = true,
  requestSummariesLoading = false,
  delegateRequestOverview = {
    pendingCount: 0,
    pendingTeamsCount: 0,
    approvedTeamsCount: 0,
    rejectedTeamsCount: 0,
  },
}) => {
  const { divisionId: routeDivisionId, teamId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialView = location.state?.initialView;
  const visibleDivisionId = routeDivisionId || division?.id;
  const isCreateRoute = teamId === "crear";
  const isDelegateView = accessRole === ROLES.DELEGATE;
  const teamFromUrl = isCreateRoute
    ? null
    : equipos?.find((team) => String(team.id) === String(teamId));
  const teamFromUrlDivision = teamFromUrl?.division || division;
  const hasPendingDelegateRequests = delegateRequestOverview.pendingCount > 0;
  const hasDelegateReviewedUpdates =
    delegateRequestOverview.approvedTeamsCount > 0 ||
    delegateRequestOverview.rejectedTeamsCount > 0;
  const delegateReviewedSummary = [
    delegateRequestOverview.approvedTeamsCount > 0
      ? `${delegateRequestOverview.approvedTeamsCount} aprobado${
          delegateRequestOverview.approvedTeamsCount === 1 ? "" : "s"
        }`
      : null,
    delegateRequestOverview.rejectedTeamsCount > 0
      ? `${delegateRequestOverview.rejectedTeamsCount} rechazado${
          delegateRequestOverview.rejectedTeamsCount === 1 ? "" : "s"
        }`
      : null,
  ]
    .filter(Boolean)
    .join(" y ");

  const modalTabs = [
    { id: "info", label: "Datos del Equipo", icon: <RiFileList3Line /> },
    { id: "players", label: "Jugadores", icon: <RiGroupLine /> },
  ];

  const [activeTab, setActiveTab] = useState("info");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [teamToTransfer, setTeamToTransfer] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: "", type: "success" });
  const hasOpenedCreateRouteRef = useRef(false);
  const detailScrollPositionRef = useRef(0);
  const pendingDetailScrollPreserveOnOpenRef = useRef(false);
  const pendingDetailScrollRestoreRef = useRef(false);
  const { divisiones } = useDivisionStore();

  const showToast = (msg, type = "success") =>
    setToast({ show: true, msg, type });

  const getEquiposPath = (nextTeamId = "") => {
    const suffix = nextTeamId ? `/${nextTeamId}` : "";
    return visibleDivisionId
      ? `/division/${visibleDivisionId}/equipos${suffix}`
      : `/equipos${suffix}`;
  };

  useEffect(() => {
    if (!routeDivisionId && division?.id && !isDelegateView) {
      const suffix = teamId ? `/${teamId}` : "";
      navigate(`/division/${division.id}/equipos${suffix}`, {
        replace: true,
        preventScrollReset: true,
        state: location.state,
      });
    }
  }, [division?.id, isDelegateView, location.state, navigate, routeDivisionId, teamId]);

  useEffect(() => {
    if (!isCreateRoute) {
      hasOpenedCreateRouteRef.current = false;
      return;
    }

    if (isDelegateView) {
      navigate(visibleDivisionId ? `/division/${visibleDivisionId}/equipos` : "/equipos", {
        replace: true,
      });
      return;
    }

    if (isFormOpen) {
      hasOpenedCreateRouteRef.current = true;
      return;
    }

    if (!hasOpenedCreateRouteRef.current && !isFormOpen) {
      hasOpenedCreateRouteRef.current = true;
      onCreate();
    }
  }, [isCreateRoute, isDelegateView, isFormOpen, navigate, onCreate, visibleDivisionId]);

  useEffect(() => {
    if (isFormOpen) {
      setActiveTab("info");
    }
  }, [isFormOpen]);

  useLayoutEffect(() => {
    if (teamFromUrl && pendingDetailScrollPreserveOnOpenRef.current) {
      pendingDetailScrollPreserveOnOpenRef.current = false;
      window.scrollTo({
        top: detailScrollPositionRef.current,
        left: 0,
        behavior: "auto",
      });
      return;
    }

    if (teamFromUrl || !pendingDetailScrollRestoreRef.current) return;

    pendingDetailScrollRestoreRef.current = false;
    window.scrollTo({
      top: detailScrollPositionRef.current,
      left: 0,
      behavior: "auto",
    });
  }, [teamFromUrl]);

  const handleViewTeam = (team) => {
    detailScrollPositionRef.current =
      window.scrollY || document.documentElement.scrollTop || 0;
    pendingDetailScrollPreserveOnOpenRef.current = true;
    navigate(getEquiposPath(team.id), { preventScrollReset: true });
  };

  const handleCloseDetail = () => {
    pendingDetailScrollRestoreRef.current = true;
    navigate(getEquiposPath(), { preventScrollReset: true });
  };

  const handleOpenCreate = () => {
    if (!canCreateTeams) return;
    hasOpenedCreateRouteRef.current = true;
    onCreate();
    navigate(getEquiposPath("crear"));
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    if (isCreateRoute) {
      navigate(getEquiposPath());
    }
  };

  const handleSaveWrapper = async (event) => {
    try {
      const result = await onSave(event);
      showToast(
        result?.successMessage ||
          (teamToEdit ? "Equipo actualizado" : "Equipo creado"),
        "success"
      );

      if (isCreateRoute) {
        navigate(getEquiposPath());
      }
    } catch (error) {
      showToast("Error al guardar: " + error.message, "error");
    }
  };

  const handleTransferSubmit = async (targetId, team) => {
    if (!targetId) {
      showToast("Selecciona una division", "error");
      return;
    }

    try {
      const { error } = await supabase
        .from("teams")
        .update({ division_id: targetId })
        .eq("id", team.id);

      if (error) throw error;

      showToast("Equipo transferido correctamente", "success");
      setIsTransferModalOpen(false);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      showToast("Error: " + error.message, "error");
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await onConfirmDelete();
      showToast("Equipo eliminado", "success");
    } catch (error) {
      showToast("Error al eliminar: " + error.message, "error");
    }
  };

  const emptyDescription = isDelegateView
    ? "Aun no tienes equipos asignados. Pide al manager que te vincule a un equipo."
    : division
      ? `No hay equipos en ${division.name}`
      : "Selecciona una division";

  const viewMaxWidth = "1400px";

  return (
    <>
      <PageHeader
        title={isDelegateView ? "Mis Equipos" : "Equipos"}
        tabs={tabs}
        maxWidth={viewMaxWidth}
        marginBottom="0"
        state={state}
        setState={setState}
      />

      <StyledContentContainer>
        <MainContainer $maxWidth={viewMaxWidth} $hasFloatingButton={canCreateTeams}>
          {isDelegateView && (
            <AccessBanner>
              Puedes editar tu equipo y registrar jugadores. Si la liga exige aprobacion,
              tus cambios se enviaran al manager antes de publicarse.
              {!requestSummariesLoading &&
                (hasPendingDelegateRequests || hasDelegateReviewedUpdates) && (
                  <BannerMeta>
                    {hasPendingDelegateRequests &&
                      `${delegateRequestOverview.pendingCount} cambio${
                        delegateRequestOverview.pendingCount === 1 ? "" : "s"
                      } en revision.`}
                    {hasDelegateReviewedUpdates &&
                      ` ${delegateReviewedSummary} en tus ultimas respuestas.`}
                  </BannerMeta>
                )}
            </AccessBanner>
          )}

          {!isDelegateView && !requestSummariesLoading && hasPendingDelegateRequests && (
            <RequestBanner>
              Hay {delegateRequestOverview.pendingCount} solicitud
              {delegateRequestOverview.pendingCount === 1 ? "" : "es"} pendiente
              {delegateRequestOverview.pendingCount === 1 ? "" : "s"} de delegados en{" "}
              {delegateRequestOverview.pendingTeamsCount} equipo
              {delegateRequestOverview.pendingTeamsCount === 1 ? "" : "s"}. Puedes
              revisarla{delegateRequestOverview.pendingCount === 1 ? "" : "s"} desde Mi
              Liga.
            </RequestBanner>
          )}

          {canCreateTeams && (
            <FloatingBtnWrapper>
              <BtnGreen
                onClick={handleOpenCreate}
                disabled={!division}
                icono={<IoMdFootball size={18} />}
              >
                Crear Equipo
              </BtnGreen>
            </FloatingBtnWrapper>
          )}

          <Card width="100%" maxWidth="100%">
            <div style={{ width: "100%" }}>
              <Grid>
                {loading ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <TeamCardSkeleton key={index} />
                  ))
                ) : (
                  <>
                    {Array.isArray(equipos) &&
                      equipos.map((team) => {
                        const isParticipating = participatingIds.some(
                          (id) => String(id) === String(team.id)
                        );

                        return (
                          <TeamCard
                            key={team.id}
                            team={team}
                            onEdit={onEdit}
                            onView={handleViewTeam}
                            onDelete={onDelete}
                            onTransfer={(currentTeam) => {
                              setTeamToTransfer(currentTeam);
                              setIsTransferModalOpen(true);
                            }}
                            isParticipating={isParticipating}
                            showTransferAction={canTransferTeams}
                            showDeleteAction={canDeleteTeams}
                            requestStatusMode={isDelegateView ? "delegate" : "manager"}
                          />
                        );
                      })}

                    {(!equipos || equipos.length === 0) && (
                      <div style={{ gridColumn: "1 / -1", width: "100%" }}>
                        <EmptyState
                          icon={<IoMdFootball size={48} />}
                          title={isDelegateView ? "Sin Equipos Asignados" : "Sin Equipos"}
                          description={emptyDescription}
                          actionComponent={
                            canCreateTeams ? (
                              <BtnNormal
                                funcion={handleOpenCreate}
                                titulo="Crear Primer Equipo"
                                disabled={!division}
                              />
                            ) : null
                          }
                        />
                      </div>
                    )}
                  </>
                )}
              </Grid>
            </div>
          </Card>
        </MainContainer>

        <Modal
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title={
            teamToEdit
              ? `Editar: ${teamToEdit.name}`
              : isDelegateView
                ? "Actualizar equipo"
                : "Nuevo Equipo"
          }
          closeOnOverlayClick={false}
        >
          {teamToEdit && (
            <TabsWrapper>
              <TabsNavigation
                tabs={modalTabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </TabsWrapper>
          )}

          {activeTab === "info" && (
            <TabContent>
              <TeamForm
                form={form}
                onFormChange={onFormChange}
                onSave={handleSaveWrapper}
                isUploading={isUploading}
                preview={preview}
                file={file}
                originalFile={originalFile}
                onFileChange={onFileChange}
                onClearImage={onClearImage}
                onGenerateLogo={onGenerateLogo}
                onRemoveBg={onRemoveBg}
                showToast={showToast}
                teamToEdit={teamToEdit}
                allowStatusEdit={!isDelegateView}
                canManageDelegateLink={!isDelegateView}
                teamId={teamToEdit?.id || null}
                linkedDelegateAssignment={teamToEdit?.delegateAssignment || null}
                onDelegateLinkStateChanged={onDelegateLinkStateChanged}
                saveLabel={isDelegateView ? "Enviar cambios" : "Guardar Equipo"}
              />
            </TabContent>
          )}

          {activeTab === "players" && teamToEdit && (
            <TabContent>
              <PlayerManager
                teamId={teamToEdit.id}
                leagueId={teamToEdit?.league?.id || division?.league_id}
                showToast={showToast}
                mode={isDelegateView ? "delegate" : "manager"}
                onDelegateRequestSubmitted={onDelegateRequestSubmitted}
              />
            </TabContent>
          )}
        </Modal>

        <TeamDetailModal
          isOpen={!!teamFromUrl}
          onClose={handleCloseDetail}
          team={teamFromUrl}
          division={teamFromUrlDivision}
          initialView={initialView}
          canReviewDelegateRequests={!isDelegateView}
          onDelegateRequestsUpdated={onDelegateRequestSubmitted}
        />

        <TeamTransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          team={teamToTransfer}
          divisiones={divisiones}
          currentDivision={division}
          onConfirm={handleTransferSubmit}
        />

        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Eliminar Equipo"
          message="Deseas eliminar este equipo?"
        />

        <Toast
          show={toast.show}
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast((current) => ({ ...current, show: false }))}
        />
      </StyledContentContainer>
    </>
  );
};

const StyledContentContainer = styled(ContentContainer)`
  && {
    padding-top: 0 !important;
    margin-top: 0 !important;
  }
`;

const MainContainer = styled.div`
  width: 100%;
  max-width: ${(props) => props.$maxWidth || "1400px"};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  margin-top: ${({ $hasFloatingButton }) => ($hasFloatingButton ? "60px" : "20px")};
  position: relative;
`;

const FloatingBtnWrapper = styled.div`
  position: absolute;
  top: -50px;
  right: 0;
  z-index: 10;

  & > button {
    margin: 0 !important;
    width: auto !important;
    white-space: nowrap;

    @media (max-width: 768px) {
      width: auto !important;
      height: auto !important;
      padding: 8px 16px !important;

      span {
        display: inline-block !important;
        font-size: 13px;
      }

      svg {
        margin-right: 6px;
      }
    }
  }
`;

const AccessBanner = styled.div`
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(243, 156, 18, 0.12), rgba(243, 156, 18, 0.04));
  border: 1px solid rgba(243, 156, 18, 0.22);
  font-size: 0.92rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.text};
`;

const BannerMeta = styled.div`
  margin-top: 8px;
  font-size: 0.88rem;
  opacity: 0.9;
`;

const RequestBanner = styled.div`
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255, 184, 0, 0.16), rgba(255, 184, 0, 0.06));
  border: 1px solid rgba(255, 184, 0, 0.28);
  color: ${({ theme }) => theme.text};
  font-size: 0.92rem;
  line-height: 1.5;
`;

const Grid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 25px;
  width: 100%;
`;

const TabsWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
`;

const TeamCardSkeleton = () => (
  <SkeletonContainer>
    <div className="header-sk">
      <Skeleton width="100%" height="100%" radius="0" />
      <div className="logo-sk">
        <Skeleton type="circle" width="85px" height="85px" />
      </div>
    </div>
    <div className="body-sk">
      <Skeleton width="70%" height="20px" />
      <Skeleton width="50%" height="14px" />
    </div>
  </SkeletonContainer>
);

const SkeletonContainer = styled.div`
  width: 250px;
  height: 260px;
  background-color: ${({ theme }) => theme.bgtotal};
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 16px;
  overflow: hidden;

  .header-sk {
    height: 110px;
    position: relative;
  }

  .logo-sk {
    position: absolute;
    bottom: -25px;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid ${({ theme }) => theme.bgtotal};
    border-radius: 50%;
  }

  .body-sk {
    padding: 40px 15px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
`;
