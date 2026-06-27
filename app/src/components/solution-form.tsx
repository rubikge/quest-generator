'use client';

import { useState } from 'react';

/**
 * Submit a single combined output for the whole ≥30-case test battery (FR-019). The submission is
 * graded all-or-nothing against the sandboxed reference solver, with whitespace-tolerant comparison
 * (FR-020): trailing whitespace per line and trailing blank lines are ignored, so the hint below
 * reassures the learner. Rejection feedback is rendered by the mission panel from the server result.
 */
export function SolutionForm({ onSubmit, disabled }: { onSubmit: (output: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState('');
  return (
    <div>
      <label htmlFor="solution">Your output (for every generated test case, in order)</label>
      <textarea
        id="solution"
        data-testid="solution-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <p className="muted" data-testid="solution-hint">
        Your output must be correct for all test cases. Trailing spaces and blank lines are ignored.
      </p>
      <button data-testid="submit-solution" disabled={disabled} onClick={() => onSubmit(value)}>
        Submit solution
      </button>
    </div>
  );
}
