# ADR-005: SM-2 Spaced Repetition Algorithm

**Date**: 2026-06-16  
**Status**: Accepted  
**Deciders**: Project leads

---

## Context

VimTrainer uses spaced repetition to surface weak keymaps at optimal review intervals. The algorithm choice affects learning quality, implementation complexity, and system transparency.

Options evaluated:

1. **SM-2** (SuperMemo 2) — the classic algorithm, deterministic, well-documented
2. **SM-4 / FSRS** (Free Spaced Repetition Scheduler) — more recent, machine-learning-informed
3. **Leitner system** — box-based system, simpler than SM-2
4. **Custom neural / ML approach** — learned scheduling based on user history
5. **Random shuffling with recency weighting** — no formal SRS algorithm

## Decision

Implement a modified SM-2 algorithm, server-side in Go, deterministic, no AI/ML.

**Key modification**: Quality score (0-5) is derived from two signals — correctness (binary) and response time. Fast correct answers score 5; slow correct answers score 3; incorrect answers score 1. This maps keymap practice's performance signal (both accuracy and response time matter) onto SM-2's quality scale.

## Rationale

**SM-2 is the correct algorithm for this domain.** SM-2 was designed for flashcard-style recall — exactly what keymap practice is. The core insight (easy items need rare review, difficult items need frequent review, ease factor adjusts per item) maps directly to keymaps (a binding you always recall instantly needs less practice than one you consistently fumble).

**Deterministic behavior is a product requirement.** Two of the four personas (Arjun, Priya) would leave if the SRS algorithm is opaque. "Why is this command appearing again?" must have a deterministic, explainable answer. SM-2's rule is simple: "You scored a 3 last time, so interval is 6 days." A learned model cannot give this explanation.

**Response time as a quality signal.** A keymap that takes 3 seconds to recall is not mastered, even if the answer is eventually correct. SM-2's quality scale (0-5) accommodates this: we map `correct + fast` to `q=5`, `correct + slow` to `q=3`, `incorrect` to `q=1`. This means a technically correct but slow answer still increases the review interval slightly, but not as aggressively as a fast correct answer.

**Server-side execution.** The SRS algorithm runs in the Go API, not in the browser. This ensures correctness regardless of client state, enables the guest migration transaction (SRS records transfer with the session data), and allows the daily queue generation to query the authoritative ease factor values.

**Simplicity at V1.** SM-4/FSRS requires per-user parameter estimation from training data, which requires accumulated session history before it can outperform SM-2. At V1 with new users, SM-2 with sensible defaults is as good as or better than a learned model with insufficient data.

## Algorithm Implementation

```go
// Quality score mapping
// Correct + response_ms < 1000  → quality 5 (perfect recall)
// Correct + response_ms < 2000  → quality 4 (correct recall)
// Correct + response_ms >= 2000 → quality 3 (correct but hesitant)
// Incorrect                     → quality 1 (failed)

func UpdateSRSRecord(record *SRSRecord, quality int) {
    if quality >= 3 {
        switch record.Repetitions {
        case 0: record.IntervalDays = 1
        case 1: record.IntervalDays = 6
        default:
            record.IntervalDays = int(float64(record.IntervalDays) * record.EaseFactor)
        }
        record.Repetitions++
        ef := record.EaseFactor + (0.1 - float64(5-quality)*(0.08+float64(5-quality)*0.02))
        record.EaseFactor = clamp(ef, 1.30, 2.50)
    } else {
        record.Repetitions = 0
        record.IntervalDays = 1
        record.EaseFactor = math.Max(1.30, record.EaseFactor-0.20)
    }
    record.NextReviewAt = time.Now().Add(time.Duration(record.IntervalDays) * 24 * time.Hour)
}
```

**Defaults**: `ease_factor = 2.50`, `interval_days = 1`, `repetitions = 0`  
**Floor**: `ease_factor >= 1.30` (prevents infinitely short intervals)  
**Ceiling**: `ease_factor <= 2.50` (initial default; items can never become "too easy" to exceed this)

## Daily Queue Composition

The algorithm feeds into the daily queue generator:
```
10 items: lowest ease_factor WHERE next_review_at <= NOW()   (hardest overdue items)
 5 items: total_reviews = 0                                   (never practiced)
 5 items: random from remaining set                           (exploration)
= 20 items total, fixed order at generation time
```

## Mastery Threshold

A keymap is **mastered** when `correct_reviews / total_reviews >= 0.80` AND `total_reviews >= 5`. This threshold is used in the `commands_mastered` stat on the profile and in achievement conditions. It is intentionally conservative — 80% accuracy over at least 5 appearances means the binding has genuinely become reliable.

## Consequences

- **Positive**: Deterministic, explainable scheduling. Users can understand why an item appears.
- **Positive**: Pure Go implementation, no ML dependencies, runs on any hardware.
- **Positive**: Response time signal distinguishes hesitant correct from confident correct.
- **Positive**: Well-understood algorithm with 30+ years of validation in flashcard apps.
- **Negative**: SM-2 is not optimal for all learning curves. FSRS would eventually outperform it with sufficient data. Accepted: the upgrade path is replacing `UpdateSRSRecord` with an FSRS implementation — the data model is compatible.
- **Negative**: Ease factor ceiling at 2.50 means well-mastered items review every ~2.5x the previous interval, which can feel slightly frequent for expert users. Priya's use case (8-year Vim expert) may generate more reviews than needed for known items. Mitigated by the mastery threshold — once mastered, items appear less frequently in the daily queue.

## Upgrade Path

SM-2 → FSRS requires:
1. Adding `stability` and `difficulty` fields to `spaced_repetition_records` (migration)
2. Replacing the `UpdateSRSRecord` function body with FSRS scheduling logic
3. Backfilling `stability` from existing `interval_days` values
No API changes, no frontend changes.
