/** Verify accessible results, threshold wording and removal of obsolete feedback. */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AgeResult } from './AgeResult';
import type { AgeClassification } from './classifyAge';

describe('AgeResult', () => {
  it.each<AgeClassification>([
    { age: 0, status: 'Minor' }, { age: 17, status: 'Minor' },
    { age: 18, status: 'Major' }, { age: 19, status: 'Major' },
    { age: Number.MAX_SAFE_INTEGER, status: 'Major' },
  ])('announces $status and normalized submitted age $age', (result) => {
    render(<AgeResult result={result} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(screen.getByRole('heading', { name: result.status })).toBeVisible();
    expect(status).toHaveTextContent(`Submitted age: ${result.age}.`);
    expect(status).toHaveTextContent(result.status === 'Major'
      ? 'In this demo, ages 18 or above are Major.'
      : 'In this demo, ages below 18 are Minor.');
  });

  it('keeps an empty status region before a result and clears a replaced result', () => {
    const view = render(<AgeResult result={null} />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    view.rerender(<AgeResult result={{ age: 18, status: 'Major' }} />);
    expect(screen.getByRole('heading', { name: 'Major' })).toBeVisible();
    view.rerender(<AgeResult result={{ age: 0, status: 'Minor' }} />);
    expect(screen.queryByRole('heading', { name: 'Major' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Submitted age: 0.');
    view.rerender(<AgeResult result={null} />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
