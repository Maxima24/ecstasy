'use client';

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

/**
 * Error boundary, one per block.
 *
 * Per block, never per page (FRONTEND_PLAN.md §15). A single bad block must not
 * take the screen with it — the rest of the generated content still renders.
 *
 * Must be a class: React has no hook equivalent for componentDidCatch.
 */

type Props = {
  children: ReactNode;
  fallback: ReactNode;
  /** Block type, for the log line. Not shown to the learner. */
  label?: string;
};

type State = { failed: boolean };

export class BlockBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[block ${this.props.label ?? 'unknown'}] render failed`, error, info);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
