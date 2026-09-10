'use client';

import { useEffect, useState } from 'react';

import type { AudioExplainer as AudioExplainerBlock } from '@/lib/types';

import { BlockShell } from './BlockShell';

const AUDIO_TIMEOUT_MS = 3_000;

/**
 * Audio-led explanation. Takes the top of the screen for `hands_free`.
 *
 * Failure path (FRONTEND_PLAN.md §15): if the URL is missing or does not become
 * playable within 3 s, reveal the transcript with a quiet note. A control that
 * does nothing is worse than no control.
 *
 * `unavailable` is derived, not stored. A missing URL is known at render, so
 * setting state for it inside an effect would trigger a cascading render for a
 * fact already in hand. Only the timeout — a genuinely external event — moves
 * state.
 *
 * TODO(codex): visual composition of the player and transcript. The timeout
 * behaviour is logic — leave it in place.
 */
export function AudioExplainer({
  script,
  audio_url,
  duration_ms,
  transcript_shown,
}: AudioExplainerBlock) {
  const [timedOut, setTimedOut] = useState(false);
  const [expanded, setExpanded] = useState(transcript_shown);

  const hasUrl = Boolean(audio_url);
  const unavailable = !hasUrl || timedOut;
  const showTranscript = expanded || unavailable;

  useEffect(() => {
    if (!hasUrl) return;

    const timer = setTimeout(() => {
      const el = document.getElementById('audio-explainer') as HTMLAudioElement | null;
      // readyState 0 means nothing loaded: treat as unavailable.
      if (!el || el.readyState === 0) setTimedOut(true);
    }, AUDIO_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [hasUrl, audio_url]);

  const seconds = Math.round(duration_ms / 1000);
  const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <BlockShell label="Audio">
      {hasUrl && !timedOut ? (
        <audio
          id="audio-explainer"
          src={audio_url}
          preload="metadata"
          controls
          className="w-full"
        >
          <track kind="captions" />
        </audio>
      ) : null}

      {unavailable ? (
        <span className="text-quiet text-muted">
          Audio is unavailable. The transcript is below.
        </span>
      ) : (
        <span className="numeric text-cite text-faint">{label}</span>
      )}

      {showTranscript ? (
        <p className="text-body leading-body text-ink max-w-(--measure)">{script}</p>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-quiet text-muted text-left"
        >
          Show transcript
        </button>
      )}
    </BlockShell>
  );
}
