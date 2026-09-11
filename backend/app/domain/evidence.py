"""What the policy is allowed to see.

Plain dataclasses, no ORM and no framework. The policy is a pure function from
these to a decision, which is what makes it testable in milliseconds against the
captured goldens rather than through HTTP.
"""

from dataclasses import dataclass, field

from app.domain.constants import RECENT_WINDOW


@dataclass(frozen=True, slots=True)
class ObservedAnswer:
    """One answer, as the policy sees it.

    `sequence` is monotonic within a session; no wall-clock time is needed and
    none is stored, so replaying a session is deterministic.
    """

    correct: bool
    elapsed_ms: int
    sequence: int


@dataclass(frozen=True, slots=True)
class TopicEvidence:
    topic_id: str
    label: str
    prerequisite_topic_id: str | None
    recent: tuple[ObservedAnswer, ...] = ()

    def trailing(self, count: int) -> tuple[ObservedAnswer, ...]:
        """The last `count` answers, or fewer if there are not that many."""
        return self.recent[-count:] if count else ()

    @property
    def latest(self) -> ObservedAnswer | None:
        return self.recent[-1] if self.recent else None


@dataclass(frozen=True, slots=True)
class SessionEvidence:
    """Everything the policy may use when choosing the next screen.

    Assembled by the service layer rather than inside the policy, so the policy
    stays pure — the same property that lets `/dev` review every scenario
    without playing through the app.
    """

    user_id: str
    revision: int
    focus_topic_id: str
    topics: dict[str, TopicEvidence] = field(default_factory=dict)
    streak: int = 0

    def topic(self, topic_id: str) -> TopicEvidence | None:
        return self.topics.get(topic_id)


def window(answers: list[ObservedAnswer] | tuple[ObservedAnswer, ...]) -> tuple[ObservedAnswer, ...]:
    """Apply RECENT_WINDOW.

    Bounded on read, not on write. The store keeps the full history — that is
    what lets the window be widened later without losing the answers it would
    then need.
    """
    return tuple(answers)[-RECENT_WINDOW:]
