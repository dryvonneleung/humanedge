# Cloudflare Worker — write-up generator and response collection

One Worker, two independent features, four routes:

| Route | Method | Purpose | Needs |
|---|---|---|---|
| `/` | POST | Strengths write-up, proxied to NVIDIA NIM | `NVIDIA_API_KEY` |
| `/collect` | POST | Store one completed assessment | `DB` (D1) |
| `/export.csv` | GET | The wide analysis matrix | `DB` + `EXPORT_TOKEN` |
| `/stats` | GET | Response counts by version | `DB` + `EXPORT_TOKEN` |

The features are independent: no `NVIDIA_API_KEY` disables the write-up, no `DB`
binding makes `/collect` return 503, and neither failure touches the other. You
can deploy this for collection alone and never set up an NVIDIA key. Free tier
covers both comfortably — D1's free allowance is five million reads and a hundred
thousand writes a day, against a target sample of 300–500 responses.

The write-up stays on the bare path so an `LLM_ENDPOINT` set before these routes
existed keeps working after redeploy.

---

# Part 1 — Strengths write-up

Proxies the assessment's "Write up my strengths" button to NVIDIA NIM so
the API key stays server-side.

## Why a proxy at all

The site is static files on GitHub Pages. An `nvapi-` key placed in `app.js`
would be readable by anyone who views source, and anyone could then spend your
NVIDIA credits. The browser also can't call `integrate.api.nvidia.com` directly
because of CORS. The Worker solves both.

The client sends a **structured profile**, never a prompt. The prompt is built
inside the Worker from whitelisted, length-clamped fields. If the client could
send arbitrary messages, this URL would be an open LLM proxy for anyone who
found it.

## Deploy

