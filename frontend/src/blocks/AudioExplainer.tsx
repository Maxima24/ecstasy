'use client';

import { useEffect, useRef, useState } from 'react';

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
 * The player uses the one permitted rounded play control and a square-ended
 * progress track. The timeout behaviour is logic — leave it in place.
 */
export function AudioExplainer({
  script,
  audio_url,
  duration_ms,
  transcript_shown,
}: AudioExplainerBlock) {
  const [timedOut, setTimedOut] = useState(false);
  const [expanded, setExpanded] = useState(transcript_shown);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

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
  const elapsedLabel = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`;
  const progress = seconds > 0 ? Math.min(100, Math.round((elapsedSeconds / seconds) * 100)) : 0;

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      void audio.play().catch(() => {
        // The existing timeout owns the unavailable state.
      });
    } else {
      audio.pause();
    }
  }

  return (
    <BlockShell label="Audio">
      {hasUrl && !timedOut ? (
        <div className="flex items-center gap-s3">
          <audio
            ref={audioRef}
            id="audio-explainer"
            src={audio_url}
            preload="metadata"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onTimeUpdate={(event) => setElapsedSeconds(Math.floor(event.currentTarget.currentTime))}
            className="sr-only"
          >
            <track kind="captions" />
          </audio>
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={isPlaying ? 'Pause audio explanation' : 'Play audio explanation'}
            className="shrink-0 rounded-token border border-accent px-s3 py-s2 font-mono text-row font-medium leading-tight text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-s1">
            <div className="flex items-baseline justify-between gap-s2 text-cite leading-tight">
              <span className="text-muted">Audio explanation</span>
              <span className="numeric shrink-0 text-faint">
                {elapsedLabel} / {label}
              </span>
            </div>
            <span
              role="progressbar"
              aria-label="Audio progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-s1 w-full overflow-hidden bg-sunk"
            >
              <span className="block h-full bg-accent" style={{ width: `${progress}%` }} />
            </span>
          </div>
        </div>
      ) : null}

      {unavailable ? (
        <p className="text-quiet leading-body text-muted">
          Audio is unavailable. The transcript is below.
        </p>
      ) : null}

      {showTranscript ? (
        <div className="flex flex-col gap-s2">
          <span className="font-mono text-cite leading-tight text-faint">Transcript</span>
          <p className="text-body leading-body text-ink">{script}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="self-start text-left text-quiet font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Show transcript
        </button>
      )}
    </BlockShell>
  );
}
