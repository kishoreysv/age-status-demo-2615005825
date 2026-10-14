/** Validate public demonstration credentials without I/O or persistence. */
export const DEMO_EMAIL = 'demo@example.com';
export const DEMO_PASSWORD = 'Demo123!';

export interface CredentialErrors {
  email?: string;
  password?: string;
}

export type CredentialResult =
  | { valid: true }
  | { valid: false; errors: CredentialErrors };

/**
 * Check each field against the public fixture, trimming only the email.
 *
 * Args:
 *   email: Untrusted email text; comparison remains case-sensitive.
 *   password: Untrusted password text; whitespace and case are significant.
 * Returns:
 *   A success result or field-associated errors; never echoes submitted text.
 * Notes:
 *   This pure UI check is not authentication or a security boundary.
 */
export function validateCredentials(email: string, password: string): CredentialResult {
  const errors: CredentialErrors = {};
  const trimmedEmail = email.trim();

  if (trimmedEmail === '') {
    errors.email = 'Enter the public demo email.';
  } else if (trimmedEmail !== DEMO_EMAIL) {
    errors.email = 'Use the public demo email shown above.';
  }

  if (password === '') {
    errors.password = 'Enter the public demo password.';
  } else if (password !== DEMO_PASSWORD) {
    errors.password = 'Use the demo password exactly as shown, including case and punctuation.';
  }

  if (errors.email || errors.password) {
    return { valid: false, errors };
  }
  return { valid: true };
}
