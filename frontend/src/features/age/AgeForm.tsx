/** Support repeated local age checks with associated validation and no stale result. */
import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { classifyAge } from './classifyAge';
import type { AgeClassification } from './classifyAge';
import { AgeResult } from './AgeResult';

/**
 * Render an age field that preserves untrusted text until explicit submission.
 *
 * Returns:
 *   Labeled controls, associated errors, and a persistent status region.
 * Notes:
 *   Every edit clears feedback. All input and result state stays in this mount.
 */
export function AgeForm() {
  const [rawAge, setRawAge] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgeClassification | null>(null);
  const ageRef = useRef<HTMLInputElement>(null);

  /**
   * Prevent transmission and replace feedback using the exact text validator.
   *
   * Args:
   *   event: Native form submission, including keyboard submission.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = classifyAge(rawAge);
    if (!checked.valid) {
      setResult(null);
      setError(checked.error);
      ageRef.current!.focus();
      return;
    }
    setError(null);
    setResult(checked.result);
  }

  /**
   * Preserve raw edits and remove feedback belonging to the previous value.
   *
   * Args:
   *   event: Text change, including paste or invalid notation.
   */
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setRawAge(event.target.value);
    setError(null);
    setResult(null);
  }

  return (
    <>
      <p id="age-rule" className="intro">
        Enter your age in completed years. This demo uses 18 as its threshold.
      </p>
      <form noValidate onSubmit={handleSubmit} aria-describedby="age-rule age-disclaimer">
        <div className="field">
          <label htmlFor="demo-age">Age</label>
          <input
            ref={ageRef}
            id="demo-age"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            aria-required="true"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'age-rule age-error' : 'age-rule'}
            value={rawAge}
            onChange={handleChange}
          />
          {error && (
            <p id="age-error" className="field-error" role="alert">{error}</p>
          )}
        </div>
        <button type="submit">Check Age</button>
      </form>
      <AgeResult result={result} />
      <p id="age-disclaimer" className="privacy-note">
        Demo classification only, not legal advice or verified age. Nothing is sent or saved.
        Reloading returns you to login and clears your age and result.
      </p>
    </>
  );
}
