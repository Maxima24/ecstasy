import { Screen } from '@/components/Screen';

/**
 * There is one screen. Its contents change.
 *
 * The seeded demo account resolves without any auth flow (PRD §3.1), so a judge
 * opening the live URL lands straight in a populated session — no signup, no
 * empty state, mastery already partial.
 */
export default function Home() {
  return <Screen />;
}
