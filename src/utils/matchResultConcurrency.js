export const MATCH_RESULT_CONFLICT_CODE = "RESULT_STALE";

export const createMatchResultConflictError = (cause) => {
  const error = new Error(
    "Este partido fue actualizado desde otra pestaña o dispositivo. Revisa la versión vigente antes de guardar de nuevo.",
  );

  error.name = "MatchResultConflictError";
  error.code = MATCH_RESULT_CONFLICT_CODE;
  error.cause = cause;
  return error;
};

export const isMatchResultConflictError = (error) => (
  error?.code === MATCH_RESULT_CONFLICT_CODE ||
  error?.message === MATCH_RESULT_CONFLICT_CODE
);

export const normalizeMatchResultRevision = (revision) => {
  if (
    revision === null ||
    revision === undefined ||
    typeof revision === "boolean" ||
    (typeof revision === "string" && revision.trim() === "")
  ) {
    throw new Error("La versión del resultado del partido no es válida.");
  }

  const numericRevision = Number(revision);

  if (!Number.isSafeInteger(numericRevision) || numericRevision < 0) {
    throw new Error("La versión del resultado del partido no es válida.");
  }

  return numericRevision;
};
