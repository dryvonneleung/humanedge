# Human Advantage Assessment (HAA)

A self-contained web assessment built around one question: **how do you naturally create value in the world?**
Nine domains across Thinking, Creating, Connecting and Performing. AI appears in the interpretation of the
result, not in the framework itself.

## Running it

Double-click `index.html` — it needs no build step, no dependencies and no server.

To serve it over HTTP instead (needed for phone testing on the same network, or before deploying):

```bash
python3 -m http.server 8791
```

Then open `http://localhost:8791`. Deploying is just uploading the four files to any static host
(GitHub Pages, Netlify, S3, a university web directory).

## Files

| File | What's in it |
|---|---|
| `index.html` | Page shell and the five screens |
| `data.js` | **All instrument content** — domains, 27 items, energy prompts, reflection items, archetypes |
| `app.js` | Flow control, scoring, charts, exports |
| `styles.css` | Styling, including print/PDF rules |

Item wording, domain descriptions and archetypes all live in `data.js`, so revising the instrument after
piloting doesn't require touching the logic.

## The three parts

1. **Strengths** — 27 items, 1–5 agreement, 6 per screen. Items are **interleaved rather than grouped by
   domain** (each block of 9 covers all 9 domains) to reduce halo effects and within-domain response sets.
   All items on a screen must be answered before continuing.
2. **Energy** — 9 items, 1–5 draining-to-energising. The prompts describe **the activity, not the domain
   label**, so people rate the doing of it rather than how flattering the label sounds. Strength scores are
   deliberately hidden until the report so they can't anchor the energy ratings.
3. **Hidden strengths** — HS1 (choose up to 3) plus three open-text items. Unscored, optional, reproduced
   verbatim in the report.

Keyboard `1`–`5` answers the current item and advances. Progress autosaves to `localStorage` after every
answer, and a "Resume where I left off" button appears on return, jumping to the first incomplete part.

## Scoring

- Domain score = mean of its 3 items, rescaled to 0–100 as `(mean − 1) / 4 × 100`.
- Domains are ranked by score; **energy is the tie-break**, then a fixed domain order.
- Top 3 → Signature strengths. Middle 3 → Supporting strengths. Bottom 3 → **Quieter domains**, each
  reported with a non-deficit reading (low Mobilization reads as "you create value through depth rather
  than influence"), never as a weakness.
- `withinPersonCentred` (in the JSON export) is each score minus the respondent's own mean — the shape of
  the profile with general self-rating tendency removed. Useful if you later want to run analyses on profile
  shape rather than elevation.
- **Strength × energy** quadrants split at the respondent's *own* averages on both axes, so the map compares
  their nine domains against each other rather than against a norm group that doesn't exist yet:
  Core edge, Costly strength, Growth fuel, Design around.
- Archetype fit = mean score across the profile's domains, plus 5 points per domain shared with the
  respondent's top three. Quiet Specialist uses Craftsmanship, Sense-Making and `100 − Mobilization` as its
  independence-oriented third component. The closest profile is shown as a hero; the next two are listed as
  "nearby profiles" with the same fit figure used for ranking.

### Degenerate-response handling

Two cases are called out explicitly rather than papered over:

- **Boundary ties.** If the 3rd and 4th ranked domains score the same, the report says the top-three cut was
  decided by a tie-break rather than by the respondent's answers, and points them to the energy ratings.
- **Flat profiles.** If capability spread is under 6 points and energy range is ≤ 1, the quadrant map is
  replaced with an explanation that there is nothing to separate, plus a suggestion to retake Part 1 using
  the full range. A single degenerate axis gets a softer note telling the reader which axis carries the
  information.

## Exports

- **Save as PDF / print** — print stylesheet drops navigation and keeps cards from breaking across pages.
- **Copy summary** — plain-text summary for pasting into notes or email.
- **Download full data (JSON)** — every raw response, all domain scores, and the derived profile.
- **Download row (CSV)** — one wide row, 64 columns: 27 item responses, 9 energy ratings, 9 domain means,
  HS1 as binary columns, open text, and the matched profile. Append rows across participants to build the
  matrix for factor analysis.

## Collecting the 300–500 responses

Nothing leaves the browser by default. `DATA_COLLECTION_ENDPOINT` at the top of `data.js` is `null`; set it
to an HTTPS endpoint accepting a JSON `POST` and each completed assessment will be submitted when the report
is generated (item responses, energy ratings and HS1 only — no open text). Posting is fire-and-forget and can
never block or break the report.

Before turning that on, three things matter: participants need to be told collection is happening, the
landing copy currently promises the opposite and must be updated to match, and if this runs at Northeastern
with identifiable participants it is human-subjects research and needs IRB review.

The CSV export is the zero-infrastructure alternative — have pilot participants send you their row.

## Known limits

This is a pilot instrument, not a validated test, and the report says so where the reader will see it.

- Three self-report items per domain is thin. Expect low reliability on individual domains.
- The 9-domain structure is a hypothesis. With 300–500 responses, run EFA — 6–8 factors is the likelier
  outcome, with Sense-Making/Integration and Mobilization/Human Understanding the most probable collapses.
- Scores are ipsative in practice (interpreted relative to the respondent's own mean) because there is no
  norm group yet. Once you have a sample, the 0–100 scores can be replaced with percentiles.
- All items are positively keyed, so acquiescence bias inflates everything uniformly. The within-person
  centred scores and the energy measure are the current mitigations; a few reverse-keyed items would be a
  cheap improvement in the next revision.
- Archetype thresholds and the +5 overlap bonus are judgement calls, not fitted parameters.
