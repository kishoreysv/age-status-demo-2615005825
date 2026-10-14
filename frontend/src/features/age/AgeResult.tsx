/** Announce only the submitted normalized age and the demo classification rule. */
import type { AgeClassification } from './classifyAge';

interface AgeResultProps {
  result: AgeClassification | null;
}

/**
 * Keep an announcement region mounted while clearing obsolete feedback.
 *
 * Args:
 *   result: Accepted classification, or null before submission and after edits.
 * Returns:
 *   Plain status and rule explanation, never a legal or verified-age assertion.
 */
export function AgeResult({ result }: AgeResultProps) {
  return (
    <div className="age-result" role="status" aria-live="polite" aria-atomic="true">
      {result && (
        <>
          <h2>{result.status}</h2>
          <p>
            Submitted age: {result.age}. In this demo, ages {result.status === 'Major' ? '18 or above are Major' : 'below 18 are Minor'}.
          </p>
        </>
      )}
    </div>
  );
}
