'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Quiz as QuizBlock } from '@/lib/types';

import { BlockShell } from './BlockShell';
import { Expression } from './Expression';

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
 * Correct and chosen-wrong states are written as well as coloured. The grading
 * logic is logic — leave it in place.
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
        <span className="font-mono text-cite leading-tight text-faint">{question.topic_id}</span>
        {timer_seconds !== null ? (
          <span
            className="numeric text-cite font-semibold leading-tight text-ink"
            aria-label={`${timer_seconds} seconds allowed`}
          >
            {Math.floor(timer_seconds / 60)}:{String(timer_seconds % 60).padStart(2, '0')}
          </span>
        ) : null}
      </div>

      <p className="text-body font-medium leading-body text-ink">{question.stem}</p>
      {question.stem_expr ? <Expression tex={question.stem_expr} /> : null}

      <div className="flex flex-col">
        {question.options.map((option, i) => {
          const isAnswer = i === question.answer_index;
          const isChosen = i === selected;
          const optionTone = !answered
            ? 'text-ink'
            : isAnswer
              ? 'text-done font-semibold'
              : isChosen
                ? 'text-accent'
                : 'text-muted';
          const markerTone = !answered
            ? 'text-faint'
            : isAnswer
              ? 'text-done'
              : isChosen
                ? 'text-accent'
                : 'text-faint';
          const feedback = answered ? (isAnswer ? 'Correct' : isChosen ? 'Your answer' : null) : null;

          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => choose(i)}
              aria-label={`${String.fromCharCode(65 + i)}. ${option}${feedback ? `. ${feedback}` : ''}`}
              className={`numeric flex w-full items-baseline gap-s2 border-b border-line py-s2 text-left text-row leading-tight transition-colors duration-feedback ease-productive-out last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-100 ${optionTone}`}
            >
              <span className={`w-s5 shrink-0 ${markerTone}`} aria-hidden="true">
                {String.fromCharCode(65 + i)}
              </span>
              <span className={`min-w-0 flex-1 ${isChosen && !isAnswer ? 'line-through' : ''}`}>
                {option}
              </span>
              {feedback ? (
                <span className="shrink-0 text-cite font-medium no-underline">{feedback}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div className="flex items-start gap-s2" role="status">
          <span className="font-mono text-cite leading-tight text-faint">Why</span>
          <p className="min-w-0 flex-1 text-quiet leading-body text-muted">
            {question.rationale}
          </p>
        </div>
      ) : null}
    </BlockShell>
  );
}
