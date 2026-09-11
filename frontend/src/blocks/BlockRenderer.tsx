'use client';

import type { CSSProperties } from 'react';

import type { Block } from '@/lib/types';

import { AudioExplainer } from './AudioExplainer';
import { BlockBoundary } from './BlockBoundary';
import { ExplainerCard } from './ExplainerCard';
import { FallbackCard } from './FallbackCard';
import { Flashcards } from './Flashcards';
import { ProgressPanel } from './ProgressPanel';
import { Quiz, type QuizAnswer } from './Quiz';
import { Roadmap } from './Roadmap';

/**
 * Dispatch one block to its component.
 *
 * Deliberate deviation from PRD §4.2, which describes a `REGISTRY` object keyed
 * by block type. A lookup table cannot preserve the discriminated union: every
 * component takes a different props type, so indexing one out forces a cast
 * that is unsound in general and defeats the type checking this contract exists
 * to provide.
 *
 * A switch keeps it. Each case narrows `block` to exactly the component's props,
 * and the `default` gives the same guarantee the registry did — an unknown type
 * renders nothing rather than throwing. Adding a member to the Block union
 * without adding a case here is a compile error, which is a stronger guarantee
 * than the registry offered.
 */
function renderBlock(
  block: Block,
  onQuizAnswered?: (answer: QuizAnswer) => void,
  citedTopicId?: string,
) {
  switch (block.type) {
    case 'explainer_card':
      return <ExplainerCard {...block} />;
    case 'audio_explainer':
      return <AudioExplainer {...block} />;
    case 'quiz':
      return <Quiz {...block} onAnswered={onQuizAnswered} />;
    case 'roadmap':
      return <Roadmap {...block} citedTopicId={citedTopicId} />;
    case 'flashcards':
      return <Flashcards {...block} />;
    case 'progress_panel':
      return <ProgressPanel {...block} />;
    default:
      // Unknown type: skip it, render the rest of the screen.
      return null;
  }
}

/**
 * Renders the generated middle region of the screen.
 *
 * The error boundary is per block, never per page — one bad block must not take
 * the screen with it.
 *
 * The container carries the min-height so the frame does not collapse between a
 * one-block `rusty` screen and a `strong` drill. Without it the profile flip
 * reads as a jump rather than a rebuild.
 */
export function BlockRenderer({
  blocks,
  onQuizAnswered,
  citedTopicId,
}: {
  blocks: Block[];
  onQuizAnswered?: (answer: QuizAnswer) => void;
  /**
   * The topic the adaptation decision was about.
   *
   * Threaded so the roadmap can mark the row the reason refers to. Learners
   * trust a recommendation more when they can see the information it was based
   * on — and a reason naming a topic beside a list containing that topic is
   * two facts, not one, until they are visibly joined.
   */
  citedTopicId?: string;
}) {
  if (blocks.length === 0) {
    return (
      <div className="learning-grid">
        <FallbackCard message="There is nothing to show for this question yet." />
      </div>
    );
  }

  return (
    <div className="learning-grid">
      {blocks.map((block, i) => (
        // `--block-index` drives the entrance stagger in globals.css, so blocks
        // arrive in sequence and the screen visibly assembles rather than
        // crossfading. The wrapper exists for the animation only — the block
        // itself keeps its own boundary.
        <div
          key={`${block.type}-${i}`}
          className="block-enter min-w-0"
          data-block-type={block.type}
          style={{ '--block-index': i } as CSSProperties}
        >
          <BlockBoundary label={block.type} fallback={<FallbackCard />}>
            {renderBlock(block, onQuizAnswered, citedTopicId)}
          </BlockBoundary>
        </div>
      ))}
    </div>
  );
}
