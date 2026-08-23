# Worker tests

No dependencies, no test framework, no build step — same posture as the rest of
the repo. **Run from the repo root**, since both files read `worker/worker.js`
and `data.js` by relative path.

With node:

```bash
node worker/test/collect.test.js && node worker/test/instrument.test.js
```

With nothing installed, using the JavaScriptCore that ships with macOS:

```bash
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc worker/test/collect.test.js
```

Both exit non-zero on failure, so they chain with `&&` and work in CI.

| File | Covers |
|---|---|
| `collect.test.js` | `sanitizeSubmission` against valid, malformed and hostile payloads; `toCsv` column derivation, quoting, ragged rows and the empty database; `constantTimeEqual`. |
| `instrument.test.js` | The real instrument from `data.js` end to end — that every one of the 36 item ids and 12 domain keys survives sanitization, and that the exported matrix has the expected width. |

`instrument.test.js` is the one that matters after content edits. The sanitizer
whitelists keys by pattern (`/^[A-Z]{1,3}\d{1,2}$/` for items), so an item id in
a new shape — lowercase, a longer prefix, a two-digit suffix beyond 99 — would be
**silently dropped** rather than rejected loudly, and the column would simply go
missing from the export. Run this after any change to `ITEMS`, `DOMAIN_ORDER` or
`HS1_OPTIONS`.

The Worker is an ES module. Both files read it as text and strip the
`export default` handler so the internal functions can be reached without adding
an export surface that only tests would use.

## Not covered

These are unit tests over pure functions. The routing, D1 binding, KV rate
limiting and bearer-token check need a real Worker:

```bash
cd worker && npx wrangler dev --local
```

then exercise the endpoints with the `curl` commands in `../README.md`.
