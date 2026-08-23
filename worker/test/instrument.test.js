/* End-to-end shape check: build the exact payload maybePost() sends, using the
 * real instrument content from data.js, and push it through the Worker's
 * sanitizer. Catches the failure that unit tests with invented ids cannot —
 * a key regex that silently drops real responses.
 *
 * Run this after any edit to ITEMS, DOMAIN_ORDER or HS1_OPTIONS in data.js.
 * Run from the repo root; see worker/test/README.md. */

/* Portable shims so this runs under node and jsc alike. */
var readFile = typeof readFile === "function" ? readFile
  : function (p) { return require("fs").readFileSync(p, "utf8"); };
var print = typeof print === "function" ? print : console.log;

var mod = (function () {
  var src = readFile("worker/worker.js").replace("export default {", "var HANDLER = {");
  var prelude = "var crypto = { randomUUID: function(){ return 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'; } };" +
    "function TextEncoder(){ this.encode = function(s){ var a=[]; for(var i=0;i<s.length;i++) a.push(s.charCodeAt(i)&255); return a; }; }";
  return new Function(prelude + src + ";return { sanitizeSubmission: sanitizeSubmission, toCsv: toCsv };")();
})();

// data.js is pure content, no DOM — it evals standalone.
var content = new Function(readFile("data.js") +
  ";return { HAA_VERSION: HAA_VERSION, ITEMS: ITEMS, DOMAIN_ORDER: DOMAIN_ORDER, " +
  "HS1_OPTIONS: HS1_OPTIONS, ARCHETYPES: ARCHETYPES, DOMAINS: DOMAINS };")();

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; print("  ok   " + name); }
  else { fail++; print("  FAIL " + name + (extra ? "  -> " + extra : "")); }
}

print("\ninstrument: " + content.ITEMS.length + " items, " +
  content.DOMAIN_ORDER.length + " domains, " + content.HS1_OPTIONS.length + " HS1 options");

// Build the payload exactly as app.js maybePost() does, for a participant who
// answered every item.
var items = {}, energy = {}, domainMeans = {};
content.ITEMS.forEach(function (it, i) { items[it.id] = (i % 5) + 1; });
content.DOMAIN_ORDER.forEach(function (k, i) {
  energy[k] = (i % 5) + 1;
  domainMeans[k] = Math.round(((i % 4) + 1.333333) * 100) / 100;
});

var payload = {
  submissionId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  version: content.HAA_VERSION,
  completedAt: new Date().toISOString(),
  durationSec: 812,
  items: items,
  energy: energy,
  domainMeans: domainMeans,
  hs1: content.HS1_OPTIONS.map(function (o, i) { return i % 4 === 0 ? 1 : 0; }),
  archetype: content.ARCHETYPES[0].id,
  expectedItems: content.ITEMS.length
};

var s = mod.sanitizeSubmission(payload);

print("\n== every real key survives sanitization ==");
var lostItems = content.ITEMS.filter(function (it) { return !(it.id in s.items); }).map(function (it) { return it.id; });
ok("all " + content.ITEMS.length + " item ids accepted", lostItems.length === 0, lostItems.join(","));

var lostDomains = content.DOMAIN_ORDER.filter(function (k) { return !(k in s.energy); });
ok("all " + content.DOMAIN_ORDER.length + " domain keys accepted (energy)", lostDomains.length === 0, lostDomains.join(","));

var lostMeans = content.DOMAIN_ORDER.filter(function (k) { return !(k in s.domainMeans); });
ok("all domain keys accepted (means)", lostMeans.length === 0, lostMeans.join(","));

ok("hs1 width matches HS1_OPTIONS", s.hs1.length === content.HS1_OPTIONS.length,
  s.hs1.length + " vs " + content.HS1_OPTIONS.length);
ok("full response marked complete", s.complete === 1);
ok("n_items equals ITEMS.length", s.nItems === content.ITEMS.length, s.nItems);
ok("version fits in 24 chars", s.version === content.HAA_VERSION, s.version);
ok("archetype id fits in 40 chars", s.archetype === content.ARCHETYPES[0].id, s.archetype);

print("\n== all archetype ids fit the column ==");
var longIds = content.ARCHETYPES.filter(function (a) { return String(a.id).length > 40; }).map(function (a) { return a.id; });
ok("no archetype id truncated", longIds.length === 0, longIds.join(","));

print("\n== payload size against COLLECT_BODY_BYTES (8000) ==");
var bytes = JSON.stringify(payload).length;
ok("payload " + bytes + " bytes is under the 8000 limit", bytes < 8000, bytes);
ok("payload has comfortable headroom (<50%)", bytes < 4000, bytes + " bytes");

print("\n== round trip to CSV ==");
var row = {
  submission_id: s.submissionId, version: s.version, completed_at: s.completedAt,
  received_at: new Date().toISOString(), duration_sec: s.durationSec, country: "US",
  items: JSON.stringify(s.items), energy: JSON.stringify(s.energy),
  domain_means: JSON.stringify(s.domainMeans), hs1: JSON.stringify(s.hs1),
  archetype: s.archetype, n_items: s.nItems, complete: s.complete, ip_hash: "deadbeef"
};
var lines = mod.toCsv([row]).replace(/\r\n$/, "").split("\r\n");
var head = lines[0].split(",");
var body = lines[1].split(",");

// 6 metadata + 36 items + 12 energy + 12 means + 13 hs1 + 4 trailing
var expectedCols = 6 + content.ITEMS.length + (content.DOMAIN_ORDER.length * 2) +
  content.HS1_OPTIONS.length + 4;
ok("column count = " + expectedCols, head.length === expectedCols, head.length);
ok("row width matches header", body.length === head.length, body.length + " vs " + head.length);
ok("no empty item cells in a complete response",
  body.slice(6, 6 + content.ITEMS.length).every(function (c) { return c !== '""'; }));
ok("energy_ columns sit where expected, one per domain",
  head.slice(6 + content.ITEMS.length, 6 + content.ITEMS.length + content.DOMAIN_ORDER.length)
    .every(function (c) { return c.indexOf('"energy_') === 0; }));
ok("mean_ columns follow them, one per domain",
  head.slice(6 + content.ITEMS.length + content.DOMAIN_ORDER.length,
    6 + content.ITEMS.length + (content.DOMAIN_ORDER.length * 2))
    .every(function (c) { return c.indexOf('"mean_') === 0; }));

print("\nheader: " + lines[0].slice(0, 220) + " ...");

print("\n" + pass + " passed, " + fail + " failed");
if (fail) throw new Error(fail + " test(s) failed");
