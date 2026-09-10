import 'server-only';

import type {
  AudioExplainer,
  ExplainerCard,
  Flashcards,
  QuizQuestion,
} from '../types';

type TopicMaterial = {
  explainer: Omit<ExplainerCard, 'type'>;
  audioScript: string;
  guidedQuestion: QuizQuestion;
  transferQuestion: QuizQuestion;
  timedQuestion: QuizQuestion;
  flashcards: Flashcards['cards'];
};

const LINEAR_EQUATIONS: TopicMaterial = {
  explainer: {
    title: 'Isolating the variable',
    steps: [
      { text: 'Subtract 5 from both sides.', expr: '3x = 15' },
      { text: 'Divide both sides by 3.', expr: '\\frac{3x}{3} = \\frac{15}{3}' },
      { text: 'So x is 5.', expr: 'x = 5' },
    ],
    citation: { chunk_id: 'os_alg_2_3', label: 'Linear Equations, 2.3' },
  },
  audioScript:
    'To isolate x, subtract 5 from both sides, leaving 3x equals 15. ' +
    'Then divide both sides by 3, giving x equals 5.',
  guidedQuestion: {
    id: 'linear_guided_01',
    stem: 'Subtract 7 first. If 4x + 7 = 31, what is x?',
    stem_expr: null,
    options: ['3', '4', '6', '7', '8'],
    topic_id: 'linear_equations',
    answer_index: 2,
    rationale: 'Subtracting 7 gives 4x = 24. Dividing by 4 gives x = 6.',
  },
  transferQuestion: {
    id: 'linear_transfer_01',
    stem: 'If 5x - 4 = 26, what is x?',
    stem_expr: null,
    options: ['4', '5', '6', '7', '8'],
    topic_id: 'linear_equations',
    answer_index: 2,
    rationale: 'Adding 4 gives 5x = 30. Dividing by 5 gives x = 6.',
  },
  timedQuestion: {
    id: 'linear_timed_01',
    stem: 'If 7x + 2 = 44, what is x?',
    stem_expr: null,
    options: ['4', '5', '6', '7', '8'],
    topic_id: 'linear_equations',
    answer_index: 2,
    rationale: 'Subtracting 2 gives 7x = 42. Dividing by 7 gives x = 6.',
  },
  flashcards: [
    {
      front: 'What undoes addition in an equation?',
      back: 'Subtract the same amount from both sides.',
      topic_id: 'linear_equations',
    },
    {
      front: 'What undoes multiplication in an equation?',
      back: 'Divide both sides by the same non-zero number.',
      topic_id: 'linear_equations',
    },
  ],
};

const ARITHMETIC: TopicMaterial = {
  explainer: {
    title: 'Undoing addition first',
    steps: [
      { text: 'Start with the total.', expr: '31' },
      { text: 'Remove the amount that was added.', expr: '31 - 7 = 24' },
      { text: 'Check by adding it back.', expr: '24 + 7 = 31' },
    ],
    citation: { chunk_id: 'os_pre_alg_1_2', label: 'Whole Number Operations, 1.2' },
  },
  audioScript:
    'Before solving the equation, practise its first inverse operation. ' +
    'Thirty one minus seven is twenty four; adding seven returns to thirty one.',
  guidedQuestion: {
    id: 'arithmetic_guided_01',
    stem: 'Count back 7 from 31. What is 31 - 7?',
    stem_expr: null,
    options: ['20', '22', '24', '26', '28'],
    topic_id: 'arithmetic',
    answer_index: 2,
    rationale: '31 - 7 = 24. You can check because 24 + 7 = 31.',
  },
  transferQuestion: {
    id: 'arithmetic_transfer_01',
    stem: 'What is 42 - 18?',
    stem_expr: null,
    options: ['20', '22', '24', '26', '28'],
    topic_id: 'arithmetic',
    answer_index: 2,
    rationale: '42 - 18 = 24.',
  },
  timedQuestion: {
    id: 'arithmetic_timed_01',
    stem: 'What is 15 + 9?',
    stem_expr: null,
    options: ['20', '22', '24', '26', '28'],
    topic_id: 'arithmetic',
    answer_index: 2,
    rationale: '15 + 9 = 24.',
  },
  flashcards: [
    { front: '31 - 7', back: '24', topic_id: 'arithmetic' },
    { front: '24 + 7', back: '31', topic_id: 'arithmetic' },
  ],
};

const MATERIALS: Record<string, TopicMaterial> = {
  linear_equations: LINEAR_EQUATIONS,
  arithmetic: ARITHMETIC,
};

function materialFor(topicId: string): TopicMaterial {
  // The fixture asks about linear equations. Falling back to that complete
  // material set is safer than emitting a malformed block for an unknown id.
  return MATERIALS[topicId] ?? LINEAR_EQUATIONS;
}

export function explainerFor(topicId: string): ExplainerCard {
  return { type: 'explainer_card', ...materialFor(topicId).explainer };
}

export function audioFor(topicId: string): AudioExplainer {
  return {
    type: 'audio_explainer',
    script: materialFor(topicId).audioScript,
    audio_url: '/fixture-silence.wav',
    duration_ms: 2_000,
    transcript_shown: false,
  };
}

export function questionFor(
  topicId: string,
  kind: 'guided' | 'transfer' | 'timed',
): QuizQuestion {
  const material = materialFor(topicId);
  if (kind === 'guided') return material.guidedQuestion;
  if (kind === 'timed') return material.timedQuestion;
  return material.transferQuestion;
}

export function flashcardsFor(topicId: string): Flashcards {
  return { type: 'flashcards', cards: materialFor(topicId).flashcards };
}

