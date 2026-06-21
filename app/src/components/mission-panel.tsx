'use client';

import type { Mission } from '../lib/quest/model/index';
import { SolutionForm } from './solution-form';

export function MissionPanel(props: {
  mission: Mission;
  input: string | undefined;
  onSubmit: (output: string) => void;
  message: { ok: boolean; text: string } | null;
  busy: boolean;
}) {
  return (
    <div className="panel">
      <h2 data-testid="mission-title">{props.mission.title}</h2>
      <p className="muted" data-testid="mission-framing">
        {props.mission.storyFraming}
      </p>
      <p>{props.mission.statement}</p>

      <label>Generated input</label>
      <pre data-testid="mission-input">{props.input ?? 'Loading input…'}</pre>

      <SolutionForm onSubmit={props.onSubmit} disabled={props.busy || props.input === undefined} />

      {props.message && (
        <p data-testid="mission-msg" className={props.message.ok ? 'msg-ok' : 'msg-err'}>
          {props.message.text}
        </p>
      )}
    </div>
  );
}
