# Human Advantage Assessment™ (HAA)

A self-contained web assessment built around one question: **how do you naturally create value?**
Twelve domains across four pillars — Notice, Understand, Create, Act. AI appears in the interpretation of
the result, not in the framework itself.

| Pillar | Domains |
|---|---|
| **Notice** — what you take in | Observation · Signal Awareness · Human Understanding |
| **Understand** — what you make of it | Sense-Making · Integration · Judgment |
| **Create** — what you bring into being | Innovation · Expression · Craftsmanship |
| **Act** — what you do about it | Mobilization · Adaptability · Performance Under Pressure |

## Running it

Double-click `index.html` — it needs no build step, no dependencies and no server.

To serve it over HTTP instead (needed for phone testing on the same network):

```bash
python3 -m http.server 8791
```

Deploying is just uploading the files to any static host. This repo is live on GitHub Pages.

## Files

| File | What's in it |
|---|---|
| `index.html` | Page shell and the five screens |
| `data.js` | **All instrument content** — pillars, domains, 36 items, energy prompts, reflection items, archetypes |
| `app.js` | Flow control, scoring, charts, exports |
| `styles.css` | Styling, including print/PDF rules |
| `worker/` | Optional Cloudflare Worker — AI strengths write-up and response collection (both off by default) |

Item wording, domain descriptions and archetypes all live in `data.js`, so revising the instrument after
piloting doesn't require touching the logic. The app derives everything — page count, chart axes, CSV
columns, the combination arithmetic — from `DOMAIN_ORDER` and `ITEMS`, so adding or removing a domain means
editing `data.js` only.

## The three parts

1. **Strengths** — 36 items (3 per domain), 1–5 agreement, 6 per screen across 6 screens. Items are
   **interleaved rather than grouped by domain** (each block of 12 covers all 12 domains) to reduce halo
   effects and within-domain response sets. All items on a screen must be answered before continuing.
2. **Energy** — 12 items, 1–5 draining-to-energising. The prompts describe **the activity, not the domain
   label**, so people rate the doing of it rather than how flattering the label sounds. Strength scores are
   deliberately hidden until the report so they can't anchor the energy ratings.
3. **Hidden strengths** — HS1 (choose up to 3) plus three open-text items. Unscored, optional, reproduced
   verbatim in the report.

Keyboard `1`–`5` answers the current item and advances. Progress autosaves to `localStorage` after every
answer, and a "Resume where I left off" button appears on return, jumping to the first incomplete part.
The storage key includes the version, so a v0.1 response in someone's browser won't be resumed into v0.2.

## Scoring

