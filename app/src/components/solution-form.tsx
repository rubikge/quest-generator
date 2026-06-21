'use client';

import { useState } from 'react';

export function SolutionForm({ onSubmit, disabled }: { onSubmit: (output: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState('');
  return (
    <div>
      <label htmlFor="solution">Your output</label>
      <textarea id="solution" data-testid="solution-input" value={value} onChange={(e) => setValue(e.target.value)} />
      <button data-testid="submit-solution" disabled={disabled} onClick={() => onSubmit(value)}>
        Submit solution
      </button>
    </div>
  );
}
