'use client';

import { useState } from 'react';
import type { Mission } from '../lib/quest/model/index';

export function DeploymentMission(props: {
  mission: Mission;
  onSubmit: (repoUrl: string) => void;
  message: { ok: boolean; text: string } | null;
  busy: boolean;
}) {
  const [url, setUrl] = useState('');
  return (
    <div className="panel">
      <h2 data-testid="mission-title">{props.mission.title}</h2>
      <p className="muted" data-testid="mission-framing">
        {props.mission.storyFraming}
      </p>
      <p>{props.mission.statement}</p>

      <label htmlFor="repo">GitHub repository URL</label>
      <input id="repo" type="text" data-testid="repo-input" value={url} onChange={(e) => setUrl(e.target.value)} />
      <button data-testid="submit-deploy" disabled={props.busy} onClick={() => props.onSubmit(url)}>
        Submit repository
      </button>

      {props.message && (
        <p data-testid="deploy-msg" className={props.message.ok ? 'msg-ok' : 'msg-err'}>
          {props.message.text}
        </p>
      )}
    </div>
  );
}
