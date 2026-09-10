'use client';

import { useState } from 'react';

import type { Flashcards as FlashcardsBlock } from '@/lib/types';

import { BlockShell } from './BlockShell';

/**
 * Tap to reveal, then advance.
 *
 * The whole bare surface is the reveal target. Any motion here uses
 * duration-feedback — the profile flip is the only orchestrated moment.
 */
export function Flashcards({ cards }: FlashcardsBlock) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const card = cards[index];
  if (!card) return null;

  function advance() {
    if (revealed) {
      setRevealed(false);
      setIndex((i) => (i + 1) % cards.length);
    } else {
      setRevealed(true);
    }
  }

  return (
    <BlockShell label="Flashcards" muted>
      <button
        type="button"
        onClick={advance}
        aria-label={revealed ? 'Show next flashcard' : 'Reveal flashcard answer'}
        className="flex w-full flex-col gap-s2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="font-mono text-cite leading-tight text-faint">
          {revealed ? 'Answer' : card.topic_id}
        </span>
        <span className="text-body font-medium leading-body text-ink" aria-live="polite">
          {revealed ? card.back : card.front}
        </span>
        <span className="flex items-baseline justify-between gap-s2 text-quiet leading-tight">
          <span className="font-medium text-accent">
            {revealed ? 'Next card' : 'Reveal answer'}
          </span>
          <span className="numeric text-faint">
            {index + 1} of {cards.length}
          </span>
        </span>
      </button>
    </BlockShell>
  );
}
