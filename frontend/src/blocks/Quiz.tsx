'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Quiz as QuizBlock } from '@/lib/types';

import { BlockShell } from './BlockShell';

export type QuizAnswer = {
  questionId: string;
  topicId: string;
  selectedIndex: number;
  elapsedMs: number;
};

/**
 * Timed drill. `timer_seconds` is non-null only for `strong`.
 *
 * Grading is local and instant: `answer_index` ships with the block, so
 * correctness renders on tap with no request in the path. `onAnswered` fires
 * afterwards to record mastery — the learner never waits on it.
 *
 * The start time lives in a ref written by an effect rather than being read
 * during render. `Date.now()` is impure, and calling it in render scope makes
 * the value change on any incidental re-render, which would corrupt the
 * elapsed-time measurement the backend uses for mastery scoring.
 *
 * TODO(codex): visual composition. Option treatment, correct and incorrect
 * states, timer presentation, rationale reveal. The grading logic is logic —
 * leave it in place.
 */
export function Quiz({
  questions,
  timer_seconds,
  onAnswered,
}: QuizBlock & { onAnswered?: (answer: QuizAnswer) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const startedAtRef = useRef(0);

  const question = questions[0];

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, [question?.id]);

  const choose = useCallback(
    (index: number) => {
      if (selected !== null || !question) return;
      setSelected(index);
      onAnswered?.({
        questionId: question.id,
        topicId: question.topic_id,
        selectedIndex: index,
        elapsedMs: Date.now() - startedAtRef.current,
      });
    },
    [selected, question, onAnswered],
  );

  if (!question) return null;

  const answered = selected !== null;

  return (
    <BlockShell label="Drill">
      <div className="flex items-baseline justify-between gap-s2">
        <span className="font-mono text-cite text-faint">{question.topic_id}</span>
        {timer_seconds !== null ? (
          <span className="numeric text-cite font-semibold text-accent">
            {Math.floor(timer_seconds / 60)}:{String(timer_seconds % 60).padStart(2, '0')}
          </span>
        ) : null}
      </div>

      <p className="text-body leading-body text-ink max-w-(--measure)">{question.stem}</p>
      {question.stem_expr ? (
        <span className="numeric expr text-expr text-ink">{question.stem_expr}</span>
      ) : null}

      <div className="flex flex-col">
        {question.options.map((option, i) => {
          const isAnswer = i === question.answer_index;
          const isChosen = i === selected;
          const tone = !answered
            ? 'text-ink'
            : isAnswer
              ? 'text-done'
              : isChosen
                ? 'text-accent line-through'
                : 'text-muted';

          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => choose(i)}
              className={`numeric text-row text-left grid grid-cols-[18px_1fr] gap-s2 py-s2 border-b border-line last:border-b-0 transition-colors duration-feedback ease-productive-out ${tone}`}
            >
              <span className="text-faint">{String.fromCharCode(65 + i)}</span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      {answered ? (
        <p className="text-quiet text-muted max-w-(--measure)">{question.rationale}</p>
      ) : null}
    </BlockShell>
  );
}
