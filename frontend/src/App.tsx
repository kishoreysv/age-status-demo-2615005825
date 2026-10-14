/** Sequence the demo with a memory-only gate; age checking is a separate slice. */
import { useEffect, useRef, useState } from 'react';
import { LoginForm } from './features/login/LoginForm';

/**
 * Keep the simulated session inside this mounted React tree.
 *
 * Returns:
 *   Login initially, or a meaningful signed-in confirmation after acceptance.
 * Notes:
 *   Reload/remount resets the session. This gate is not a security boundary.
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
          <p className="confirmation" role="status">Demo login successful. You’re signed in for this session.</p>
          <p className="intro">The age check will appear in the next feature. No age is requested or classified yet.</p>
          <p className="privacy-note">This is a simulated session, not verified identity. Reloading returns you to login.</p>
        </section>
      ) : (
        <LoginForm onSuccess={() => setSignedIn(true)} />
      )}
    </main>
  );
}
