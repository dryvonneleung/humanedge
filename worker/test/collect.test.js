/* Unit tests for the collection endpoint's sanitizer and CSV export.
 *
 * Run from the repo root. See worker/test/README.md — works under node or, with
 * nothing installed at all, macOS's built-in JavaScriptCore.
 *
 * The Worker is an ES module, so the `export default` handler is stripped and
 * the rest evaluated as a plain script to reach the internal functions. */

/* Portable shims so this runs under node and jsc alike. */
var readFile = typeof readFile === "function" ? readFile
  : function (p) { return require("fs").readFileSync(p, "utf8"); };
var print = typeof print === "function" ? print : console.log;

var src = readFile("worker/worker.js").replace("export default {", "var HANDLER = {");

// Minimal shims for globals the pure functions touch.
var prelude = "var crypto = { randomUUID: function(){ return 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'; } };" +
  "function TextEncoder(){ this.encode = function(s){ var a=[]; for(var i=0;i<s.length;i++) a.push(s.charCodeAt(i)&255); return a; }; }";

var mod = new Function(prelude + src + ";return { sanitizeSubmission: sanitizeSubmission, toCsv: toCsv, sortIds: sortIds, constantTimeEqual: constantTimeEqual };")();

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; print("  ok   " + name); }
  else { fail++; print("  FAIL " + name + (extra ? "  -> " + extra : "")); }
}

