/** Present the public demo fixture and an accessible, client-only login form. */
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { DEMO_EMAIL, DEMO_PASSWORD, validateCredentials } from './credentials';
import type { CredentialErrors } from './credentials';

interface LoginFormProps {
  onSuccess: () => void;
}

/**
 * Render labeled controls with field-associated feedback and safe public hints.
 *
 * Args:
 *   onSuccess: Unlock the next view only after the pure validator accepts input.
 * Returns:
 *   The login view, without network requests or browser storage.
 */
export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<CredentialErrors>({});
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  /**
   * Prevent native submission and focus the first field requiring correction.
   *
   * Args:
   *   event: Local form submission; values must never leave the browser.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateCredentials(email, password);
    if (!result.valid) {
      setErrors(result.errors);
      // Both controls are mounted for the lifetime of this submit handler.
      if (result.errors.email) {
        emailRef.current!.focus();
      } else {
        passwordRef.current!.focus();
      }
      return;
    }
    onSuccess();
  }

  return (
    <section aria-labelledby="login-heading">
      <p className="step-label">01 / Demo login</p>
      <h1 id="login-heading">Try the demo.</h1>
      <p className="intro">Use the public details below to begin. No account needed.</p>

      <section className="demo-details" aria-labelledby="credentials-heading">
        <h2 id="credentials-heading">Public demonstration credentials</h2>
        <dl>
          <div>
            <dt>Email</dt>
            <dd><code>{DEMO_EMAIL}</code></dd>
          </div>
          <div>
            <dt>Password</dt>
            <dd><code>{DEMO_PASSWORD}</code></dd>
          </div>
        </dl>
      </section>

      <p id="login-warning" className="notice">
        <strong>Simulated login only.</strong> Do not enter a real password.
        This is not suitable for real accounts and does not verify your identity.
      </p>

      <form noValidate onSubmit={handleSubmit} aria-describedby="login-warning">
        <div className="field">
          <label htmlFor="demo-email">Email</label>
          <input
            ref={emailRef}
            id="demo-email"
            name="demo-email"
            type="text"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-required="true"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors({});
            }}
          />
          {errors.email && (
            <p id="email-error" className="field-error" role="alert">{errors.email}</p>
          )}
        </div>
        <div className="field">
          <label htmlFor="demo-password">Password</label>
          <input
            ref={passwordRef}
            id="demo-password"
            name="demo-password"
            type="password"
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors({});
            }}
          />
          {errors.password && (
            <p id="password-error" className="field-error" role="alert">{errors.password}</p>
          )}
        </div>
        <button type="submit">Login</button>
      </form>
      <p className="privacy-note">Nothing is sent or saved. Reloading starts a new demo session.</p>
    </section>
  );
}
