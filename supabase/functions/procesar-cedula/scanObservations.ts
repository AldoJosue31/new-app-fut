const MAX_OBSERVATIONS_LENGTH = 1_000;

const ADMINISTRATIVE_PREFIX =
  /^(?:jornada|divisi[oó]n|categor[ií]a|torneo|liga|temporada|grupo|rama|fecha|hora|horario|cancha|campo|sede|equipo\s+local|equipo\s+visitante|local|visitante|[aá]rbitro|resultado|partido\s+n[uú]mero|folio)\b\s*(?::|#|-|=|\d|$)/i;
const OBSERVATION_LABEL =
  /^(?:observaciones?(?:\s+adicionales?)?|notas?)\s*:?\s*$/i;
const STANDALONE_DATE_OR_TIME =
  /^(?:(?:\d{1,2}[/-]){2}\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}(?:\s*(?:a\.?m\.?|p\.?m\.?))?)$/i;

const cleanObservationText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const splitObservationClauses = (value: unknown) =>
  String(value ?? "")
    .replace(/\r?\n|[|;•]/g, "|")
    .split("|")
    .flatMap((section) => section.split(/\s*,\s*/))
    .map(cleanObservationText)
    .filter(Boolean);

/**
 * Conserva solamente hechos narrativos del partido. Los encabezados y valores
 * administrativos de la cedula ya tienen campos propios y no son observaciones.
 */
export const sanitizeMatchObservations = (value: unknown) => {
  const uniqueClauses = new Set<string>();

  for (const clause of splitObservationClauses(value)) {
    if (
      OBSERVATION_LABEL.test(clause) ||
      ADMINISTRATIVE_PREFIX.test(clause) ||
      STANDALONE_DATE_OR_TIME.test(clause)
    ) continue;

    uniqueClauses.add(clause);
  }

  return [...uniqueClauses].join(" | ").slice(0, MAX_OBSERVATIONS_LENGTH);
};
