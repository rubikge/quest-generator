'use client';

import { useState } from 'react';
import type { Mission } from '../lib/quest/model/index';

/** A required original-task link the learner must include in their README (US4 / FR-015). */
export interface RequiredLink {
  taskId: string;
  sourceUrl: string;
}

export function DeploymentMission(props: {
  mission: Mission;
  /** Coding-mission tasks whose ids + original ACMP links the README must contain. */
  requiredLinks?: RequiredLink[];
  onSubmit: (repoUrl: string) => void;
  message: { ok: boolean; text: string } | null;
  /** Specific links the last failed check reported as missing (FR-016). */
  missingLinks?: string[];
  busy: boolean;
}) {
  const [url, setUrl] = useState('');
  const links = props.requiredLinks ?? [];
  const missing = new Set(props.missingLinks ?? []);
  return (
    <div className="panel">
      <h2 data-testid="mission-title">{props.mission.title}</h2>
      <p className="muted" data-testid="mission-framing">
        {props.mission.storyFraming}
      </p>
      <p>{props.mission.statement}</p>

      {links.length > 0 && (
        <div data-testid="required-links">
          <p>Your README must list each task id and link to its original task page:</p>
          <ul>
            {links.map((l) => (
              <li key={l.taskId} className={missing.has(l.sourceUrl) ? 'msg-err' : undefined}>
                <code>{l.taskId}</code> —{' '}
                <a href={l.sourceUrl} target="_blank" rel="noreferrer">
                  {l.sourceUrl}
                </a>
                {missing.has(l.sourceUrl) && ' (missing from your README)'}
              </li>
            ))}
          </ul>
        </div>
      )}

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

      {(props.missingLinks?.length ?? 0) > 0 && (
        <div data-testid="missing-links" className="msg-err">
          <p>Add a link to each of these original task pages:</p>
          <ul>
            {props.missingLinks!.map((href) => (
              <li key={href}>{href}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