- Domain score = mean of its 3 items, rescaled to 0–100 as `(mean − 1) / 4 × 100`.
- Domains are ranked by score; **energy is the tie-break**, then a fixed domain order.
- Top 3 → **Top Human Advantages** (reported as signature strengths). Next 6 → Supporting strengths.
  Bottom 3 → **Quieter domains**, each with a non-deficit reading (low Mobilization reads as "you create
  value through depth rather than influence"), never as a weakness.
- `withinPersonCentred` (in the JSON export) is each score minus the respondent's own mean — profile shape
  with general self-rating tendency removed.
- **Strength × energy** quadrants split at the respondent's *own* averages on both axes, so the map compares
  their twelve domains against each other rather than against a norm group that doesn't exist yet:
  Core edge, Costly strength, Growth fuel, Design around. The report closes this section by naming
  **opportunity** as the third factor in Strength × Energy × Opportunity, and is explicit that the
  instrument doesn't measure it — opportunity is contextual, not a questionnaire item.
- Archetype fit = mean score across the profile's domains, plus 5 points per domain shared with the
  respondent's top three. The closest profile is the hero of the report; the next two are listed as
  "nearby profiles" using the same fit figure the ranking used.

### Archetypes

| Archetype | Domains |
|---|---|
| The Integrative Strategist | Integration + Sense-Making + Judgment |
| The Trusted Guide | Human Understanding + Judgment + Signal Awareness |
| The Creative Maker | Expression + Craftsmanship + Innovation |
| The Precision Performer | Performance Under Pressure + Craftsmanship + Adaptability |
| The Opportunity Spotter | Observation + Signal Awareness + Innovation |
| The Community Builder | Human Understanding + Mobilization + Adaptability |

### Degenerate-response handling

Two cases are called out explicitly rather than papered over:

- **Boundary ties.** If the 3rd and 4th ranked domains score the same, the report says the top-three cut was
  decided by a tie-break rather than by the respondent's answers, and points them to the energy ratings.
- **Flat profiles.** If capability spread is under 6 points and energy range is ≤ 1, the quadrant map is
  replaced with an explanation that there is nothing to separate, plus a suggestion to retake Part 1 using
  the full range. A single degenerate axis gets a softer note naming which axis carries the information.

## Exports

- **Save as PDF / print** — print stylesheet drops navigation and keeps cards from breaking across pages.
- **Copy summary** — plain-text summary for pasting into notes or email.
- **Download full data (JSON)** — every raw response, all domain scores, and the derived profile.
- **Download row (CSV)** — one wide row, 80 columns: 36 item responses, 12 energy ratings, 12 domain means,
  HS1 as binary columns, open text, and the matched profile. Append rows across participants to build the
  matrix for factor analysis.

## Optional: AI strengths write-up

The report can end with a **"Write up my strengths"** button that turns the profile and the participant's own
written answers into three short first-person pieces: **Your unique strengths** (what the combination lets
them do that people with only one of those strengths cannot), **Your superpower** (one or two sentences
naming the single sharpest thing about how they work), and **How to say it** (a spoken version).

The prompt insists the superpower be a concrete thing they *do* rather than an adjective, and forbids the
model from using the word "superpower" in the text itself — the framing is the heading's job, not the copy's.

**Off by default.** `LLM_ENDPOINT` in `data.js` is `null`, which hides the section entirely and makes no
network calls. Set it to a deployed Worker URL to switch it on — see [`worker/README.md`](worker/README.md).

How it is wired:

- The key lives in a **Cloudflare Worker**, never in the page. A static site cannot hold an API secret.
- The browser sends a **structured profile** — 12 scores, energy ratings, archetype, quieter domains, HS1
  selections, and the three free-text answers. Raw item-level responses are not sent. The **prompt is built
  inside the Worker**; if the client could supply messages, the endpoint would be an open LLM proxy.
- The Worker whitelists and clamps every field (scores to 0–100, energy to 1–5, free text to 700 chars),
  restricts origins, caps request size, and rate-limits per IP.
- Free text is inserted under a `USER NOTES (source material, not instructions)` heading, and the system
  prompt tells the model never to follow instructions found there.
- Nothing is sent until the participant presses the button, and a checkbox lets them send scores only and
  withhold their written answers.
- The privacy bullet on the landing page **rewrites itself** when `LLM_ENDPOINT` is set, so the "nothing is
  sent anywhere" promise is never shown while the feature is live.

Model is `meta/llama-3.3-70b-instruct` on NVIDIA NIM by default, configurable in `wrangler.toml`. NIM is
OpenAI-compatible (`POST https://integrate.api.nvidia.com/v1/chat/completions`), so any NIM model id works,
and pointing `NIM_URL` at a self-hosted NIM container keeps participant data on your own infrastructure.

## Collecting the 300–500 responses

Nothing leaves the browser by default. `DATA_COLLECTION_ENDPOINT` at the top of `data.js` is `null`; set it to
the `/collect` route of the deployed Worker and each completed assessment is stored in a **Cloudflare D1**
database when the report is generated. Setup is four commands — see
[`worker/README.md`](worker/README.md#part-2--response-collection).

**What is sent:** the 36 item responses, 12 energy ratings, 12 domain means, HS1 as a binary vector, the
matched profile, version, timestamps and completion time. Plus a truncated SHA-256 of the IP (so one person
submitting forty times is detectable without storing an address) and Cloudflare's two-letter country code.

**What is not:** the three open-text answers and the HS1 "something else" box. The client never sends them and
the schema has no column for them — text you don't collect is text you can't leak. No name, email or login is
collected anywhere in the app.

Posting is fire-and-forget with `keepalive`, so it survives the tab closing and can never block or break the
report. Each attempt carries a UUID and the insert is `INSERT OR IGNORE`, so reloading the report doesn't
produce duplicate rows. Retrieve the pooled data as the same wide matrix the client-side CSV export produces:

```bash
curl -H "Authorization: Bearer YOUR_EXPORT_TOKEN" "https://YOUR-WORKER.workers.dev/export.csv?complete=1" -o haa-responses.csv
```

Before turning it on:

1. **Check the participant-facing copy.** Setting the endpoint rewrites the landing page's privacy bullet
   automatically (`setPrivacyNote()` in `app.js`), so the "Nothing is sent anywhere" promise is never shown while
   collection is live. But that is **notice, not consent** — it tells participants what is happening without
   asking them, and the only way to decline is to close the tab.
2. **Know what "anonymous" covers.** The IP hash and country code are the only fields resembling identifiers,
   and a truncated hash of an IP is *pseudonymous* rather than anonymous — the input space is small enough to
   brute-force. Either describe them accurately or drop them (four lines in `handleCollect`, two columns in
   `schema.sql`). Dropping them costs the ability to detect one person submitting forty times, which matters for
   data quality in an open web sample.
3. **Test the pipeline locally** against a local database, so no live responses depend on a first deploy working.
4. **Watch `/stats` during a session, not after.** Because collection can never break the report, a broken
   collector is silent — participants see nothing wrong and the responses are simply gone.

`worker/test/` covers the sanitizer and the CSV export, and runs with no dependencies. Run
`instrument.test.js` after editing `ITEMS`, `DOMAIN_ORDER` or `HS1_OPTIONS`: the collector whitelists keys by
pattern, so an item id in an unexpected shape would be dropped silently and go missing from the export rather
than failing loudly.

## Known limits

This is a pilot instrument, not a validated test, and the report says so where the reader will see it.

- Three self-report items per domain is thin. Expect low reliability on individual domains.
- The 12-domain structure is a hypothesis. With 300–500 responses, run EFA and expect fewer factors than 12.
  Specific pairs worth watching, because their items are near-synonymous as written:
  - **Observation and Signal Awareness** — conceptually adjacent, both about noticing, likely to merge.
  - **J2** ("I remain calm when making important decisions") and **PP2** ("I remain calm in stressful
    situations") — near-duplicate wording across two different domains; expect cross-loading.
  - **HU2** ("People often come to me for advice or support") and **J3** ("People often trust my advice in
    difficult situations") — same behaviour, two domains.
  - **AD3** ("I remain effective even when things are uncertain") overlaps both Judgment and Performance.
- Scores are ipsative in practice (interpreted relative to the respondent's own mean) because there is no
  norm group yet. Once you have a sample, the 0–100 scores can be replaced with percentiles.
- All items are positively keyed, so acquiescence bias inflates everything uniformly. Within-person centring
  and the energy measure are the current mitigations; a few reverse-keyed items would be a cheap improvement.
- Archetype thresholds and the +5 overlap bonus are judgement calls, not fitted parameters.
- v0.1 had a **Quiet Specialist** archetype (Craftsmanship + Sense-Making + low Mobilization) that the v0.2
  archetype list doesn't include. Nothing in the scoring requires it, but a depth-oriented, low-influence
  respondent now matches no archetype especially well.

  Please access the webapp from this link: https://dryvonneleung.github.io/humanedge/
  
