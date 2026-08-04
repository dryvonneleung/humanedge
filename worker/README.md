# Strengths write-up generator — Cloudflare Worker

Proxies the assessment's "Write up my strengths" button to NVIDIA NIM so
the API key stays server-side. Free tier covers this comfortably.

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

If this is research with identifiable Northeastern participants, sending free
text to a third-party API is exactly the kind of detail an IRB will want
described.
