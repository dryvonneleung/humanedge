-- Human Advantage Assessment — response collection schema (Cloudflare D1)
--
-- Apply with:
--   npx wrangler d1 execute haa-responses --remote --file=./schema.sql
--
-- Design note: the scored payloads are stored as JSON rather than as 60-odd
-- flat columns. The whole point of the repo's layout is that revising the
-- instrument means editing data.js only — a schema with one column per item
-- would break that, since every added or renamed item would need a migration.
-- The /export.csv endpoint derives its wide-format header from the data at
-- export time, so analysts still get the flat matrix that factor analysis
-- wants, and SQLite's json_extract() is available for ad-hoc queries.

CREATE TABLE IF NOT EXISTS responses (
  -- Client-generated UUID. Primary key so a resubmitted report (participant
  -- reloads, presses through Part 3 again) is an INSERT OR IGNORE no-op
  -- rather than a duplicate row in the analysis matrix.
  submission_id  TEXT PRIMARY KEY,

  version        TEXT NOT NULL,          -- HAA_VERSION, e.g. "0.2-pilot"
  completed_at   TEXT NOT NULL,          -- ISO 8601, from the client clock
  received_at    TEXT NOT NULL,          -- ISO 8601, from the Worker clock
  duration_sec   INTEGER,                -- start of Part 1 to report, NULL if unknown

  items          TEXT NOT NULL,          -- JSON {"OB1": 4, ...} 1-5
  energy         TEXT NOT NULL,          -- JSON {"OB": 3, ...} 1-5
  domain_means   TEXT NOT NULL,          -- JSON {"OB": 3.67, ...} 1-5, 2dp
  -- JSON binary vector, one element per HS1 option: [0,1,0,0,1,...]. Stored as
  -- a vector rather than a list of chosen indices so the array's own length
  -- records how many options the instrument offered, which is what lets
  -- /export.csv size the hs1_* columns without knowing anything about data.js.
  hs1            TEXT NOT NULL,
  archetype      TEXT,                   -- matched profile id

  n_items        INTEGER NOT NULL,       -- answered item count, for completeness filtering
  complete       INTEGER NOT NULL,       -- 1 when every expected item was answered

  -- SHA-256 of the IP, truncated. Lets you spot one person filling the form
  -- thirty times without storing an address that identifies anyone.
  ip_hash        TEXT,
  country        TEXT                    -- Cloudflare cf.country, coarse geography only
);

CREATE INDEX IF NOT EXISTS idx_responses_received  ON responses (received_at);
CREATE INDEX IF NOT EXISTS idx_responses_version   ON responses (version);
CREATE INDEX IF NOT EXISTS idx_responses_complete  ON responses (complete);
CREATE INDEX IF NOT EXISTS idx_responses_ip_hash   ON responses (ip_hash);
