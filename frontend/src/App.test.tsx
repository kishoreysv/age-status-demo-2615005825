/** Verify rejected gates, in-memory transitions and a fresh mount reset. */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

/** Assert that no next-feature UI or age controls are exposed before acceptance. */
function expectLoginGate() {
  expect(screen.getByRole('button', { name: /^Login$/ })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Enter your age' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Check Age' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/^Age$/i)).not.toBeInTheDocument();
}

describe('App memory-only gate', () => {
  it('starts at login with no signed-in confirmation or age feature', () => {
    render(<App />);
    expectLoginGate();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.each([
    ['', ''],
    ['', 'Demo123!'],
    ['demo@example.com', ''],
    ['other@example.com', 'Demo123!'],
    ['Demo@example.com', 'Demo123!'],
    ['demo@example.com', 'wrong'],
    ['demo@example.com', 'demo123!'],
    ['demo@example.com', ' Demo123!'],
    ['demo@example.com', 'Demo123! '],
    ['<script>alert(1)</script>', "' OR 1=1 --"],
  ])('does not unlock for rejected input %j / %j', async (email, password) => {
    const user = userEvent.setup();
    render(<App />);
    if (email) await user.type(screen.getByLabelText('Email', { selector: 'input' }), email);
    if (password) await user.type(screen.getByLabelText('Password', { selector: 'input' }), password);
    await user.click(screen.getByRole('button', { name: /^Login$/ }));
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    expectLoginGate();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('unlocks meaningful confirmation, focuses the heading, and resets on remount', async () => {
    const user = userEvent.setup();
    const view = render(<App />);
    await user.type(screen.getByLabelText('Email', { selector: 'input' }), '  demo@example.com  ');
    await user.type(screen.getByLabelText('Password', { selector: 'input' }), 'Demo123!');
    await user.click(screen.getByRole('button', { name: /^Login$/ }));
    expect(screen.getByRole('heading', { name: 'Enter your age' })).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent(/Demo login successful/);
    expect(screen.getByText(/age check will appear in the next feature/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Login$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check Age' })).not.toBeInTheDocument();
    // A rerender preserves this session, whereas a new React tree must not.
    view.rerender(<App />);
    expect(screen.getByRole('heading', { name: 'Enter your age' })).toBeVisible();
    view.unmount();
    render(<App />);
    expectLoginGate();
    expect(screen.getByLabelText('Email', { selector: 'input' })).toHaveValue('');
    expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveValue('');
  });

  it('does not access browser storage or send submitted credentials', async () => {
    const storageGet = vi.spyOn(Storage.prototype, 'getItem');
    const storageSet = vi.spyOn(Storage.prototype, 'setItem');
    const storageRemove = vi.spyOn(Storage.prototype, 'removeItem');
    const storageClear = vi.spyOn(Storage.prototype, 'clear');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'send');
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Email', { selector: 'input' }), 'demo@example.com');
    await user.type(screen.getByLabelText('Password', { selector: 'input' }), 'wrong');
    await user.click(screen.getByRole('button', { name: /^Login$/ }));
    const password = screen.getByLabelText('Password', { selector: 'input' });
    await user.clear(password);
    await user.type(password, 'Demo123!');
    await user.click(screen.getByRole('button', { name: /^Login$/ }));
    expect(screen.getByRole('status')).toBeVisible();
    for (const spy of [storageGet, storageSet, storageRemove, storageClear, fetchSpy, xhrSpy]) {
      expect(spy).not.toHaveBeenCalled();
    }
  });
});
