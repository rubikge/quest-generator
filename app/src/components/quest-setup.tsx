'use client';

import { useState } from 'react';
import type { Level } from '../lib/quest/model/index';

export function QuestSetup(props: {
  onGenerate: (theme: string, level: Level) => void;
  busy: boolean;
  error: string | null;
}) {
  const [theme, setTheme] = useState('alien invasion');
  const [level, setLevel] = useState<Level>('beginner');

  return (
    <div className="panel">
      <h1>Coding Quest Generator</h1>
      <p className="muted">Pick a universe and your level. We&apos;ll weave four coding missions into one story.</p>

      <label htmlFor="theme">Choose a universe / theme</label>
      <input id="theme" type="text" data-testid="theme-input" value={theme} onChange={(e) => setTheme(e.target.value)} />

      <label htmlFor="level">Skill level</label>
      <select id="level" data-testid="level-select" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="expert">Expert</option>
      </select>

      <button data-testid="generate" disabled={props.busy} onClick={() => props.onGenerate(theme, level)}>
        {props.busy ? 'Generating…' : 'Generate quest'}
      </button>

      {props.error && (
        <p data-testid="setup-error" className="msg-err">
          {props.error}
        </p>
      )}
    </div>
  );
}
