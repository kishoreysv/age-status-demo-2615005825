/** Validate exact whole-year text and apply the demonstration threshold locally. */
export interface AgeClassification {
  age: number;
  status: 'Major' | 'Minor';
}

export type AgeCheck =
  | { valid: true; result: AgeClassification }
  | { valid: false; error: string };

/**
 * Classify trimmed ASCII digits without rounding unsafe integers.
 *
 * Args:
 *   rawAge: Untrusted text from the age control, preserved by the caller.
 * Returns:
 *   A normalized age and demo status, or a fixed message that never echoes input.
 * Notes:
 *   Pure and memory-only. No arbitrary human-age maximum is imposed.
 */
export function classifyAge(rawAge: string): AgeCheck {
  const trimmed = rawAge.trim();
  if (!/^[0-9]+$/.test(trimmed)) {
    return { valid: false, error: 'Enter a non-negative whole-number age using digits only.' };
  }
  const age = Number(trimmed);
  if (!Number.isSafeInteger(age)) {
    return { valid: false, error: 'Enter a whole-number age that can be represented exactly (up to 9007199254740991).' };
  }
  return { valid: true, result: { age, status: age >= 18 ? 'Major' : 'Minor' } };
}
