/**
 * Compile-time proof that the hand-written types still match the contract.
 *
 * Choosing Python for the backend means the schema exists twice: once as
 * Pydantic in `backend/app/schemas/`, once as TypeScript in `./types.ts`.
 * Hand-mirrored schemas drift silently, and drift here means a block that
 * renders blank in the demo.
 *
 * This file is what turns that discipline into a build step. `contract.d.ts` is
 * generated from `contracts/openapi.json`, which is generated from the Pydantic
 * models. If the backend's shape moves and `types.ts` does not follow,
 * `npm run typecheck` fails here with the offending type named.
 *
 * Why assertions rather than re-deriving `types.ts` from the generated file:
 * Pydantic inlines the discriminated block union instead of naming it, so
 * `components['schemas']['Block']` does not exist — the union would have to be
 * rebuilt locally anyway. And `types.ts` carries the reasoning for each
 * constraint ("exactly five options", "non-null only for `strong`"), which a
 * generated file cannot. This keeps the documentation and still catches drift.
 *
 * The direction asserted is the one that matters in production: whatever the
 * backend emits must be consumable by the frontend. A backend that adds an
 * optional field is fine; one that changes a type or drops a required field is
 * a compile error.
 *
 * Type-only. Nothing here is emitted to the bundle.
 *
 * Regenerate after any backend schema change:
 *   npx openapi-typescript ../contracts/openapi.json -o src/lib/contract.d.ts
 */

/*
 * Every alias below is intentionally unused. Their only job is to fail
 * compilation when the shapes diverge, so "never read" is the point.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

import type { components } from './contract';
import type {
  AdaptationSummary,
  AskRequest,
  AskResponse,
  AudioExplainer,
  Citation,
  ExplainerCard,
  ExplainerStep,
  Flashcard,
  Flashcards,
  ProfileRequest,
  ProgressPanel,
  Quiz,
  QuizQuestion,
  QuizSubmitRequest,
  QuizSubmitResponse,
  Roadmap,
  RoadmapStep,
  WeakTopic,
} from './types';

type Schemas = components['schemas'];

/** Fails to compile unless the backend's shape is assignable to ours. */
type Consumable<Backend extends Frontend, Frontend> = Backend;

// Blocks — the wire payload the renderer switches over.
type _Citation = Consumable<Schemas['Citation'], Citation>;
type _ExplainerStep = Consumable<Schemas['ExplainerStep'], ExplainerStep>;
type _ExplainerCard = Consumable<Schemas['ExplainerCardBlock'], ExplainerCard>;
type _AudioExplainer = Consumable<Schemas['AudioExplainerBlock'], AudioExplainer>;
type _QuizQuestion = Consumable<Schemas['QuizQuestion'], QuizQuestion>;
type _Quiz = Consumable<Schemas['QuizBlock'], Quiz>;
type _RoadmapStep = Consumable<Schemas['RoadmapStep'], RoadmapStep>;
type _Roadmap = Consumable<Schemas['RoadmapBlock'], Roadmap>;
type _Flashcard = Consumable<Schemas['Flashcard'], Flashcard>;
type _Flashcards = Consumable<Schemas['FlashcardsBlock'], Flashcards>;
type _WeakTopic = Consumable<Schemas['WeakTopic'], WeakTopic>;
type _ProgressPanel = Consumable<Schemas['ProgressPanelBlock'], ProgressPanel>;

// Envelopes.
type _AdaptationSummary = Consumable<Schemas['AdaptationSummary'], AdaptationSummary>;
type _AskRequest = Consumable<AskRequest, Schemas['AskRequest']>;
type _AskResponse = Consumable<Schemas['AskResponse'], AskResponse>;
type _QuizSubmitRequest = Consumable<QuizSubmitRequest, Schemas['QuizSubmitRequest']>;
type _QuizSubmitResponse = Consumable<Schemas['QuizSubmitResponse'], QuizSubmitResponse>;
type _ProfileRequest = Consumable<ProfileRequest, Schemas['ProfileRequest']>;

// Requests assert the opposite direction: what we send must satisfy the
// backend. Both directions are covered, each where it actually matters.
