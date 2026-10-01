/**
 * Keyword heuristic, not real intent understanding — flags a message as
 * "probably wants to schedule" so the team gets a heads-up to coordinate by
 * hand. No calendar integration or AI classification yet; that's later work.
 */
const SCHEDULING_KEYWORDS =
  /\b(agendar|agenda|reuni[oó]n|diagn[oó]stico|llamada|horario|cita|coordinar|reservar|disponibilidad)\b/i;

export function hasSchedulingIntent(text: string): boolean {
  return SCHEDULING_KEYWORDS.test(text);
}
