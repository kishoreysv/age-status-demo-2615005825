/** Sequence public demo login and age checks with a memory-only gate. */
import { useEffect, useRef, useState } from 'react';
import { LoginForm } from './features/login/LoginForm';
import { AgeForm } from './features/age/AgeForm';

/**
 * Keep the simulated session inside this mounted React tree.
 *
 * Returns:
 *   Login initially, or the age form only after credential acceptance.
 * Notes:
 *   Reload/remount resets every value. This gate is not a security boundary.
 */
export default function App() {
  const [signedIn, setSignedIn] = useState(false);
  const nextHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (signedIn) {
      // The signed-in heading is committed before this effect runs.
      nextHeadingRef.current!.focus();
    }
  }, [signedIn]);

  return (
    <main className="demo-shell">
      <header className="brand-line">Age Status Demo</header>
      {signedIn ? (
        <section aria-labelledby="age-heading">
          <p className="step-label">02 / Signed in</p>
          <h1 id="age-heading" ref={nextHeadingRef} tabIndex={-1}>Enter your age</h1>
          <p className="confirmation">Demo login successful. You’re signed in for this session.</p>
          <AgeForm />
        </section>
      ) : (
        <LoginForm onSuccess={() => setSignedIn(true)} />
      )}
    </main>
  );
}
