'use client';

import { useEffect, useState } from 'react';
import type { Level, Progress, Quest } from '../lib/quest/model/index';
import {
  getInputAction,
  getStateAction,
  startQuestAction,
  submitDeploymentAction,
  submitSolutionAction,
} from './actions';
import { QuestSetup } from '../components/quest-setup';
import { ProgressTracker } from '../components/progress-tracker';
import { MissionPanel } from '../components/mission-panel';
import { DeploymentMission } from '../components/deployment-mission';
import { WinScreen } from '../components/win-screen';

type Msg = { ok: boolean; text: string } | null;

export default function Home() {
  const [quest, setQuest] = useState<Quest | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [input, setInput] = useState<string | undefined>(undefined);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Resume an in-progress quest for this session (survives refresh; FR-017).
  useEffect(() => {
    getStateAction().then((s) => {
      if (s?.quest) {
        setQuest(s.quest);
        setProgress(s.progress);
      }
    });
  }, []);

  const current = progress?.currentMission ?? 1;
  const currentMission = quest?.missions.find((m) => m.order === current) ?? null;

  // Fetch (and persist) the generated input whenever we land on a coding mission.
  useEffect(() => {
    if (quest && currentMission?.kind === 'coding') {
      setInput(undefined);
      setMsg(null);
      getInputAction(current as 1 | 2 | 3).then((r) => {
        if (r.ok) setInput(r.input);
      });
    }
  }, [quest, current, currentMission?.kind]);

  // The theme alone drives display-language auto-detection (US3/FR-014): there is no separate
  // language selector — the weave flow detects the theme's language and localizes the task content,
  // persisting the result on the session (English fallback).
  async function onGenerate(theme: string, level: Level) {
    setBusy(true);
    setSetupError(null);
    try {
      const r = await startQuestAction(theme, level);
      if (r.ok) {
        setQuest(r.quest);
        setProgress({ currentMission: 1, solvedMissions: [], won: false });
        setMsg(null);
      } else {
        setSetupError(r.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitSolution(output: string) {
    setBusy(true);
    try {
      const r = await submitSolutionAction(current as 1 | 2 | 3, output);
      if (r.ok) {
        setMsg({ ok: r.correct, text: r.message });
        setProgress(r.progress);
      } else {
        setMsg({ ok: false, text: r.message });
      }
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitDeploy(url: string) {
    setBusy(true);
    try {
      const r = await submitDeploymentAction(url);
      if (r.ok) {
        setMsg({ ok: true, text: r.message });
        setProgress(r.progress);
      } else {
        setMsg({ ok: false, text: r.message });
      }
    } finally {
      setBusy(false);
    }
  }

  if (!quest || !progress) {
    return (
      <main>
        <QuestSetup onGenerate={onGenerate} busy={busy} error={setupError} />
      </main>
    );
  }

  return (
    <main>
      <ProgressTracker current={current} solved={progress.solvedMissions} />
      <div className="panel">
        <h1>{quest.theme}</h1>
        <p className="muted" data-testid="quest-intro">
          {quest.questIntro}
        </p>
      </div>

      {progress.won ? (
        <WinScreen message={msg?.text ?? null} />
      ) : currentMission?.kind === 'deployment' ? (
        <DeploymentMission mission={currentMission} onSubmit={onSubmitDeploy} message={msg} busy={busy} />
      ) : currentMission ? (
        <MissionPanel mission={currentMission} input={input} onSubmit={onSubmitSolution} message={msg} busy={busy} />
      ) : null}
    </main>
  );
}
