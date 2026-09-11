'use client';

import { useEffect, useRef, useState } from 'react';

import type { ExplainerCard as ExplainerCardBlock } from '@/lib/types';

import { BlockShell } from './BlockShell';
import { Expression } from './Expression';

/**
 * Segmented worked example. `rusty` depends on the segmentation — steps are an
 * array, never a prose body.
 *
 * Long copy is clamped by default. ResizeObserver keeps that decision accurate
 * when the profile's type setting changes without making the component aware
 * of which profile is active.
 */
/**
 * A withheld solution step.
 *
 * Shown instead of the result when the policy decided this learner can do the
 * step themselves. Revealing is one tap — the point is to prompt retrieval
 * first, not to lock the answer away.
 */
function FadedStep({ expr }: { expr: string | null }) {
  const [revealed, setRevealed] = useState(false);

  if (!expr) return null;

  if (revealed) return <Expression tex={expr} />;

  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      className="numeric self-start rounded-token border border-dashed border-line-strong px-s3 py-s1 text-expr leading-tight text-muted transition-colors duration-feedback ease-productive-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      Your turn — tap to check
    </button>
  );
}

function StepText({ text }: { text: string }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const node = textRef.current;
    if (!node || expanded) return;

    const observer = new ResizeObserver(() => {
      setIsClamped(node.scrollHeight > node.clientHeight);
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, [expanded, text]);

  return (
    <div className="flex flex-col gap-s1">
      <p
        ref={textRef}
        className={`text-body leading-body text-ink ${expanded ? '' : 'line-clamp-4'}`}
      >
        {text}
      </p>
      {isClamped ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="self-start text-quiet font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </div>
  );
}

export function ExplainerCard({ title, steps, citation }: ExplainerCardBlock) {
  return (
    <BlockShell label="Explainer">
      <h2 className="text-title font-semibold text-ink">{title}</h2>

      <div className="flex flex-col gap-gap">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-s2">
            <span className="numeric w-s5 shrink-0 pt-s1 text-cite leading-tight text-faint">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-s2">
              <StepText text={step.text} />
              {/*
                A faded step withholds its result and asks the learner to
                supply it — backward fading. It must read as an invitation,
                not as a value that failed to load, so it is labelled rather
                than blank.
              */}
              {step.faded ? (
                <FadedStep expr={step.expr ?? null} />
              ) : step.expr ? (
                <Expression tex={step.expr} />
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {citation ? (
        <cite className="font-mono text-cite leading-body text-faint not-italic">
          Source: {citation.label}
        </cite>
      ) : null}
    </BlockShell>
  );
}