print("\n== sanitizeSubmission: valid payload ==");
var good = {
  submissionId: "3F2A1B4C-5D6E-7F80-9A1B-2C3D4E5F6071",
  version: "0.2-pilot",
  completedAt: "2026-08-23T10:00:00.000Z",
  durationSec: 640.7,
  items: { OB1: 4, OB2: 5, SA1: 3, J2: 1, PP3: 5 },
  energy: { OB: 4, SA: 2, PP: 5 },
  domainMeans: { OB: 4.333333, SA: 2.5 },
  hs1: [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  archetype: "integrative-strategist",
  expectedItems: 5
};
var s = mod.sanitizeSubmission(good);
ok("uuid lowercased and kept", s.submissionId === "3f2a1b4c-5d6e-7f80-9a1b-2c3d4e5f6071", s.submissionId);
ok("duration rounded to int", s.durationSec === 641, s.durationSec);
ok("all 5 items kept", Object.keys(s.items).length === 5);
ok("marked complete", s.complete === 1);
ok("n_items correct", s.nItems === 5);
ok("domain mean rounded to 2dp", s.domainMeans.OB === 4.33, s.domainMeans.OB);
ok("hs1 vector length preserved", s.hs1.length === 13, s.hs1.length);
ok("hs1 values are 0/1", s.hs1[0] === 1 && s.hs1[1] === 0 && s.hs1[12] === 1);
ok("archetype kept", s.archetype === "integrative-strategist");

print("\n== sanitizeSubmission: hostile / malformed input ==");
var bad = mod.sanitizeSubmission({
  submissionId: "'; DROP TABLE responses; --",
  version: "x".repeat(500),
  completedAt: "not a date",
  durationSec: -99999,
  items: { OB1: 9, OB2: 0, "__proto__": 3, "DROP TABLE": 4, SA1: "3", ZZ99: 2.6 },
  energy: { OB: 7, "bad key": 3, SA: 1 },
  domainMeans: { OB: 999, SA: "abc" },
  hs1: ["yes", 0, 1, null, {}],
  archetype: "y".repeat(500),
  expectedItems: 36
});
ok("bad uuid replaced, no SQL text", bad.submissionId.indexOf("DROP") === -1, bad.submissionId);
ok("version truncated to 24", bad.version.length === 24, bad.version.length);
ok("unparseable date replaced", !isNaN(Date.parse(bad.completedAt)), bad.completedAt);
ok("negative duration nulled", bad.durationSec === null, bad.durationSec);
ok("out-of-range likert 9 dropped", !("OB1" in bad.items));
ok("out-of-range likert 0 dropped", !("OB2" in bad.items));
ok("__proto__ key rejected", !Object.prototype.hasOwnProperty.call(bad.items, "__proto__"));
ok("key with space rejected", !("DROP TABLE" in bad.items));
ok("numeric string coerced", bad.items.SA1 === 3, bad.items.SA1);
ok("2.6 rounds to 3", bad.items.ZZ99 === 3, bad.items.ZZ99);
ok("energy 7 dropped", !("OB" in bad.energy));
ok("energy 1 kept", bad.energy.SA === 1);
ok("mean 999 clamped to 5", bad.domainMeans.OB === 5, bad.domainMeans.OB);
ok("non-numeric mean dropped", !("SA" in bad.domainMeans));
// Junk coerces to 0 ("not selected") rather than 1 — a garbled cell must not
// invent a selection the participant never made.
ok("hs1 junk coerced to 0", bad.hs1.join(",") === "0,0,1,0,0", bad.hs1.join(","));
ok("hs1 truthy non-numerics still work",
  mod.sanitizeSubmission({ items: { OB1: 3 }, hs1: [true, "1", 1, false, "0"] }).hs1.join(",") === "1,1,1,0,0",
  mod.sanitizeSubmission({ items: { OB1: 3 }, hs1: [true, "1", 1, false, "0"] }).hs1.join(","));
ok("archetype truncated to 40", bad.archetype.length === 40, bad.archetype.length);
ok("incomplete flagged (5 of 36)", bad.complete === 0);

print("\n== sanitizeSubmission: rejections ==");
function throws(fn) { try { fn(); return false; } catch (e) { return true; } }
ok("null body rejected", throws(function () { return mod.sanitizeSubmission(null); }));
ok("no items rejected", throws(function () { return mod.sanitizeSubmission({ items: {} }); }));
ok("items as array rejected", throws(function () { return mod.sanitizeSubmission({ items: [1, 2, 3] }); }));

print("\n== sortIds ==");
ok("numeric suffix sorts numerically",
  mod.sortIds(["OB10", "OB2", "OB1", "SA1", "E3"]).join(",") === "E3,OB1,OB2,OB10,SA1",
  mod.sortIds(["OB10", "OB2", "OB1", "SA1", "E3"]).join(","));

print("\n== toCsv: ragged rows (instrument revised between responses) ==");
var rows = [
  {
    submission_id: "id-1", version: "0.2-pilot", completed_at: "2026-08-23T10:00:00Z",
    received_at: "2026-08-23T10:00:01Z", duration_sec: 641, country: "US",
    items: JSON.stringify({ OB1: 4, SA1: 3 }), energy: JSON.stringify({ OB: 4 }),
    domain_means: JSON.stringify({ OB: 4.33 }), hs1: JSON.stringify([1, 0, 1]),
    archetype: "creative-maker", n_items: 2, complete: 1, ip_hash: "abc123"
  },
  {
    // Second response has an item the first lacks, and a shorter hs1 vector.
    submission_id: "id-2", version: "0.3-pilot", completed_at: "2026-08-24T10:00:00Z",
    received_at: "2026-08-24T10:00:01Z", duration_sec: null, country: null,
    items: JSON.stringify({ OB1: 5, NEW1: 2 }), energy: JSON.stringify({ OB: 2, SA: 5 }),
    domain_means: JSON.stringify({ OB: 5 }), hs1: JSON.stringify([0, 1]),
    archetype: null, n_items: 2, complete: 0, ip_hash: null
  }
];
var csv = mod.toCsv(rows);
var lines = csv.replace(/\r\n$/, "").split("\r\n");
print(lines[0]);
print(lines[1]);
print(lines[2]);
ok("three lines (header + 2)", lines.length === 3, lines.length);
ok("union of item columns present",
  lines[0].indexOf('"NEW1"') !== -1 && lines[0].indexOf('"OB1"') !== -1 && lines[0].indexOf('"SA1"') !== -1);
ok("energy columns prefixed", lines[0].indexOf('"energy_SA"') !== -1);
ok("mean columns prefixed", lines[0].indexOf('"mean_OB"') !== -1);
ok("hs1 sized to widest vector",
  lines[0].indexOf('"hs1_3"') !== -1 && lines[0].indexOf('"hs1_4"') === -1);
ok("missing cell is empty, not undefined", lines[2].indexOf("undefined") === -1, lines[2]);
ok("null becomes empty string", lines[2].indexOf('"null"') === -1);
ok("header and rows have equal width",
  lines[0].split(",").length === lines[1].split(",").length &&
  lines[1].split(",").length === lines[2].split(",").length,
  lines[0].split(",").length + " / " + lines[1].split(",").length + " / " + lines[2].split(",").length);
ok("CRLF line endings", csv.indexOf("\r\n") !== -1);
ok("trailing newline", /\r\n$/.test(csv));

print("\n== toCsv: quoting ==");
var quoted = mod.toCsv([{
  submission_id: 'we"ird,id', version: "v", completed_at: "", received_at: "", duration_sec: 0,
  country: "", items: "{}", energy: "{}", domain_means: "{}", hs1: "[]",
  archetype: "a,b", n_items: 0, complete: 0, ip_hash: ""
}]);
ok("embedded quote doubled", quoted.indexOf('"we""ird,id"') !== -1, quoted.split("\r\n")[1]);

print("\n== toCsv: empty database ==");
var empty = mod.toCsv([]);
ok("header only, no crash", empty.split("\r\n")[0].indexOf('"submission_id"') === 0, JSON.stringify(empty));

print("\n== constantTimeEqual ==");
ok("equal strings match", mod.constantTimeEqual("s3cret", "s3cret"));
ok("different strings differ", !mod.constantTimeEqual("s3cret", "s3crea"));
ok("different lengths differ", !mod.constantTimeEqual("s3cret", "s3cretx"));
ok("empty vs value differ", !mod.constantTimeEqual("", "s3cret"));

print("\n" + pass + " passed, " + fail + " failed");
if (fail) throw new Error(fail + " test(s) failed");
