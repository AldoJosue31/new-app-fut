import "client-only";

export const getModalRoot = () =>
  document.getElementById("modal-root") || document.body;
