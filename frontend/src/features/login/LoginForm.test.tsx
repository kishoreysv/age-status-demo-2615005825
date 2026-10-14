/** Cover public hints, field associations, exact comparisons and correction. */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm';

/**
 * Render a fresh form and enter only nonempty supplied values.
 *
 * Args:
 *   email: Text for the email field.
 *   password: Exact text for the masked field.
 * Returns:
 *   User controls and a spy on the unlock callback.
 */
async function enterCredentials(email: string, password: string) {
  const onSuccess = vi.fn();
  const user = userEvent.setup();
  render(<LoginForm onSuccess={onSuccess} />);
  const emailInput = screen.getByRole('textbox', { name: 'Email' });
  const passwordInput = screen.getByLabelText('Password', { selector: 'input' });
  if (email) await user.type(emailInput, email);
  if (password) await user.type(passwordInput, password);
  await user.click(screen.getByRole('button', { name: /^Login$/ }));
  return { onSuccess, user, emailInput, passwordInput };
}

describe('LoginForm', () => {
  it('renders labeled blank controls, the exact fixture and clear simulation warnings', () => {
    render(<LoginForm onSuccess={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Try the demo.' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Public demonstration credentials' })).toBeVisible();
    expect(screen.getByText('demo@example.com', { selector: 'code' })).toBeVisible();
    expect(screen.getByText('Demo123!', { selector: 'code' })).toBeVisible();
    const email = screen.getByRole('textbox', { name: 'Email' });
    const password = screen.getByLabelText('Password', { selector: 'input' });
    expect(email).toHaveValue('');
    expect(password).toHaveValue('');
    expect(password).toHaveAttribute('type', 'password');
    expect(email).toHaveAttribute('aria-required', 'true');
    expect(password).toHaveAttribute('aria-required', 'true');
    expect(screen.getByText(/Do not enter a real password/)).toHaveTextContent(/not suitable for real accounts/);
    expect(screen.getByText(/Simulated login only/)).toBeVisible();
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it.each(['demo@example.com', '  demo@example.com  '])('unlocks only for the accepted pair: %j', async (email) => {
    const { onSuccess } = await enterCredentials(email, 'Demo123!');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it.each([
    { name: 'both empty', email: '', password: '', emailError: true, passwordError: true },
    { name: 'email empty', email: '', password: 'Demo123!', emailError: true, passwordError: false },
    { name: 'email whitespace', email: '   ', password: 'Demo123!', emailError: true, passwordError: false },
    { name: 'password empty', email: 'demo@example.com', password: '', emailError: false, passwordError: true },
    { name: 'unknown email', email: 'other@example.com', password: 'Demo123!', emailError: true, passwordError: false },
    { name: 'email case changed', email: 'Demo@example.com', password: 'Demo123!', emailError: true, passwordError: false },
    { name: 'wrong password', email: 'demo@example.com', password: 'wrong', emailError: false, passwordError: true },
    { name: 'lowercase password', email: 'demo@example.com', password: 'demo123!', emailError: false, passwordError: true },
    { name: 'uppercase password', email: 'demo@example.com', password: 'DEMO123!', emailError: false, passwordError: true },
    { name: 'leading password space', email: 'demo@example.com', password: ' Demo123!', emailError: false, passwordError: true },
    { name: 'trailing password space', email: 'demo@example.com', password: 'Demo123! ', emailError: false, passwordError: true },
    { name: 'whitespace password', email: 'demo@example.com', password: ' ', emailError: false, passwordError: true },
    { name: 'hostile email', email: '<script>alert(1)</script>', password: 'Demo123!', emailError: true, passwordError: false },
    { name: 'hostile password', email: 'demo@example.com', password: "' OR 1=1 --", emailError: false, passwordError: true },
    { name: 'both incorrect', email: 'other@example.com', password: 'wrong', emailError: true, passwordError: true },
  ])('keeps $name gated with associated alerts and correction focus', async ({ email, password, emailError, passwordError }) => {
    const { onSuccess, emailInput, passwordInput } = await enterCredentials(email, password);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(emailInput).toHaveAttribute('aria-invalid', String(emailError));
    expect(passwordInput).toHaveAttribute('aria-invalid', String(passwordError));
    expect(screen.getAllByRole('alert')).toHaveLength(Number(emailError) + Number(passwordError));
    if (emailError) {
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      expect(emailInput).toHaveAccessibleDescription(/public demo email/);
    } else {
      expect(emailInput).not.toHaveAttribute('aria-describedby');
    }
    if (passwordError) {
      expect(passwordInput).toHaveAttribute('aria-describedby', 'password-error');
      expect(passwordInput).toHaveAccessibleDescription(/demo password/);
    } else {
      expect(passwordInput).not.toHaveAttribute('aria-describedby');
    }
    expect(emailError ? emailInput : passwordInput).toHaveFocus();
    expect(document.querySelector('script')).toBeNull();
    for (const alert of screen.getAllByRole('alert')) {
      expect(alert).not.toHaveTextContent('<script>');
      expect(alert).not.toHaveTextContent("' OR 1=1 --");
    }
  });

  it('clears stale errors on edits and permits correction with keyboard submission', async () => {
    const { onSuccess, user, emailInput, passwordInput } = await enterCredentials('', '');
    await user.type(emailInput, 'demo@example.com');
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    expect(emailInput).toHaveAttribute('aria-invalid', 'false');
    await user.tab();
    expect(passwordInput).toHaveFocus();
    await user.type(passwordInput, 'wrong');
    await user.keyboard('{Enter}');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(passwordInput).toHaveFocus();
    await user.clear(passwordInput);
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    await user.type(passwordInput, 'Demo123!');
    await user.keyboard('{Enter}');
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
