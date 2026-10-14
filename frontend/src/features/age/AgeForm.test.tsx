/** Exercise raw text, associated errors, keyboard checks and feedback transitions. */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AgeForm } from './AgeForm';

describe('AgeForm', () => {
  it('renders a labeled raw-text field, numeric keyboard hint and empty status', () => {
    render(<AgeForm />);
    const age = screen.getByRole('textbox', { name: 'Age' });
    expect(age).toHaveAttribute('type', 'text');
    expect(age).toHaveAttribute('inputmode', 'numeric');
    expect(age).toHaveAttribute('autocomplete', 'off');
    expect(age).toHaveAttribute('aria-required', 'true');
    expect(age).toHaveAttribute('aria-invalid', 'false');
    expect(age).toHaveAttribute('aria-describedby', 'age-rule');
    expect(age).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Check Age' })).toBeVisible();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/completed years/)).toHaveTextContent('18 as its threshold');
    expect(screen.getByText(/not legal advice/)).toHaveTextContent('Nothing is sent or saved.');
  });

  it.each([
    ['0', 0, 'Minor'], ['17', 17, 'Minor'], ['18', 18, 'Major'], ['19', 19, 'Major'],
    [' 0018 ', 18, 'Major'], ['200', 200, 'Major'],
    ['9007199254740991', Number.MAX_SAFE_INTEGER, 'Major'],
  ])('checks %j as %s / %s while preserving raw text', async (raw, normalized, label) => {
    const user = userEvent.setup();
    render(<AgeForm />);
    const age = screen.getByRole('textbox', { name: 'Age' });
    await user.type(age, raw as string);
    await user.click(screen.getByRole('button', { name: 'Check Age' }));
    expect(age).toHaveValue(raw);
    expect(screen.getByRole('heading', { name: label as string })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(`Submitted age: ${normalized}.`);
    expect(age).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(['', ' ', '-1', '17.5', 'abc', '1e2', '9007199254740993', '<script>alert(1)</script>'])(
    'retains invalid raw input %j and associates a safe error without a result', async (raw) => {
      const user = userEvent.setup();
      render(<AgeForm />);
      const age = screen.getByRole('textbox', { name: 'Age' });
      if (raw) await user.type(age, raw);
      await user.click(screen.getByRole('button', { name: 'Check Age' }));
      expect(age).toHaveValue(raw);
      expect(age).toHaveFocus();
      expect(age).toHaveAttribute('aria-invalid', 'true');
      expect(age).toHaveAttribute('aria-describedby', 'age-rule age-error');
      expect(screen.getByRole('alert')).toHaveAttribute('id', 'age-error');
      expect(screen.getByRole('alert')).toHaveTextContent(/Enter a/);
      expect(screen.getByRole('alert')).not.toHaveTextContent('<script>');
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    },
  );

  it('supports valid → edit → invalid → correct → repeated keyboard checks without stale feedback', async () => {
    const user = userEvent.setup();
    render(<AgeForm />);
    const age = screen.getByRole('textbox', { name: 'Age' });
    await user.tab();
    expect(age).toHaveFocus();
    await user.type(age, '18{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Major');
    await user.type(age, '.5');
    expect(age).toHaveValue('18.5');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('alert')).toBeVisible();
    await user.clear(age);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(age).toHaveAttribute('aria-invalid', 'false');
    expect(age).toHaveAttribute('aria-describedby', 'age-rule');
    await user.type(age, '17{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Submitted age: 17.');
    expect(screen.getByRole('heading', { name: 'Minor' })).toBeVisible();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Submitted age: 17.');
    await user.clear(age);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await user.type(age, '19');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Check Age' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Major' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Submitted age: 19.');
  });
});
