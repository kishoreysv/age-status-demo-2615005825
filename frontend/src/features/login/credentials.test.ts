/** Specify exact demo comparisons and fail-closed handling of untrusted text. */
import { describe, expect, it } from 'vitest';
import { DEMO_EMAIL, DEMO_PASSWORD, validateCredentials } from './credentials';

describe('validateCredentials', () => {
  it('exports the exact public fixture and accepts it', () => {
    expect(DEMO_EMAIL).toBe('demo@example.com');
    expect(DEMO_PASSWORD).toBe('Demo123!');
    expect(validateCredentials('demo@example.com', 'Demo123!')).toEqual({ valid: true });
  });

  it.each([' demo@example.com ', '\t demo@example.com\n', '\u00a0demo@example.com\u00a0'])(
    'trims surrounding email whitespace: %j',
    (email) => {
      expect(validateCredentials(email, DEMO_PASSWORD)).toEqual({ valid: true });
    },
  );

  it.each(['', ' ', '\t\n'])( 'rejects empty or whitespace-only email: %j', (email) => {
    expect(validateCredentials(email, DEMO_PASSWORD)).toEqual({
      valid: false,
      errors: { email: 'Enter the public demo email.' },
    });
  });

  it('rejects an empty password independently', () => {
    expect(validateCredentials(DEMO_EMAIL, '')).toEqual({
      valid: false,
      errors: { password: 'Enter the public demo password.' },
    });
  });

  it('returns both errors for two empty fields', () => {
    expect(validateCredentials('', '')).toEqual({
      valid: false,
      errors: {
        email: 'Enter the public demo email.',
        password: 'Enter the public demo password.',
      },
    });
  });

  it.each(['other@example.com', 'Demo@example.com', 'DEMO@EXAMPLE.COM', 'demo @example.com'])(
    'rejects an unknown or altered email: %j',
    (email) => {
      expect(validateCredentials(email, DEMO_PASSWORD)).toEqual({
        valid: false,
        errors: { email: 'Use the public demo email shown above.' },
      });
    },
  );

  it.each(['wrong', 'demo123!', 'DEMO123!', 'Demo123', ' Demo123!', 'Demo123! ', '\tDemo123!\n', ' '])(
    'rejects a wrong, case-changed or whitespace-modified password: %j',
    (password) => {
      expect(validateCredentials(DEMO_EMAIL, password)).toEqual({
        valid: false,
        errors: { password: 'Use the demo password exactly as shown, including case and punctuation.' },
      });
    },
  );

  it.each(['<script>alert(1)</script>', "' OR 1=1 --", 'javascript:alert(1)', '\u0000', 'x'.repeat(4096)])(
    'rejects hostile strings without echoing or throwing: %j',
    (hostile) => {
      const badEmail = validateCredentials(hostile, DEMO_PASSWORD);
      const badPassword = validateCredentials(DEMO_EMAIL, hostile);
      const bothBad = validateCredentials(hostile, hostile);
      expect(badEmail.valid).toBe(false);
      expect(badPassword.valid).toBe(false);
      expect(bothBad.valid).toBe(false);
      expect(JSON.stringify(bothBad)).not.toContain(hostile);
    },
  );
});
