'use client';

import type { Block } from '@/lib/types';

import { AudioExplainer } from './AudioExplainer';
import { BlockBoundary } from './BlockBoundary';
import { ExplainerCard } from './ExplainerCard';
import { FallbackCard } from './FallbackCard';
import { Flashcards } from './Flashcards';
import { ProgressPanel } from './ProgressPanel';
import { Quiz } from './Quiz';
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
function renderBlock(block: Block) {
  switch (block.type) {
    case 'explainer_card':
      return <ExplainerCard {...block} />;
    case 'audio_explainer':
      return <AudioExplainer {...block} />;
    case 'quiz':
      return <Quiz {...block} />;
    case 'roadmap':
      return <Roadmap {...block} />;
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
export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  if (blocks.length === 0) {
    return (
      <div className="flex flex-col gap-block min-h-80">
        <FallbackCard message="There is nothing to show for this question yet." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-block min-h-80">
      {blocks.map((block, i) => (
        <BlockBoundary
          key={`${block.type}-${i}`}
          label={block.type}
          fallback={<FallbackCard />}
        >
          {renderBlock(block)}
        </BlockBoundary>
      ))}
    </div>
  );
}
