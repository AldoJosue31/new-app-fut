import styled from "styled-components";
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiInformationLine,
} from "react-icons/ri";

const STATUS_META = {
  success: {
    title: "Éxito",
    color: "#53b257",
    Icon: RiCheckboxCircleLine,
  },
  error: {
    title: "Error",
    color: "#f54e41",
    Icon: RiErrorWarningLine,
  },
  info: {
    title: "Información",
    color: "#1cb0f6",
    Icon: RiInformationLine,
  },
};

export function InlineStatus({ message, type = "success" }) {
  const meta = STATUS_META[type] || STATUS_META.info;
  const StatusIcon = meta.Icon;

  return (
    <StatusCard $accent={meta.color} aria-hidden="true">
      <span className="icon-box">
        <StatusIcon />
      </span>
      <span className="content">
        <strong>{meta.title}</strong>
        <span>{message}</span>
      </span>
    </StatusCard>
  );
}

const StatusCard = styled.div`
  position: absolute;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 300px;
  padding: 16px;
  border: 1px solid var(--lp-border, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  background: var(--lp-surface, #181b25);
  box-shadow:
    inset 2px 0 0 ${({ $accent }) => $accent},
    0 10px 30px rgba(0, 0, 0, 0.2);
  color: var(--lp-text, #f8fafc);
  backdrop-filter: blur(10px);

  .icon-box {
    display: flex;
    align-items: center;
    color: ${({ $accent }) => $accent};
    font-size: 24px;
  }

  .content {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
  }

  .content strong {
    font-size: 14px;
  }

  .content span {
    overflow-wrap: anywhere;
    color: var(--lp-text-muted, #94a3b8);
    font-size: 13px;
  }
`;
