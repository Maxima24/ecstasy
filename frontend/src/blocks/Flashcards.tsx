'use client';

import { useState } from 'react';

import type { Flashcards as FlashcardsBlock } from '@/lib/types';

import { BlockShell } from './BlockShell';

/**
 * Tap to reveal, then advance.
 *
 * TODO(codex): visual composition and the reveal interaction. Any motion here
 * uses duration-feedback — the profile flip is the only orchestrated moment.
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
        className="text-left flex flex-col gap-s1 max-w-(--measure)"
      >
        <span className="text-body leading-body text-ink">
          {revealed ? card.back : card.front}
        </span>
        <span className="text-quiet text-muted">
          {revealed ? 'Tap for next' : 'Tap to reveal'}, {index + 1} of {cards.length}
        </span>
      </button>
    </BlockShell>
  );
}
