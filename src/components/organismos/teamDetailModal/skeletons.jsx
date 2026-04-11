import React from "react";
import { Skeleton } from "../../atomos/Skeleton";
import {
  MatchCard,
  PlayerCell,
  PlayerSkeletonWrapper,
  UpcomingCard,
} from "./styles";

export const PlayerSkeleton = () => (
  <PlayerSkeletonWrapper>
    <Skeleton type="circle" width="60px" height="60px" />
    <div className="info-sk">
      <Skeleton width="70%" height="14px" />
      <Skeleton width="40%" height="10px" />
    </div>
  </PlayerSkeletonWrapper>
);

export const MatchCardSkeleton = () => (
  <MatchCard>
    <div className="match-header">
      <Skeleton width="40px" height="12px" radius="4px" />
      <Skeleton width="18px" height="18px" radius="4px" />
    </div>
    <Skeleton width="50px" height="10px" style={{ margin: "4px 0" }} />
    <Skeleton width="70px" height="24px" radius="6px" />
    <div className="rival-container" style={{ marginTop: "8px" }}>
      <Skeleton width="28px" height="28px" radius="50%" />
      <Skeleton width="60px" height="10px" />
    </div>
  </MatchCard>
);

export const UpcomingRivalSkeleton = () => (
  <UpcomingCard>
    <Skeleton width="70%" height="12px" radius="999px" />
    <div className="logo-slot">
      <Skeleton width="42px" height="42px" radius="50%" />
    </div>
    <Skeleton width="75%" height="14px" />
    <Skeleton width="60%" height="11px" />
    <Skeleton width="45%" height="10px" />
  </UpcomingCard>
);

export const StatTableRowSkeleton = () => (
  <tr>
    <td className="col-player">
      <PlayerCell>
        <Skeleton width="24px" height="24px" radius="50%" />
        <div className="p-info" style={{ gap: "4px", flex: 1 }}>
          <Skeleton width="60%" height="12px" />
          <Skeleton width="30%" height="10px" />
        </div>
      </PlayerCell>
    </td>
    <td className="col-stat">
      <Skeleton width="16px" height="16px" style={{ margin: "0 auto" }} />
    </td>
    <td className="col-stat">
      <Skeleton width="16px" height="16px" style={{ margin: "0 auto" }} />
    </td>
    <td className="col-stat">
      <Skeleton width="16px" height="16px" style={{ margin: "0 auto" }} />
    </td>
    <td className="col-stat">
      <Skeleton width="16px" height="16px" style={{ margin: "0 auto" }} />
    </td>
  </tr>
);