You need a Cloudflare account (free) and an NVIDIA API key from
[build.nvidia.com](https://build.nvidia.com) — click any model, then "Get API
Key". It starts with `nvapi-`.

```bash
cd worker && npx wrangler login
```

```bash
npx wrangler kv namespace create RATE_LIMIT
```

Paste the printed id into `wrangler.toml` and uncomment that block, then store
the key as a secret — it is encrypted at rest and never appears in the repo:

```bash
npx wrangler secret put NVIDIA_API_KEY
```

```bash
npx wrangler deploy
```

Wrangler prints a URL like `https://haa-value-prop.<your-subdomain>.workers.dev`.
Put it in `data.js` at the top of the project:

```js
const LLM_ENDPOINT = "https://haa-value-prop.your-subdomain.workers.dev";
```

Commit and push. While `LLM_ENDPOINT` is `null`, the feature is hidden entirely
and the site behaves exactly as it does today.

## Configuration

| Where | Setting | Purpose |
|---|---|---|
| `worker.js` | `ALLOWED_ORIGINS` | Origins permitted to call the Worker. Update if you move the site. |
| `worker.js` | `RATE_LIMIT` | Per-IP cap, default 8/hour. |
| `worker.js` | `MAX_NOTE_CHARS` | Truncation for each free-text answer, default 700. |
| `wrangler.toml` | `MODEL` | Any NIM model id. |
| secret | `NVIDIA_API_KEY` | Set via `wrangler secret put`, never committed. |

## Testing

```bash
curl -sS -X POST https://YOUR-WORKER.workers.dev -H "Content-Type: application/json" -H "Origin: https://dryvonneleung.github.io" -d '{"archetype":"The Trusted Guide","top":[{"name":"Human Understanding","score":92,"energy":5},{"name":"Judgment","score":83,"energy":4},{"name":"Signal Awareness","score":83,"energy":5}],"all":[{"name":"Human Understanding","score":92,"energy":5},{"name":"Judgment","score":83,"energy":4},{"name":"Signal Awareness","score":83,"energy":5}],"quieter":["Mobilization"],"helpWith":["Understanding people"],"notes":{"flow":"listening to people work through a problem","underrated":"staying calm in other people'"'"'s crises","notAI":"sitting with someone in a bad moment without trying to fix it"}}'
```

A request without the `Origin` header, or from another origin, should return
403 — that's the check working.

## What this means for participants

Once `LLM_ENDPOINT` is set, the report gains a section explaining exactly what
would be sent, and nothing is sent until the participant presses the button.
They can also untick their written answers and send scores only.

Two things to keep in mind:

- **This breaks "nothing is sent anywhere."** The landing copy has been updated
  to say data stays local *unless* the participant uses the optional generator.
  If you change what gets sent, change that copy too.
- **NVIDIA's hosted API is a third party.** Review their data-retention terms
  before running this with participants. If retention is a problem, NIM also
  ships as a container you can self-host on your own GPU, in which case point
  `NIM_URL` at your own instance and nothing leaves your infrastructure.

Note that this is the one path where free text leaves the device — the three
open-text answers, if the participant leaves the checkbox ticked. Worth keeping
in mind, since people sometimes name themselves, their employer or a colleague
in a box asking what they are good at.

---

# Part 2 — Response collection

Stores each completed assessment in **Cloudflare D1** (SQLite) so the pilot can
be validated against the 300–500 responses the instrument needs. Unlike the
write-up, this is not opt-in per participant — it fires automatically when the
report is generated, which is why the disclosure requirements below are not
optional.

## What is stored

Scored data only:

| Stored | Not stored |
|---|---|
| 36 item responses (1–5) | The three open-text answers (HS2/HS3/HS4) |
| 12 energy ratings (1–5) | The "Something else" free-text on HS1 |
| 12 domain means | Name, email, student id — none are collected anywhere |
| HS1 selections, as a binary vector | Raw IP address |
| Matched profile id, version, timestamps, duration | |
| SHA-256 of the IP, truncated to 32 chars | |
| Cloudflare's two-letter country code | |

The client never sends the free text, and there is no column for it. That is
deliberate: an open box is where a participant types something that identifies
them, and text you never collect is text you cannot leak.

The IP hash exists so you can spot one person submitting forty times without
storing an address that identifies anyone. It is a hash of a low-entropy value,
so treat it as a pseudonym rather than as anonymised.

## Set up

```bash
cd worker && npx wrangler login
```

```bash
npx wrangler d1 create haa-responses
```

Paste the printed `database_id` into `wrangler.toml`, uncomment the
`[[d1_databases]]` block, then create the table:

```bash
npx wrangler d1 execute haa-responses --remote --file=./schema.sql
```

Generate the export token and store it as a secret — encrypted at rest, never in
the repo:

```bash
openssl rand -hex 32 | npx wrangler secret put EXPORT_TOKEN
```

```bash
npx wrangler deploy
```

Then set the endpoint in `data.js` at the top of the project — note the
`/collect` suffix:

```js
const DATA_COLLECTION_ENDPOINT = "https://haa-value-prop.your-subdomain.workers.dev/collect";
```

Commit and push. **Read "What this means for participants" below before you do.**

## Getting the data out

```bash
curl -H "Authorization: Bearer YOUR_EXPORT_TOKEN" https://YOUR-WORKER.workers.dev/export.csv -o haa-responses.csv
```

One row per response, 83 columns for the current instrument: metadata, then the
36 item responses, then `energy_*`, `mean_*`, `hs1_1`–`hs1_13`, the matched
profile, and completeness. Same naming as the client-side "Download row (CSV)"
export, so rows from both paths concatenate.

Complete responses only, which is what you want for factor analysis:

```bash
curl -H "Authorization: Bearer YOUR_EXPORT_TOKEN" "https://YOUR-WORKER.workers.dev/export.csv?complete=1" -o haa-responses.csv
```

`?version=0.3-pilot` filters to one instrument version — worth using, because
pooling responses across versions where item wording changed is exactly the
mistake that makes an EFA meaningless.

Progress check:

```bash
curl -H "Authorization: Bearer YOUR_EXPORT_TOKEN" https://YOUR-WORKER.workers.dev/stats
```

Returns totals and distinct address counts per version. Ad-hoc SQL also works,
since the JSON columns are queryable:

```bash
npx wrangler d1 execute haa-responses --remote --command "SELECT COUNT(*) FROM responses WHERE complete = 1"
```

```bash
npx wrangler d1 execute haa-responses --remote --command "SELECT AVG(json_extract(items,'\$.OB1')) FROM responses"
```

Back the database up before you start analysing:

```bash
npx wrangler d1 export haa-responses --remote --output backup.sql
```

## Design notes

**Why JSON columns, not 60 flat ones.** The repo's whole layout is built so that
revising the instrument means editing `data.js` only. A column per item would
break that — every added or renamed item becomes a schema migration. The scored
payloads are stored as JSON and `/export.csv` derives its header from the data at
export time, so analysts still get the flat matrix and the instrument stays
editable in one file. `json_extract()` covers ad-hoc SQL.

**Duplicate submissions.** The client mints a UUID per attempt and keeps it in
`localStorage` beside the answers, and the insert is `INSERT OR IGNORE`. A
participant who reloads the report or steps back through Part 3 does not add a
second row. Pressing "start again" clears the id, so a genuine retake counts as a
new response.

**Rate limiting is deliberately loose** — 300 per IP per hour, against 8 for the
write-up. A cohort filling this in one room shares a campus NAT address, and a
tight per-IP cap would silently discard most of a session's data. That is the one
failure mode that would quietly ruin the dataset. It is abuse protection, not
quota enforcement; the KV counter is also non-atomic, so add a Cloudflare
rate-limiting rule if you need a guarantee.

**Nothing here can break the participant's report.** The POST is
fire-and-forget with every failure path swallowed, and uses `keepalive` so it
survives the page closing the instant the report renders. If the Worker is down,
the participant sees no error and loses nothing — but you lose that response, so
check `/stats` during a session rather than after it.

**Losing data quietly is the main risk.** The sanitizer drops keys that don't
match the expected shape instead of rejecting the request, so a renamed item id
would go missing from the export rather than erroring. `worker/test/` guards
exactly that — run `instrument.test.js` after editing `data.js`.

## Configuration

| Where | Setting | Purpose |
|---|---|---|
| `worker.js` | `COLLECT_RATE_LIMIT` | Per-IP submission cap, default 300/hour. |
| `worker.js` | `COLLECT_BODY_BYTES` | Max payload, default 8000. A full 36-item response is about 735 bytes. |
| `worker.js` | `MAX_ITEMS` | Item cap, default 120. |
| `wrangler.toml` | `[[d1_databases]]` | The `DB` binding. Omit to disable collection. |
| secret | `EXPORT_TOKEN` | Guards `/export.csv` and `/stats`. |

## Testing before you go live

Locally, against a local database, with no data leaving your machine:

```bash
cd worker && npx wrangler d1 execute haa-responses --local --file=./schema.sql && npx wrangler dev --local
```

```bash
curl -sS -X POST http://localhost:8787/collect -H "Content-Type: application/json" -H "Origin: http://localhost:8791" -d '{"submissionId":"11111111-2222-3333-4444-555555555555","version":"0.3-pilot","completedAt":"2026-01-01T00:00:00Z","durationSec":600,"items":{"OB1":4,"SA1":3},"energy":{"OB":4},"domainMeans":{"OB":4.33},"hs1":[1,0,0],"archetype":"trusted-guide","expectedItems":36}'
```

Expect `{"stored":true}`. Send it twice — the second is a no-op, and
`/stats` should still show one response. Then check the checks work:

- A request with no `Origin` header, or a different one, returns **403**.
- `/export.csv` with no token returns **401**.
- `/collect` with `{"items":{}}` returns **400**.

Run the unit tests from the repo root — see [`test/README.md`](test/README.md):

```bash
node worker/test/collect.test.js && node worker/test/instrument.test.js
```

## What this means for participants

**This is the part to get right.** The write-up is opt-in behind a button;
collection is not. It happens when the report renders, whether or not anyone
read anything.

Setting `DATA_COLLECTION_ENDPOINT` automatically rewrites the privacy bullet on
the landing page, so the "Nothing is sent anywhere" promise is never displayed
while collection is live. That rewrite is handled in `setPrivacyNote()` in
`app.js`. **If you change what gets sent, change that copy too.**

That copy is **notice, not consent**. It tells someone what is happening; it does
not ask them, and there is currently no way to decline other than closing the
tab.

Two details worth being deliberate about:

- **"Anonymous" is doing a lot of work.** The IP hash and country code are the
  only fields resembling identifiers. A truncated SHA-256 of an IP is
  *pseudonymous*, not anonymous — the input space is small enough to
  brute-force. Either describe them accurately or drop them: two lines in
  `handleCollect`, two columns in `schema.sql`. Dropping them costs the ability
  to spot one person submitting forty times, which is a real data-quality
  control in an open web sample.
- **Cloudflare is a third party**, the same way NVIDIA is for the write-up. They
  process and store the responses, and D1 data lives in the region where you
  create the database — worth choosing deliberately if data residency matters.
