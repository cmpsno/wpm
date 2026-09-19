# Error model

Contract for the typing error analyzer's classification layer
(`scripts/errorClassification.js`, `scripts/errorProfile.js`).
Every statement here is grounded in the source; keep it in sync.

## Labels overlap

A mistake is a substitution (expected -> actual). `classifySubstitution`
assigns zero or more labels from `adjacent`, `same-finger`, `homologous`;
`'other'` is used only when none of the mechanical explanations apply, so
every mistake carries at least one label.

- Rates (`adjacentRate`, `sameFingerRate`, `homologousRate`) are each the
  share of mistakes carrying that label. They are NOT mutually exclusive
  and do not sum to 1; do not renormalize them — thresholds in
  `diagnoseMechanically` depend on per-label shares.
- `labelOverlap = totalLabels / totalMistakes` is the average number of
  labels per mistake (1.0 = disjoint, 2.0 = every mistake carries two
  labels). It is 0 when there are no mistakes. Overlapping labels are
  intentional.

## Mechanical diagnosis

`diagnoseMechanically` evaluates rule candidates against session rates and
returns at most `MAX_DIAGNOSES` (2) diagnoses, sorted by the frozen
precedence list, most specific first:

1. hand-mapping-confusion
2. index-finger-overreach
3. high-cognitive-load
4. vertical-finger-drift

Exactly one returned diagnosis is tagged `primary: true`; the rest are
`secondary`. Patterns not in the precedence list sort last, never first.

## totalCharacters and sticky habits

- `totalCharacters` is total keypresses (including backspaced and
  corrected ones), consistent with `state.totalKeystrokes`.
- Per-session substitution rate = count / totalCharacters; null when the
  denominator is not a positive integer.
- A sticky habit is the same (expected, actual) pair appearing in >= 3
  sessions. `findStickyHabits` sorts runs oldest-first internally (by
  `completedAt`, then `date`, then `id`), so caller order does not matter
  and the caller's array is never mutated.
- `isImproving` over per-session rates (oldest -> newest): the newest rate
  is <= 60% of the oldest rate, and at least one middle rate is strictly
  below the oldest, which guards against a single-session cliff looking
  like a trend. It needs >= 3 usable rates; an oldest rate of 0 counts as
  improving. The trend uses the last 5 sessions only.
- Sessions with null/invalid `totalCharacters` are excluded from the trend
  but still count toward the session total.

## Latency bands

`latencyBand(latencyMs, baseline = null)`: negative and non-finite
latencies are `'unknown'`. Absolute cutoffs: motor < 80ms, transition
80–400ms inclusive, cognitive > 400ms. With a valid baseline (finite and
> 0): motor < baseline * 0.5, transition <= baseline * 2.0, cognitive
above; invalid baselines fall back to the absolute cutoffs. The rolling
baseline is the median of the 5 most recent valid per-run baselines.

## Finger map

`FINGER_KEY_MAP`: leftPinky qaz / leftRing wsx / leftMiddle edc /
leftIndex rtfgvb / rightIndex yuhjnm / rightMiddle ik / rightRing ol /
rightPinky p;/ / thumb space. Space maps to `thumb` as an intentional
simplification, since which thumb pressed space is not observable from a
keystroke event. A module-load guard (`assertFingerMapIsDisjoint`) throws
on duplicate keys, so a later entry can never silently overwrite an
earlier one. `fingerForKey` returns null for unmapped or malformed keys.
