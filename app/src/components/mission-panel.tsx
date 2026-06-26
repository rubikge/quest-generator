'use client';

import type { Mission } from '../lib/quest/model/index';
import { SolutionForm } from './solution-form';

/**
 * Full task display (US3 / FR-013): localized title + story framing, statement, illustrations (served
 * from /tasks/<id>/...), explicit input/output requirements, the worked I/O example table, and the
 * generated test-battery input the learner runs their program over. All display prose is already
 * localized to the session's detected language by the weave flow; examples/images come from the
 * catalog. Tasks without illustrations render cleanly (no empty placeholders).
 */
export function MissionPanel(props: {
  mission: Mission;
  input: string | undefined;
  onSubmit: (output: string) => void;
  message: { ok: boolean; text: string } | null;
  busy: boolean;
}) {
  const { mission } = props;
  const images = mission.images ?? [];
  const examples = mission.examples ?? [];

  return (
    <div className="panel">
      <h2 data-testid="mission-title">{mission.title}</h2>
      <p className="muted" data-testid="mission-framing">
        {mission.storyFraming}
      </p>

      <p data-testid="mission-statement" style={{ whiteSpace: 'pre-wrap' }}>
        {mission.statement}
      </p>

      {images.length > 0 && (
        <div data-testid="mission-images" className="mission-images">
          {images.map((src) => {
            // Static assets live under app/public/tasks/<id>/...; ensure a leading slash for /public.
            const url = src.startsWith('/') ? src : `/${src}`;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={url} alt={`Illustration for ${mission.title}`} className="mission-image" />
            );
          })}
        </div>
      )}

      {mission.inputFormat && (
        <section data-testid="mission-input-format">
          <h3>Input</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{mission.inputFormat}</p>
        </section>
      )}

      {mission.outputFormat && (
        <section data-testid="mission-output-format">
          <h3>Output</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{mission.outputFormat}</p>
        </section>
      )}

      {examples.length > 0 && (
        <section data-testid="mission-examples">
          <h3>Examples</h3>
          <table className="examples">
            <thead>
              <tr>
                <th>Input</th>
                <th>Output</th>
              </tr>
            </thead>
            <tbody>
              {examples.map((ex, i) => (
                <tr key={i} data-testid={`example-${i}`}>
                  <td>
                    <pre>{ex.input}</pre>
                  </td>
                  <td>
                    <pre>{ex.output}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

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
