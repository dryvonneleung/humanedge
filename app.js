/* Human Advantage Assessment — app logic
 * Vanilla JS, no build step. Opens from the filesystem.
 */

(function () {
  "use strict";

  const STORE_KEY = "haa-response-" + HAA_VERSION;
  const ITEMS_PER_PAGE = 6;
  const TOTAL_QUESTIONS = ITEMS.length + DOMAIN_ORDER.length; // 36 + 12

  /* Chart labels. Shorter than the full domain names, which do not fit on a
   * 12-axis radar. */
  const SHORT_NAME = {
    OB: "Observation", SA: "Signal Awareness", HU: "Human Understanding",
    SM: "Sense-Making", IN: "Integration", J: "Judgment",
    IV: "Innovation", E: "Expression", C: "Craftsmanship",
    M: "Mobilization", AD: "Adaptability", PP: "Performance"
  };

  const state = {
    startedAt: null,
    answers: {},        // itemId -> 1..5
    energy: {},         // domainKey -> 1..5
    hs1: [],
    hs1Other: "",
    open: { HS2: "", HS3: "", HS4: "" },
    itemPage: 0
  };

  const pages = chunk(ITEMS, ITEMS_PER_PAGE);

  /* ---------------- helpers ---------------- */
  function chunk(arr, n) {
    const out = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  }
  function $(sel) { return document.querySelector(sel); }
  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }
  function mean(a) { return a.reduce((x, y) => x + y, 0) / a.length; }
  /* n choose k — how many distinct signature combinations the framework allows */
  function comboCount(n, k) {
    let r = 1;
    for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
    return Math.round(r);
  }
  function pct(m) { return Math.round(((m - 1) / 4) * 1000) / 10; } // 1..5 -> 0..100
  function catColor(cat) { return "var(--" + cat + ")"; }
  function catColorHex(cat) {
    return { notice: "#3d6b9c", understand: "#6b4c8a", create: "#b4693a", act: "#2f7a5e" }[cat];
  }
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ---------------- persistence ---------------- */
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || typeof d !== "object") return null;
      return d;
    } catch (e) { return null; }
  }
  function clearSaved() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
  }

  /* ---------------- navigation ---------------- */
  function show(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    $("#screen-" + id).classList.add("active");
    $("#topbar").hidden = (id === "intro");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    updateProgress();
  }

  function answeredCount() {
    return Object.keys(state.answers).length + Object.keys(state.energy).length;
  }
  function updateProgress() {
    const done = answeredCount();
    const p = Math.round((done / TOTAL_QUESTIONS) * 100);
    $("#progressFill").style.width = Math.min(100, p) + "%";
    $("#progressLabel").textContent = done + " / " + TOTAL_QUESTIONS;
  }

  /* ---------------- landing: domain map ---------------- */
  function renderDomainMap() {
    const host = $("#domainMap");
    Object.keys(PILLARS).forEach(catKey => {
      const cat = PILLARS[catKey];
      const block = el("div", "cat-block");
      block.innerHTML =
        '<div class="cat-head">' +
          '<span class="dot" style="background:' + catColor(catKey) + '"></span>' +
          '<span class="cat-name" style="color:' + catColor(catKey) + '">' + esc(cat.label) + '</span>' +
          '<span class="cat-blurb">' + esc(cat.blurb) + '</span>' +
        '</div>';
      const grid = el("div", "domain-grid");
      DOMAIN_ORDER.filter(k => DOMAINS[k].pillar === catKey).forEach(k => {
        const d = DOMAINS[k];
        grid.appendChild(el("div", "dcard",
          "<b>" + esc(d.name) + "</b><small>" + esc(d.short) + "</small>"));
      });
      block.appendChild(grid);
      host.appendChild(block);
    });
  }

  /* ---------------- Part 1: items ---------------- */
  function renderItemPage() {
    const host = $("#itemsHost");
    host.innerHTML = "";
    const page = pages[state.itemPage];
    const offset = state.itemPage * ITEMS_PER_PAGE;

    $("#itemsIntro").hidden = state.itemPage !== 0;

    page.forEach((item, i) => {
      const n = offset + i + 1;
      const card = el("div", "item");
      card.dataset.item = item.id;
      if (state.answers[item.id]) card.classList.add("answered");
      card.innerHTML =
        '<div class="item-num">Statement ' + n + ' of ' + ITEMS.length + '</div>' +
        '<div class="item-text">' + esc(item.text) + '</div>';
      card.appendChild(buildScale(item.id, AGREE_SCALE, state.answers[item.id], v => {
        state.answers[item.id] = v;
        card.classList.add("answered");
        card.classList.remove("missing");
        save();
        updateProgress();
        advanceFrom(card);
      }));
      host.appendChild(card);
    });

    $("#itemsBack").textContent = state.itemPage === 0 ? "Back to start" : "Back";
    $("#itemsNext").textContent =
      state.itemPage === pages.length - 1 ? "Continue to Part 2" : "Continue";
    $("#itemsValidation").hidden = true;
  }

  function buildScale(name, scale, current, onPick) {
    const wrap = el("div", "scale");
    scale.forEach(s => {
      const opt = el("div", "opt");
      const id = "r-" + name + "-" + s.v;
      const input = el("input");
      input.type = "radio";
      input.name = name;
      input.id = id;
      input.value = s.v;
      if (current === s.v) input.checked = true;
      input.addEventListener("change", () => onPick(s.v));
      const label = el("label");
      label.setAttribute("for", id);
      label.innerHTML = '<span class="num">' + s.v + '</span><span class="txt">' + esc(s.shortLabel) + '</span>';
      opt.appendChild(input);
      opt.appendChild(label);
      wrap.appendChild(opt);
    });
    return wrap;
  }

  /* Scroll to the next unanswered card on this page, if any. */
  function advanceFrom(card) {
    const cards = Array.from(card.parentNode.children);
    const idx = cards.indexOf(card);
    for (let i = idx + 1; i < cards.length; i++) {
      if (!cards[i].classList.contains("answered")) {
        const top = cards[i].getBoundingClientRect().top + window.scrollY - 110;
        window.scrollTo({ top: top, behavior: "smooth" });
        return;
      }
    }
  }

  function itemPageComplete() {
    return pages[state.itemPage].filter(it => !state.answers[it.id]);
  }

  /* ---------------- Part 2: energy ---------------- */
  function renderEnergy() {
    const host = $("#energyHost");
    host.innerHTML = "";
    DOMAIN_ORDER.forEach((k, i) => {
      const d = DOMAINS[k];
      const card = el("div", "item");
      card.dataset.item = "E_" + k;
      if (state.energy[k]) card.classList.add("answered");
      card.innerHTML =
        '<div class="item-num" style="color:' + catColor(d.pillar) + '">' +
          esc(PILLARS[d.pillar].label) + ' · ' + (i + 1) + ' of ' + DOMAIN_ORDER.length + '</div>' +
        '<div class="item-text">' + esc(ENERGY_PROMPTS[k]) + '</div>' +
        '<div class="item-sub">How does doing this normally leave you feeling?</div>';
      card.appendChild(buildScale("energy-" + k, ENERGY_SCALE, state.energy[k], v => {
        state.energy[k] = v;
        card.classList.add("answered");
        card.classList.remove("missing");
        save();
        updateProgress();
        advanceFrom(card);
      }));
      host.appendChild(card);
    });
    $("#energyValidation").hidden = true;
  }

  /* ---------------- Part 3: reflection ---------------- */
  function renderReflect() {
    const host = $("#hs1Host");
    host.innerHTML = "";
    HS1_OPTIONS.forEach((opt, i) => {
      const id = "hs1-" + i;
      const wrap = el("div", "chk");
      const input = el("input");
      input.type = "checkbox";
      input.id = id;
      input.value = opt;
      input.checked = state.hs1.indexOf(opt) !== -1;
      input.addEventListener("change", () => {
        if (input.checked) {
          if (state.hs1.length >= 3) { input.checked = false; toast("Choose up to three."); return; }
          state.hs1.push(opt);
        } else {
          state.hs1 = state.hs1.filter(x => x !== opt);
        }
        save();
        syncHs1();
      });
      const label = el("label");
      label.setAttribute("for", id);
      label.innerHTML = '<span class="box"></span><span>' + esc(opt) + '</span>';
      wrap.appendChild(input);
      wrap.appendChild(label);
      host.appendChild(wrap);
    });
    syncHs1();

    const openHost = $("#openHost");
    openHost.innerHTML = "";
    OPEN_ITEMS.forEach(o => {
      const card = el("div", "item");
      card.innerHTML =
        '<div class="item-num">' + o.id + ' <span class="optional">· optional</span></div>' +
        '<div class="item-text">' + esc(o.label) + '</div>' +
        '<div class="hint">' + esc(o.hint) + '</div>';
      const ta = el("textarea");
      ta.id = "ta-" + o.id;
      ta.value = state.open[o.id] || "";
      ta.setAttribute("aria-label", o.label);
      ta.addEventListener("input", () => { state.open[o.id] = ta.value; save(); });
      card.appendChild(ta);
      openHost.appendChild(card);
    });

    const other = $("#hs1Other");
    other.value = state.hs1Other || "";
    other.addEventListener("input", () => { state.hs1Other = other.value; save(); });
  }

  function syncHs1() {
    $("#hs1Count").textContent = state.hs1.length + " of 3 selected";
    const hasOther = state.hs1.indexOf("Something else") !== -1;
    $("#hs1OtherWrap").hidden = !hasOther;
    const atMax = state.hs1.length >= 3;
    document.querySelectorAll("#hs1Host input").forEach(inp => {
      inp.disabled = atMax && !inp.checked;
    });
  }

  /* ---------------- scoring ---------------- */
  function computeScores() {
    const domains = DOMAIN_ORDER.map(k => {
      const items = ITEMS.filter(it => it.d === k);
      const vals = items.map(it => state.answers[it.id]).filter(v => typeof v === "number");
      const m = vals.length ? mean(vals) : 1;
      return {
        key: k,
        name: DOMAINS[k].name,
        pillar: DOMAINS[k].pillar,
        mean: m,
        pct: pct(m),
        energy: state.energy[k] || 3,
        energyPct: pct(state.energy[k] || 3),
        items: items.map(it => ({ id: it.id, v: state.answers[it.id] || null }))
      };
    });

    const avgPct = mean(domains.map(d => d.pct));
    const avgEnergy = mean(domains.map(d => d.energy));
    domains.forEach(d => {
      d.relative = Math.round((d.pct - avgPct) * 10) / 10;    // within-person centred
      d.energyRelative = Math.round((d.energy - avgEnergy) * 100) / 100;
      d.highStrength = d.pct >= avgPct;
      d.highEnergy = d.energy >= avgEnergy;
    });

    // Rank: strength first, energy as tie-break, then fixed domain order.
    const ranked = domains.slice().sort((a, b) => {
      if (b.pct !== a.pct) return b.pct - a.pct;
      if (b.energy !== a.energy) return b.energy - a.energy;
      return DOMAIN_ORDER.indexOf(a.key) - DOMAIN_ORDER.indexOf(b.key);
    });

    // Top 3 lead the report; the remaining 9 split into supporting and quieter.
    const signature = ranked.slice(0, 3);
    const supporting = ranked.slice(3, 9);
    const quieter = ranked.slice(9);

    // spread tells us how differentiated the profile is
    const spread = ranked[0].pct - ranked[ranked.length - 1].pct;
    const energyRange = Math.max.apply(null, domains.map(d => d.energy)) -
                        Math.min.apply(null, domains.map(d => d.energy));
    // With no variance the top three are decided by tie-break, not by the
    // respondent. Say so rather than presenting an arbitrary ordering as a result.
    const boundaryTie = ranked[2].pct === ranked[3].pct;
    const tiedAtBoundary = boundaryTie
      ? ranked.filter(d => d.pct === ranked[2].pct).map(d => d.name)
      : [];

    const archetypes = ARCHETYPES.map(a => {
      const base = mean(a.domains.map(k => domains.find(d => d.key === k).pct));
      const sigKeys = signature.map(d => d.key);
      const overlap = a.domains.filter(k => sigKeys.indexOf(k) !== -1).length;
      return { ...a, base: base, overlap: overlap, fit: base + overlap * 5 };
    }).sort((x, y) => (y.fit - x.fit) || (y.overlap - x.overlap));

    return {
      domains, ranked, signature, supporting, quieter,
      avgPct, avgEnergy, spread, energyRange, boundaryTie, tiedAtBoundary, archetypes,
      byKey: k => domains.find(d => d.key === k)
    };
  }

  /* ---------------- results rendering ---------------- */
  function renderResults() {
    const s = computeScores();
    const host = $("#resultsHost");
    const top = s.archetypes[0];
    const runners = s.archetypes.slice(1, 3);

    const comboLine = s.signature
      .map(d => DOMAINS[d.key].valueLine)
      .reduce((acc, cur, i, arr) =>
        i === 0 ? cur : (i === arr.length - 1 ? acc + ", and " + cur : acc + ", " + cur), "");

    let html = "";

    /* hero */
    html +=
      '<div class="result-hero">' +
        '<div class="eyebrow">Your closest profile</div>' +
        '<h1>' + esc(top.name) + '</h1>' +
        '<p class="tagline">' + esc(top.tagline) + '</p>' +
        '<p class="body">' + esc(top.body) + '</p>' +
        '<div class="combo-chips">' +
          s.signature.map(d => '<span class="chip">' + esc(d.name) + '</span>').join("") +
        '</div>' +
      '</div>';

    /* the combination */
    html +=
      '<div class="rsection">' +
        '<h2>Your combination</h2>' +
        '<p class="lede">You create value because ' + esc(comboLine) + '.</p>' +
        '<p>Individually, each of those is common. The combination is where your edge actually lives: there are ' +
        comboCount(DOMAIN_ORDER.length, 3) + ' possible three-domain signatures in this framework, and ' +
        '<strong>' + esc(s.signature.map(d => d.name).join(" + ")) + '</strong> is yours. ' +
        'Most people are hired for one of their three and then valued for the overlap.</p>' +
        profileShapeNote(s) +
      '</div>';

    /* radar */
    html +=
      '<div class="rsection">' +
        '<h2>Full profile</h2>' +
        '<p class="rsection-note">Filled shape is capability. The dotted line is how energising you find each one.</p>' +
        '<div class="viz">' + radarSvg(s) + '</div>' +
      '</div>';

    /* signature strengths */
    html += '<div class="rsection"><h2>Signature strengths</h2>' +
      '<p class="rsection-note">Your top three. These are where you should be spending most of your working time.</p>';
    s.signature.forEach((d, i) => { html += strengthCard(d, i + 1, true); });
    html += '</div>';

    /* supporting */
    html += '<div class="rsection"><h2>Supporting strengths</h2>' +
      '<p class="rsection-note">Real capability that shows up in service of your signature strengths rather than leading on its own.</p>' +
      '<div class="compact-list">';
    s.supporting.forEach((d, i) => {
      html +=
        '<div class="compact-row">' +
          '<span class="dot" style="background:' + catColor(d.pillar) + '"></span>' +
          '<span class="nm">' + esc(d.name) + '</span>' +
          '<span class="ds">' + esc(DOMAINS[d.key].short) + '</span>' +
          energyTag(d) +
        '</div>';
    });
    html += '</div></div>';

    /* quieter domains */
    html += '<div class="rsection"><h2>Quieter domains</h2>' +
      '<p class="rsection-note">Not weaknesses. These are the ways you <em>don\'t</em> primarily create value — which is what makes the rest of your profile distinctive.</p>';
    s.quieter.forEach(d => {
      html +=
        '<div class="strength-card">' +
          '<div class="sc-head">' +
            '<span class="dot" style="background:' + catColor(d.pillar) + '"></span>' +
            '<span class="sc-name">' + esc(d.name) + '</span>' +
            energyTag(d) +
          '</div>' +
          '<p class="sc-body">' + esc(DOMAINS[d.key].lowRead) + '</p>' +
          meter(d) +
          '<div class="ai-note"><div><b>If you want to build it:</b> ' + esc(DOMAINS[d.key].growWith) + '</div></div>' +
        '</div>';
    });
    html += '</div>';

    /* strength x energy */
    html +=
      '<div class="rsection">' +
        '<h2>Strength × energy</h2>' +
        '<p class="rsection-note">The most useful screen in the report. Both lines sit at your own averages, so this compares your twelve domains against each other, not against other people.</p>' +
        '<div class="viz">' + scatterSvg(s) + '</div>' +
        quadrants(s) +
        '<div class="reflect-card" style="margin-top:18px">' +
          '<div class="q">The third factor: opportunity</div>' +
          '<div class="a">Strength × Energy × Opportunity is the full equation, and this assessment only measures ' +
          'the first two. Opportunity is where your combination is actually needed and valued, and it depends on your ' +
          'field, your organisation and your timing rather than on anything you could answer in a questionnaire. ' +
          'Take your core edge above and ask where it is currently scarce. That question is the one worth sitting with.</div>' +
        '</div>' +
      '</div>';

    /* AI interpretation */
    html +=
      '<div class="rsection">' +
        '<h2>Where AI fits</h2>' +
        '<p class="rsection-note">AI is not a tenth domain. It changes the cost of certain parts of each domain, and leaves other parts entirely alone. For your top three:</p>';
    s.signature.forEach(d => {
      html +=
        '<div class="strength-card">' +
          '<div class="sc-head">' +
            '<span class="dot" style="background:' + catColor(d.pillar) + '"></span>' +
            '<span class="sc-name">' + esc(d.name) + '</span>' +
          '</div>' +
          '<div class="ai-note" style="border-top:0;padding-top:4px;margin-top:6px">' +
            '<div><b>Where AI amplifies you:</b> ' + esc(DOMAINS[d.key].aiWith) + '</div>' +
            '<div><b>Where it doesn\'t reach:</b> ' + esc(DOMAINS[d.key].aiEdge) + '</div>' +
          '</div>' +
        '</div>';
    });
    if ((state.open.HS4 || "").trim()) {
      html +=
        '<div class="reflect-card">' +
          '<div class="q">In your own words — what you do that AI does not</div>' +
          '<div class="a">' + esc(state.open.HS4.trim()) + '</div>' +
        '</div>' +
        '<p class="rsection-note" style="margin-top:12px">Keep that sentence. It is the most portable thing in this report, and it is the one part no scoring model produced for you.</p>';
    }
    html += '</div>';

    /* reflection answers */
    html += '<div class="rsection"><h2>Your hidden strengths</h2>' +
      '<p class="rsection-note">Unscored, and often the most revealing part. Read these against your scored profile — where they agree, you can be confident; where they disagree, trust these.</p>';
    const hs1List = state.hs1.map(x =>
      x === "Something else" && state.hs1Other.trim() ? state.hs1Other.trim() : x);
    html +=
      '<div class="reflect-card">' +
        '<div class="q">What people come to you for</div>' +
        '<div class="a' + (hs1List.length ? '' : ' empty') + '">' +
          (hs1List.length ? hs1List.map(x => '<span class="chip-plain">' + esc(x) + '</span>').join(" ") : "Not answered") +
        '</div>' +
      '</div>';
    [["HS2", "What makes you lose track of time"],
     ["HS3", "Skills people underestimate"]].forEach(([id, label]) => {
      const v = (state.open[id] || "").trim();
      html +=
        '<div class="reflect-card">' +
          '<div class="q">' + esc(label) + '</div>' +
          '<div class="a' + (v ? '' : ' empty') + '">' + (v ? esc(v) : "Not answered") + '</div>' +
        '</div>';
    });
    html += '</div>';

    /* other profiles */
    html +=
      '<div class="rsection">' +
        '<h2>Nearby profiles</h2>' +
        '<p class="rsection-note">Profiles are shorthand, not boxes. Yours sits closest to ' + esc(top.name) +
        ', but these are the next nearest fits — worth reading if the first one didn\'t sound like you.</p>' +
        '<div class="near-miss">' +
          runners.map(a =>
            '<div class="near-row"><span><strong>' + esc(a.name) + '</strong> — ' + esc(a.tagline) + '</span>' +
            '<span class="pct">' + fitLabel(a) + '</span></div>').join("") +
        '</div>' +
        '<p class="rsection-note" style="margin-top:16px"><strong>' + esc(top.name) + '</strong> typically shows up as: ' +
        esc(top.examples.join(", ")) + '. Those are examples of the shape, not a list of jobs you should hold.</p>' +
      '</div>';

    /* caveat + actions */
    html +=
      '<div class="caveat">' +
        '<b>How much to trust this.</b> This is a pilot instrument. Each domain rests on three self-report items, ' +
        'which is enough for reflection and not enough for a decision you couldn\'t reverse. The 9-domain structure is a ' +
        'hypothesis — with 300–500 responses, factor analysis will likely collapse it to 6–8 factors. ' +
        'Treat the shape of your profile as the signal and the exact numbers as noise.' +
      '</div>';

    html +=
      '<div class="dl-row">' +
        '<button class="btn" id="printBtn">Save as PDF / print</button>' +
        '<button class="btn btn-ghost" id="copyBtn">Copy summary</button>' +
        '<button class="btn btn-ghost" id="jsonBtn">Download full data (JSON)</button>' +
        '<button class="btn btn-ghost" id="csvBtn">Download row (CSV)</button>' +
        '<button class="btn btn-ghost" id="restartBtn">Start over</button>' +
      '</div>';

    host.innerHTML = html;

    $("#printBtn").onclick = () => window.print();
    $("#copyBtn").onclick = () => copySummary(s);
    $("#jsonBtn").onclick = () => downloadJson(s);
    $("#csvBtn").onclick = () => downloadCsv(s);
    $("#restartBtn").onclick = restart;

    // animate meters
    requestAnimationFrame(() => {
      host.querySelectorAll(".meter-fill").forEach(f => { f.style.width = f.dataset.w + "%"; });
    });
  }

  /* Displayed closeness. Uses the same quantity the ranking uses, so a profile
   * listed above another never shows a lower number. */
  function fitLabel(a) {
    return Math.min(99, Math.round(a.fit)) + "% fit";
  }

  function profileShapeNote(s) {
    let note = "";
    if (s.spread < 20) {
      note = "Your twelve scores sit close together, which usually means one of two things: you are genuinely broad, " +
        "or you rated yourself consistently across the board. Either way, the ordering below matters more than the sizes — " +
        "and the energy section will separate your domains more sharply than the strength scores did.";
    } else if (s.spread > 45) {
      note = "Your profile is sharply differentiated — there is a wide gap between your strongest and quietest domains. " +
        "That is an asset: specific profiles are easier to place, easier to hire for, and harder to replace.";
    } else {
      note = "Your profile has a clear shape without being narrow — a defined top three with real capability underneath it.";
    }
    if (s.avgPct >= 80) {
      note += " Note that your average self-rating was high (" + Math.round(s.avgPct) + " out of 100), so read the " +
        "relative ordering rather than the absolute heights.";
    }
    let out = "<p>" + note + "</p>";
    if (s.boundaryTie) {
      out += "<p><strong>One caveat on the ordering.</strong> You scored the same on " +
        esc(s.tiedAtBoundary.join(", ")) + ", so which of them landed in your top three was decided by a tie-break " +
        "rather than by your answers. Read them as equally strong, and let the energy ratings below break the tie instead — " +
        "they are the more useful signal here.</p>";
    }
    return out;
  }

  function strengthCard(d, rank) {
    return '<div class="strength-card">' +
      '<div class="sc-head">' +
        '<span class="sc-rank">' + rank + '</span>' +
        '<span class="sc-name">' + esc(d.name) + '</span>' +
        '<span class="sc-cat" style="color:' + catColor(d.pillar) + '">' + esc(PILLARS[d.pillar].label) + '</span>' +
        energyTag(d) +
      '</div>' +
      '<p class="sc-body">' + esc(DOMAINS[d.key].long) + '</p>' +
      meter(d) +
      energyAdvice(d) +
    '</div>';
  }

  function meter(d) {
    return '<div class="meter">' +
      '<div class="meter-track"><div class="meter-fill" data-w="' + d.pct + '" style="width:0;background:' + catColor(d.pillar) + '"></div></div>' +
      '<div class="meter-val">' + d.pct.toFixed(0) + ' / 100</div>' +
    '</div>';
  }

  function energyTag(d) {
    const cls = d.energy >= 4 ? "hi" : (d.energy <= 2 ? "lo" : "");
    return '<span class="energy-tag ' + cls + '">' + esc(ENERGY_SCALE[d.energy - 1].label) + '</span>';
  }

  function energyAdvice(d) {
    if (d.energy >= 4) {
      return '<div class="ai-note"><div><b>Strong and energising.</b> This is the safest thing to build a role around — ' +
        'capability you can sustain without it costing you.</div></div>';
    }
    if (d.energy <= 2) {
      return '<div class="ai-note"><div><b>Strong but draining.</b> You are good at this and it takes something out of you. ' +
        'People in this position get pulled toward it precisely because they are reliable at it, and burn out quietly. ' +
        'Use it deliberately and in bounded amounts rather than as your default contribution.</div></div>';
    }
    return '<div class="ai-note"><div><b>Strong, neutral energy.</b> Useful and sustainable, but unlikely to be the thing ' +
      'that keeps you engaged long term. Pair it with whichever domain you rated most energising.</div></div>';
  }

  /* ---------------- radar ---------------- */
  function radarSvg(s) {
    const W = 560, H = 420, cx = 280, cy = 205, R = 132;
    const n = DOMAIN_ORDER.length;
    const angle = i => (Math.PI * 2 * i / n) - Math.PI / 2;
    const pt = (i, r) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];

    let g = "";
    // rings
    [0.25, 0.5, 0.75, 1].forEach(f => {
      const pts = DOMAIN_ORDER.map((_, i) => pt(i, R * f).map(v => v.toFixed(1)).join(",")).join(" ");
      g += '<polygon points="' + pts + '" fill="none" stroke="#e4e1da" stroke-width="1"/>';
    });
    // spokes
    DOMAIN_ORDER.forEach((_, i) => {
      const [x, y] = pt(i, R);
      g += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#e4e1da" stroke-width="1"/>';
    });

    const strengthPts = DOMAIN_ORDER.map((k, i) => {
      const d = s.byKey(k);
      return pt(i, R * (d.pct / 100)).map(v => v.toFixed(1)).join(",");
    }).join(" ");
    const energyPts = DOMAIN_ORDER.map((k, i) => {
      const d = s.byKey(k);
      return pt(i, R * (d.energyPct / 100)).map(v => v.toFixed(1)).join(",");
    }).join(" ");

    g += '<polygon points="' + energyPts + '" fill="none" stroke="#b4693a" stroke-width="1.8" stroke-dasharray="5 4" stroke-linejoin="round"/>';
    g += '<polygon points="' + strengthPts + '" fill="rgba(47,93,80,.17)" stroke="#2f5d50" stroke-width="2.2" stroke-linejoin="round"/>';

    // dots + labels
    DOMAIN_ORDER.forEach((k, i) => {
      const d = s.byKey(k);
      const [px, py] = pt(i, R * (d.pct / 100));
      g += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="3.6" fill="#2f5d50"/>';

      const [lx, ly] = pt(i, R + 26);
      const cos = Math.cos(angle(i));
      const anchor = Math.abs(cos) < 0.25 ? "middle" : (cos > 0 ? "start" : "end");
      const words = SHORT_NAME[k].split(" ");
      const lines = words.length > 1 && SHORT_NAME[k].length > 13 ? words : [SHORT_NAME[k]];
      const dy0 = -(lines.length - 1) * 6;
      g += '<text x="' + lx.toFixed(1) + '" y="' + (ly + dy0).toFixed(1) + '" text-anchor="' + anchor +
           '" font-size="11.5" font-weight="600" fill="' + catColorHex(d.pillar) + '">' +
           lines.map((w, li) => '<tspan x="' + lx.toFixed(1) + '" dy="' + (li === 0 ? 0 : 13) + '">' + esc(w) + '</tspan>').join("") +
           '</text>';
    });

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Radar chart of twelve domain scores and energy ratings">' +
      g + '</svg>' +
      '<div class="legend">' +
        '<span><i style="background:#2f5d50"></i>Capability</span>' +
        '<span><i style="background:#b4693a"></i>Energy</span>' +
      '</div>';
  }

  /* ---------------- scatter ---------------- */
  function scatterSvg(s) {
    const W = 600, H = 460;
    const m = { t: 34, r: 26, b: 82, l: 56 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const pad = 14; // keeps points at 0/100 and energy 1/5 fully inside the box
    const xOf = v => m.l + pad + (v / 100) * (pw - pad * 2);
    const yOf = v => m.t + ph - pad - ((v - 1) / 4) * (ph - pad * 2);

    let g = '<rect x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '" fill="#fbfaf8" stroke="#e4e1da"/>';

    const splitX = xOf(s.avgPct), splitY = yOf(s.avgEnergy);
    // quadrant tints
    g += '<rect x="' + splitX + '" y="' + m.t + '" width="' + (m.l + pw - splitX) + '" height="' + (splitY - m.t) + '" fill="#eef6f0"/>';
    g += '<rect x="' + splitX + '" y="' + splitY + '" width="' + (m.l + pw - splitX) + '" height="' + (m.t + ph - splitY) + '" fill="#fcf4ee"/>';
    g += '<rect x="' + m.l + '" y="' + m.t + '" width="' + (splitX - m.l) + '" height="' + (splitY - m.t) + '" fill="#f2f5fb"/>';

    g += '<line x1="' + splitX + '" y1="' + m.t + '" x2="' + splitX + '" y2="' + (m.t + ph) + '" stroke="#b9b5ab" stroke-width="1.2" stroke-dasharray="4 4"/>';
    g += '<line x1="' + m.l + '" y1="' + splitY + '" x2="' + (m.l + pw) + '" y2="' + splitY + '" stroke="#b9b5ab" stroke-width="1.2" stroke-dasharray="4 4"/>';

    // Quadrant captions sit outside the plot box so they can never collide
    // with a point label.
    const capTop = m.t - 11, capBot = m.t + ph + 20;
    g += '<text x="' + (m.l + pw) + '" y="' + capTop + '" text-anchor="end" font-size="10.5" font-weight="700" fill="#3f7a5c" letter-spacing=".06em">CORE EDGE ↗</text>';
    g += '<text x="' + m.l + '" y="' + capTop + '" font-size="10.5" font-weight="700" fill="#5a7ba8" letter-spacing=".06em">↖ GROWTH FUEL</text>';
    g += '<text x="' + (m.l + pw) + '" y="' + capBot + '" text-anchor="end" font-size="10.5" font-weight="700" fill="#a96a3a" letter-spacing=".06em">COSTLY STRENGTH ↘</text>';
    g += '<text x="' + m.l + '" y="' + capBot + '" font-size="10.5" font-weight="700" fill="#9b978d" letter-spacing=".06em">↙ DESIGN AROUND</text>';

    // axis labels
    g += '<text x="' + (m.l + pw / 2) + '" y="' + (H - 14) + '" text-anchor="middle" font-size="12" font-weight="600" fill="#4a4843">Capability →</text>';
    g += '<text x="16" y="' + (m.t + ph / 2) + '" text-anchor="middle" font-size="12" font-weight="600" fill="#4a4843" transform="rotate(-90 16 ' + (m.t + ph / 2) + ')">Energy →</text>';

    // points, nudged apart vertically when they collide
    const placed = [];   // label boxes already positioned
    const dots = [];     // dot centres already drawn
    DOMAIN_ORDER.map(k => s.byKey(k)).sort((a, b) => b.pct - a.pct).forEach(d => {
      let x = xOf(d.pct), y = yOf(d.energy);

      // Domains with identical scores land on the exact same pixel, hiding all
      // but the last dot. Nudge duplicates by a few pixels so each is visible.
      let jitter = 0;
      while (dots.some(p => Math.abs(p.x - x) < 5 && Math.abs(p.y - y) < 5) && jitter < 6) {
        jitter++;
        x = xOf(d.pct) + (jitter % 2 ? 1 : -1) * Math.ceil(jitter / 2) * 7;
        y = yOf(d.energy) + (jitter % 2 ? -1 : 1) * Math.ceil(jitter / 2) * 4;
      }
      dots.push({ x: x, y: y });

      // Label above the dot by default; below it when the dot is near the top.
      const below = y - 11 < m.t + 12;
      let ly = below ? y + 17 : y - 11;
      const step = below ? 14 : -14;
      let guard = 0;
      while (placed.some(p => Math.abs(p.x - x) < 96 && Math.abs(p.y - ly) < 13) && guard < 8) {
        ly += step; guard++;
      }
      ly = Math.max(m.t + 12, Math.min(m.t + ph - 6, ly));
      placed.push({ x: x, y: ly });

      const col = catColorHex(d.pillar);
      g += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6" fill="' + col + '" fill-opacity=".85" stroke="#fff" stroke-width="1.5"/>';
      const anchor = x > m.l + pw - 76 ? "end" : (x < m.l + 76 ? "start" : "middle");
      const tx = anchor === "end" ? x + 7 : (anchor === "start" ? x - 7 : x);
      // Label takes the pillar colour so it stays tied to its dot when labels
      // have been pushed away from it.
      g += '<text x="' + tx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + anchor +
           '" font-size="10.5" font-weight="700" fill="' + col + '">' + esc(SHORT_NAME[d.key]) + '</text>';
    });

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Scatter plot of capability against energy for each domain">' + g + '</svg>';
  }

  function quadrants(s) {
    const core = [], costly = [], fuel = [], design = [];
    DOMAIN_ORDER.map(k => s.byKey(k)).forEach(d => {
      if (d.highStrength && d.highEnergy) core.push(d);
      else if (d.highStrength && !d.highEnergy) costly.push(d);
      else if (!d.highStrength && d.highEnergy) fuel.push(d);
      else design.push(d);
    });
    const list = arr => arr.length
      ? "<ul>" + arr.sort((a, b) => b.pct - a.pct).map(d => "<li>" + esc(d.name) + "</li>").join("") + "</ul>"
      : '<div class="empty">No domains fall here for you.</div>';

    // Splitting at the respondent's own averages only means something if they
    // actually varied their answers.
    if (s.spread < 6 && s.energyRange <= 1) {
      return '<div class="caveat" style="margin-top:18px"><b>This map needs more variation to be useful.</b> ' +
        'You gave close to the same rating across all twelve domains, on both capability and energy, so there is nothing ' +
        'for it to separate — everything sits in one cluster. That happens for two reasons: either you genuinely are ' +
        'this even, or the scale did not give you enough room to distinguish between things you are good at. ' +
        'If it is the second, the four written questions in Part 3 will tell you far more than the scores did. ' +
        'It is also worth retaking Part 1 and forcing yourself to use the full range, including the low end.</div>';
    }

    let pre = "";
    if (s.spread < 6) {
      pre = '<p class="rsection-note" style="margin-top:14px">Your capability scores barely vary, so the left/right split ' +
        'below is doing very little work. Read this as an energy map: the vertical position is the real information.</p>';
    } else if (s.energyRange <= 1) {
      pre = '<p class="rsection-note" style="margin-top:14px">Your energy ratings barely vary, so the top/bottom split ' +
        'below is doing very little work. Read this as a capability map.</p>';
    }

    return pre + '<div class="quad-grid">' +
      '<div class="quad q-core"><h4>Core edge</h4><div class="qsub">Above your average on both. Build your work around these.</div>' + list(core) + '</div>' +
      '<div class="quad q-cost"><h4>Costly strength</h4><div class="qsub">You are good at these and they cost you. Ration them; don\'t let them become your identity at work.</div>' + list(costly) + '</div>' +
      '<div class="quad q-fuel"><h4>Growth fuel</h4><div class="qsub">Energising but not yet strong. The cheapest development you will ever do, because you want to do it.</div>' + list(fuel) + '</div>' +
      '<div class="quad q-design"><h4>Design around</h4><div class="qsub">Neither strong nor energising. Partner, delegate, or structure your work so these matter less.</div>' + list(design) + '</div>' +
    '</div>';
  }

  /* ---------------- exports ---------------- */
  function summaryText(s) {
    const L = [];
    L.push("HUMAN ADVANTAGE ASSESSMENT — " + HAA_VERSION);
    L.push("Completed: " + new Date().toLocaleString());
    L.push("");
    L.push("CLOSEST PROFILE: " + s.archetypes[0].name + " — " + s.archetypes[0].tagline);
    L.push("");
    L.push("SIGNATURE STRENGTHS");
    s.signature.forEach((d, i) => L.push("  " + (i + 1) + ". " + d.name + " (" + d.pct.toFixed(0) + "/100, energy: " + ENERGY_SCALE[d.energy - 1].label.toLowerCase() + ")"));
    L.push("");
    L.push("SUPPORTING");
    s.supporting.forEach(d => L.push("  · " + d.name + " (" + d.pct.toFixed(0) + "/100, energy: " + ENERGY_SCALE[d.energy - 1].label.toLowerCase() + ")"));
    L.push("");
    L.push("QUIETER DOMAINS (not weaknesses)");
    s.quieter.forEach(d => L.push("  · " + d.name + " (" + d.pct.toFixed(0) + "/100) — " + DOMAINS[d.key].lowRead));
    L.push("");
    L.push("CORE EDGE (strong + energising): " +
      (s.domains.filter(d => d.highStrength && d.highEnergy).map(d => d.name).join(", ") || "none"));
    L.push("COSTLY STRENGTHS (strong + draining): " +
      (s.domains.filter(d => d.highStrength && !d.highEnergy).map(d => d.name).join(", ") || "none"));
    if ((state.open.HS4 || "").trim()) {
      L.push("");
      L.push("WHAT I DO THAT AI DOES NOT:");
      L.push("  " + state.open.HS4.trim());
    }
    return L.join("\n");
  }

  function copySummary(s) {
    const txt = summaryText(s);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(
        () => toast("Summary copied to clipboard"),
        () => fallbackCopy(txt)
      );
    } else fallbackCopy(txt);
  }
  function fallbackCopy(txt) {
    const ta = document.createElement("textarea");
    ta.value = txt;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); toast("Summary copied to clipboard"); }
    catch (e) { toast("Copy failed — use the JSON download instead"); }
    document.body.removeChild(ta);
  }

  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Downloaded " + filename);
  }

  function stamp() {
    const d = new Date();
    const p = n => String(n).padStart(2, "0");
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes());
  }

  function downloadJson(s) {
    const payload = {
      instrument: "Human Advantage Assessment",
      version: HAA_VERSION,
      completedAt: new Date().toISOString(),
      startedAt: state.startedAt,
      itemResponses: state.answers,
      energyResponses: state.energy,
      reflection: { HS1: state.hs1, HS1_other: state.hs1Other, HS2: state.open.HS2, HS3: state.open.HS3, HS4: state.open.HS4 },
      domainScores: s.domains.map(d => ({
        key: d.key, name: d.name, pillar: d.pillar,
        itemMean: Math.round(d.mean * 100) / 100, scaledScore: d.pct,
        withinPersonCentred: d.relative, energy: d.energy
      })),
      derived: {
        signature: s.signature.map(d => d.key),
        supporting: s.supporting.map(d => d.key),
        quieter: s.quieter.map(d => d.key),
        closestProfile: s.archetypes[0].id,
        profileFits: s.archetypes.map(a => ({ id: a.id, base: Math.round(a.base * 10) / 10, fit: Math.round(a.fit * 10) / 10 })),
        meanScaledScore: Math.round(s.avgPct * 10) / 10,
        meanEnergy: Math.round(s.avgEnergy * 100) / 100,
        spread: Math.round(s.spread * 10) / 10
      }
    };
    download("haa-results-" + stamp() + ".json", JSON.stringify(payload, null, 2), "application/json");
  }

  /* Single wide row — append these to build a dataset for factor analysis. */
  function downloadCsv(s) {
    const q = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const head = ["completed_at", "version"]
      .concat(ITEMS.map(i => i.id))
      .concat(DOMAIN_ORDER.map(k => "energy_" + k))
      .concat(DOMAIN_ORDER.map(k => "mean_" + k))
      .concat(HS1_OPTIONS.map((o, i) => "hs1_" + (i + 1)))
      .concat(["hs1_other_text", "HS2", "HS3", "HS4", "closest_profile"]);
    const row = [new Date().toISOString(), HAA_VERSION]
      .concat(ITEMS.map(i => state.answers[i.id] || ""))
      .concat(DOMAIN_ORDER.map(k => state.energy[k] || ""))
      .concat(DOMAIN_ORDER.map(k => (Math.round(s.byKey(k).mean * 100) / 100)))
      .concat(HS1_OPTIONS.map(o => state.hs1.indexOf(o) !== -1 ? 1 : 0))
      .concat([state.hs1Other, state.open.HS2, state.open.HS3, state.open.HS4, s.archetypes[0].id]);
    download("haa-row-" + stamp() + ".csv",
      head.map(q).join(",") + "\r\n" + row.map(q).join(",") + "\r\n", "text/csv;charset=utf-8");
  }

  /* Optional pooled collection — off unless an endpoint is configured in data.js. */
  function maybePost(s) {
    if (!DATA_COLLECTION_ENDPOINT) return;
    try {
      fetch(DATA_COLLECTION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: HAA_VERSION,
          completedAt: new Date().toISOString(),
          items: state.answers,
          energy: state.energy,
          hs1: state.hs1
        })
      }).catch(() => {});
    } catch (e) { /* never block the report */ }
  }

  function restart() {
    if (!confirm("Clear your answers and start again? Your current results will be lost unless you've downloaded them.")) return;
    clearSaved();
    state.answers = {};
    state.energy = {};
    state.hs1 = [];
    state.hs1Other = "";
    state.open = { HS2: "", HS3: "", HS4: "" };
    state.itemPage = 0;
    state.startedAt = null;
    renderItemPage();
    renderEnergy();
    renderReflect();
    show("intro");
  }

  /* ---------------- validation ---------------- */
  function flagMissing(hostSel, missingIds, validationSel, msg) {
    const host = $(hostSel);
    host.querySelectorAll(".item").forEach(c => c.classList.remove("missing"));
    let first = null;
    missingIds.forEach(id => {
      const c = host.querySelector('.item[data-item="' + id + '"]');
      if (c) { c.classList.add("missing"); if (!first) first = c; }
    });
    const v = $(validationSel);
    v.textContent = msg;
    v.hidden = false;
    if (first) {
      window.scrollTo({ top: first.getBoundingClientRect().top + window.scrollY - 110, behavior: "smooth" });
    }
  }

  /* ---------------- keyboard ---------------- */
  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || "").toLowerCase();
    const type = (e.target.type || "").toLowerCase();
    // Only text entry should swallow number keys; a focused radio must not,
    // since focus lands on a radio as soon as the previous item is answered.
    const isTextEntry = tag === "textarea" ||
      (tag === "input" && type !== "radio" && type !== "checkbox");
    if (isTextEntry || e.target.isContentEditable) return;
    const n = parseInt(e.key, 10);
    if (!(n >= 1 && n <= 5)) return;

    const active = document.querySelector(".screen.active");
    if (!active) return;
    const host = active.querySelector("#itemsHost") || active.querySelector("#energyHost");
    if (!host) return;

    const cards = Array.from(host.querySelectorAll(".item"));
    const target = cards.find(c => !c.classList.contains("answered"));
    if (!target) return;
    const input = target.querySelector('input[value="' + n + '"]');
    if (input) {
      e.preventDefault();
      input.checked = true;
      input.dispatchEvent(new Event("change"));
    }
  }

  /* ---------------- wiring ---------------- */
  function init() {
    $("#verLabel").textContent = HAA_VERSION;
    renderDomainMap();
    renderItemPage();
    renderEnergy();
    renderReflect();

    const saved = load();
    if (saved && (Object.keys(saved.answers || {}).length || Object.keys(saved.energy || {}).length)) {
      $("#resumeBtn").hidden = false;
      $("#resumeBtn").onclick = () => {
        Object.assign(state, {
          startedAt: saved.startedAt || new Date().toISOString(),
          answers: saved.answers || {},
          energy: saved.energy || {},
          hs1: saved.hs1 || [],
          hs1Other: saved.hs1Other || "",
          open: Object.assign({ HS2: "", HS3: "", HS4: "" }, saved.open || {}),
          itemPage: Math.min(saved.itemPage || 0, pages.length - 1)
        });
        renderItemPage();
        renderEnergy();
        renderReflect();
        // jump to the first incomplete part
        const missingItems = ITEMS.filter(it => !state.answers[it.id]);
        if (missingItems.length) {
          const idx = ITEMS.indexOf(missingItems[0]);
          state.itemPage = Math.floor(idx / ITEMS_PER_PAGE);
          renderItemPage();
          show("items");
        } else if (DOMAIN_ORDER.some(k => !state.energy[k])) {
          show("energy");
        } else {
          show("reflect");
        }
      };
    }

    $("#startBtn").onclick = () => {
      if (!state.startedAt) state.startedAt = new Date().toISOString();
      state.itemPage = 0;
      renderItemPage();
      save();
      show("items");
    };

    $("#itemsBack").onclick = () => {
      if (state.itemPage === 0) { show("intro"); return; }
      state.itemPage--;
      renderItemPage();
      show("items");
    };

    $("#itemsNext").onclick = () => {
      const missing = itemPageComplete();
      if (missing.length) {
        flagMissing("#itemsHost", missing.map(m => m.id), "#itemsValidation",
          missing.length === 1
            ? "One statement on this page still needs a rating."
            : missing.length + " statements on this page still need a rating.");
        return;
      }
      if (state.itemPage < pages.length - 1) {
        state.itemPage++;
        renderItemPage();
        show("items");
      } else {
        show("energy");
      }
      save();
    };

    $("#energyBack").onclick = () => {
      state.itemPage = pages.length - 1;
      renderItemPage();
      show("items");
    };

    $("#energyNext").onclick = () => {
      const missing = DOMAIN_ORDER.filter(k => !state.energy[k]);
      if (missing.length) {
        flagMissing("#energyHost", missing.map(k => "E_" + k), "#energyValidation",
          missing.length === 1
            ? "One activity still needs an energy rating."
            : missing.length + " activities still need an energy rating.");
        return;
      }
      save();
      show("reflect");
    };

    $("#reflectBack").onclick = () => show("energy");

    $("#reflectNext").onclick = () => {
      // Part 3 is optional, but nudge once if it is entirely blank.
      const blank = !state.hs1.length && !OPEN_ITEMS.some(o => (state.open[o.id] || "").trim());
      if (blank && !$("#reflectNext").dataset.nudged) {
        $("#reflectNext").dataset.nudged = "1";
        const v = $("#reflectValidation");
        v.textContent = "These are optional — but they are where most people find the strength they'd forgotten about. Press again to skip.";
        v.hidden = false;
        return;
      }
      save();
      const s = computeScores();
      maybePost(s);
      renderResults();
      show("results");
      $("#topbar").hidden = true;
    };

    document.addEventListener("keydown", onKey);
    updateProgress();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else init();
})();
