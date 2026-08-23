/* Human Advantage Assessment™ — instrument content
 * Version 0.2 (pilot). 12 domains across 4 pillars.
 * 36 scored items (3 per domain) + 12 energy ratings + 4 reflection items.
 * Kept separate from app logic so items can be revised after factor analysis.
 */

const HAA_VERSION = "0.2-pilot";

/* Pooled response collection, for refining the instrument. Set this to the
 * /collect route of your deployed Worker — e.g.
 * "https://haa-value-prop.<subdomain>.workers.dev/collect" — and each completed
 * assessment is stored in the D1 database. See worker/README.md.
 *
 * Scored data only: item responses, energy ratings, domain means, HS1 and the
 * matched profile. The open-text answers are never sent.
 *
 * While it is null, NOTHING leaves the participant's browser. Turning it on
 * rewrites the privacy bullet on the landing page automatically, so the
 * "nothing is sent anywhere" promise is never shown while collection is live.
 * That rewrite is notice, not consent — see the collection section of
 * README.md before switching this on. */
const DATA_COLLECTION_ENDPOINT = null;

/* Optional "draft my value proposition" generator. Set this to your deployed
 * Cloudflare Worker URL (see worker/README.md) to switch the feature on.
 * While it is null the section is hidden and no LLM call is ever made.
 * Never put an API key here — this file is public. */
const LLM_ENDPOINT = null;

const PILLARS = {
  notice:     { label: "Notice",     blurb: "What you take in" },
  understand: { label: "Understand", blurb: "What you make of it" },
  create:     { label: "Create",     blurb: "What you bring into being" },
  act:        { label: "Act",        blurb: "What you do about it" }
};

const DOMAINS = {
  OB: {
    key: "OB",
    name: "Observation",
    pillar: "notice",
    short: "Noticing what is actually there.",
    long: "You see what is in front of you. Details other people walk straight past register with you, and you are often the one who spots the thing that turns out to matter.",
    lowRead: "You may filter hard for what is relevant rather than taking in everything — which is exactly right when attention is the scarce resource.",
    valueLine: "you notice what other people walk past",
    aiWith: "AI can watch far more data than you can, around the clock, and flag anomalies in it.",
    aiEdge: "AI only notices what it was pointed at. Seeing the thing nobody thought to measure — in a room, on a shop floor, on someone's face — is still yours.",
    growWith: "Once a day, describe a familiar place or person in five details you would normally skip. Observation trains through deliberate slowing down."
  },
  SA: {
    key: "SA",
    name: "Signal Awareness",
    pillar: "notice",
    short: "Sensing what is changing before it becomes obvious.",
    long: "You pick up the early signal. Something shifts in a person, a room or a situation and you register it before there is any evidence you could point to.",
    lowRead: "You may prefer to act on confirmed information rather than early hunches, which makes you steady and hard to spook.",
    valueLine: "you sense what is shifting before it shows",
    aiWith: "AI is good at detecting drift in anything already being measured, and it never gets bored of watching.",
    aiEdge: "The signals that matter most are usually unmeasured — tone, hesitation, the way a room changes. Reading those is embodied and contextual.",
    growWith: "When you get a hunch, write it down with the date, then check back later. You will learn which of your signals are real and which are noise."
  },
  HU: {
    key: "HU",
    name: "Human Understanding",
    pillar: "notice",
    short: "Understanding people and what they need.",
    long: "You read people accurately. You can tell how someone is doing, people bring things to you, and you try to understand a perspective before judging it.",
    lowRead: "You may prefer explicit communication to reading between the lines, which makes you clear and low-drama to work with.",
    valueLine: "you understand what people actually need",
    aiWith: "AI can help you rehearse a hard conversation, or consider a perspective you are not naturally taking.",
    aiEdge: "Being genuinely known by another person is not a service that can be simulated. Trust, presence and care are the whole point.",
    growWith: "Ask one more question than feels necessary before offering a solution."
  },
  SM: {
    key: "SM",
    name: "Sense-Making",
    pillar: "understand",
    short: "Making sense of complexity.",
    long: "You cut through noise. You enjoy working out how things actually function, and you can explain a complicated thing to someone else without flattening it.",
    lowRead: "You may prefer working inside a clearly framed problem rather than being the one who frames it.",
    valueLine: "you make complicated things make sense",
    aiWith: "AI is very good at summarising and surfacing patterns in large amounts of material. It can do your first pass.",
    aiEdge: "Deciding what matters, and what is safe to ignore, depends on context, stakes and consequence. That call stays yours.",
    growWith: "Practise stating the core question in one sentence before you start solving. If you cannot, you have not made sense of it yet."
  },
  IN: {
    key: "IN",
    name: "Integration",
    pillar: "understand",
    short: "Connecting ideas across areas.",
    long: "You think across boundaries. Ideas from one world show up usefully in another, and you can get people from different backgrounds to understand each other.",
    lowRead: "You may create value through depth in one area rather than movement between many.",
    valueLine: "you connect things other people keep separate",
    aiWith: "AI is a strong analogy engine and a fast way to get oriented in an unfamiliar field, which extends your range.",
    aiEdge: "Knowing which cross-domain connection is genuinely load-bearing, rather than merely clever, requires real understanding of both sides.",
    growWith: "Deliberately read one thing a month far outside your field, and write down one transfer to your own work."
  },
  J: {
    key: "J",
    name: "Judgment",
    pillar: "understand",
    short: "Deciding well under uncertainty.",
    long: "You can act on incomplete information without freezing, you stay calm while doing it, and people trust what you tell them when the situation is difficult.",
    lowRead: "You may prefer decisions to be well-evidenced before you commit — a real asset in high-consequence, low-urgency work.",
    valueLine: "you decide well when the information is incomplete",
    aiWith: "AI can lay out options, surface base rates, and argue the other side before you commit.",
    aiEdge: "Accountability is not delegable. Weighing values, taking the risk and owning the outcome is a human act.",
    growWith: "Keep a short decision log: what you decided, what you expected, what happened. Calibration comes from feedback, not volume."
  },
  IV: {
    key: "IV",
    name: "Innovation",
    pillar: "create",
    short: "Finding better possibilities.",
    long: "You see options other people walk past. Assumptions look optional to you, and you regularly arrive with ideas nobody else in the room had considered.",
    lowRead: "You may create value by making existing things work reliably rather than by generating alternatives.",
    valueLine: "you find the better way nobody had considered",
    aiWith: "AI gives you volume — many variations, fast — which helps you get past the obvious first idea.",
    aiEdge: "AI recombines what already exists. Noticing that the framing itself is wrong is a different act.",
    growWith: "Write down the assumption you are least willing to question in your current work. Then question it on paper."
  },
  E: {
    key: "E",
    name: "Expression",
    pillar: "create",
    short: "Making ideas and feelings land.",
    long: "You enjoy expressing things creatively, you make work other people find meaningful, and you have a reliable sense of what looks, sounds or feels right.",
    lowRead: "You may prefer that the work speak for itself rather than performing or packaging it.",
    valueLine: "you make ideas and feelings land with other people",
    aiWith: "AI can produce competent drafts, alternatives and formats quickly, so your time goes to the parts that need a point of view.",
    aiEdge: "Competent is not moving. Voice, taste, timing and the willingness to say something true are not average-able.",
    growWith: "Share something small and unpolished on a regular rhythm. Expression strengthens through contact with an audience."
  },
  C: {
    key: "C",
    name: "Craftsmanship",
    pillar: "create",
    short: "Producing work of high quality.",
    long: "You care how it is made. You will keep improving something past the point where it is merely acceptable, and detail is a strength rather than a chore.",
    lowRead: "You may create value through speed, breadth or momentum rather than refinement.",
    valueLine: "you hold a standard of quality other people can rely on",
    aiWith: "AI can get you a fast, rough first draft — often the least enjoyable part of craft work anyway.",
    aiEdge: "The last 10% is where quality lives, and it is judged by taste and standards rather than rules. That part carries your name.",
    growWith: "Name your quality bar out loud on your next piece of work, so others can see the standard you are holding."
  },
  M: {
    key: "M",
    name: "Mobilization",
    pillar: "act",
    short: "Moving people toward a shared goal.",
    long: "You bring people with you. You can get a group pointed the same way, find common ground when they disagree, and people tend to listen when you speak.",
    lowRead: "You create value through depth rather than influence. A great deal of important work is done by people who are not in the room persuading.",
    valueLine: "you get people moving in the same direction",
    aiWith: "AI can help you draft the message, anticipate objections and tailor it for different audiences.",
    aiEdge: "People follow commitment, not content. Being trusted enough to be followed is earned in person.",
    growWith: "State the shared goal before stating your position. Alignment usually fails at the goal, not the tactics."
  },
  AD: {
    key: "AD",
    name: "Adaptability",
    pillar: "act",
    short: "Adjusting quickly when things change.",
    long: "You recalibrate fast. New circumstances, new tools, new rules — you pick things up quickly and stay effective rather than waiting for the ground to settle.",
    lowRead: "You may do your best work in stable conditions with room to go deep, which is a genuine strength in sustained, careful work.",
    valueLine: "you stay effective when the ground moves",
    aiWith: "AI shortens the learning curve on anything new, which makes adapting cheaper than it used to be.",
    aiEdge: "Deciding what to keep when everything changes — which standards, which commitments — is a judgment about values, not speed.",
    growWith: "Notice what you reach for first when a plan breaks. That reflex is the thing worth training."
  },
  PP: {
    key: "PP",
    name: "Performance Under Pressure",
    pillar: "act",
    short: "Holding your form when the stakes are high.",
    long: "You stay focused when it is loud, urgent or high-stakes. You can react quickly without panicking, in situations where there is no second take.",
    lowRead: "You may do your best work with time to think — which is what most important decisions actually deserve.",
    valueLine: "you hold steady when the pressure is on",
    aiWith: "AI can prepare you: rehearse the scenario, pre-compute the options, take routine load off you before the moment arrives.",
    aiEdge: "Composure in a real moment is physiological. It cannot be outsourced, and everyone around you can tell whether you have it.",
    growWith: "Rehearse the first 30 seconds of the situations you fear. Under pressure, people fall to the level of their preparation."
  }
};

const DOMAIN_ORDER = ["OB", "SA", "HU", "SM", "IN", "J", "IV", "E", "C", "M", "AD", "PP"];

/* 36 scored items.
 * Presentation order is deliberately interleaved (each block of 12 covers all
 * 12 domains) to reduce halo effects and response sets within a domain. */
const ITEMS = [
  { id: "OB1", d: "OB", text: "I notice details that other people often miss." },
  { id: "SM1", d: "SM", text: "I enjoy figuring out how things work." },
  { id: "IV1", d: "IV", text: "I often think of better ways to do things." },
  { id: "M1",  d: "M",  text: "I can encourage people to work toward a shared goal." },
  { id: "SA1", d: "SA", text: "I often sense that something is wrong before it becomes obvious." },
  { id: "IN1", d: "IN", text: "I often connect ideas from different areas." },
  { id: "E1",  d: "E",  text: "I enjoy expressing ideas, feelings, or experiences creatively." },
  { id: "AD1", d: "AD", text: "I adjust quickly when circumstances change." },
  { id: "HU1", d: "HU", text: "I can usually tell how someone is feeling." },
  { id: "J1",  d: "J",  text: "I can make decisions even when I do not have all the information." },
  { id: "C1",  d: "C",  text: "I keep working on something after the point where most people would stop." },
  { id: "PP1", d: "PP", text: "I stay focused when there is a lot happening around me." },

  { id: "SA2", d: "SA", text: "I can pick up on subtle changes in people or situations." },
  { id: "J2",  d: "J",  text: "I remain calm when making important decisions." },
  { id: "C2",  d: "C",  text: "I enjoy improving something until it is done well." },
  { id: "AD2", d: "AD", text: "I enjoy learning new skills." },
  { id: "OB2", d: "OB", text: "I could describe a room I have just left in accurate detail." },
  { id: "SM2", d: "SM", text: "When situations are confusing, I can usually make sense of them." },
  { id: "IV2", d: "IV", text: "I enjoy challenging assumptions." },
  { id: "M2",  d: "M",  text: "I help people find common ground when they disagree." },
  { id: "HU2", d: "HU", text: "People often come to me for advice or support." },
  { id: "IN2", d: "IN", text: "I enjoy learning from different subjects or experiences." },
  { id: "E2",  d: "E",  text: "I enjoy creating things that others find meaningful." },
  { id: "PP2", d: "PP", text: "I remain calm in stressful situations." },

  { id: "HU3", d: "HU", text: "I try to understand another person's perspective before judging them." },
  { id: "IN3", d: "IN", text: "I can help people with different backgrounds understand each other." },
  { id: "E3",  d: "E",  text: "I have a good sense of what looks, sounds, or feels right." },
  { id: "PP3", d: "PP", text: "I can react quickly without panicking." },
  { id: "OB3", d: "OB", text: "I notice small physical details even when I am not looking for them." },
  { id: "J3",  d: "J",  text: "People often trust my advice in difficult situations." },
  { id: "C3",  d: "C",  text: "It bothers me to hand over work that is only good enough." },
  { id: "M3",  d: "M",  text: "People often listen when I share my ideas." },
  { id: "SA3", d: "SA", text: "I act on my hunches." },
  { id: "SM3", d: "SM", text: "People often ask me to explain complicated things." },
  { id: "IV3", d: "IV", text: "I regularly come up with ideas others have not considered." },
  { id: "AD3", d: "AD", text: "I remain effective even when things are uncertain." }
];

const AGREE_SCALE = [
  { v: 1, label: "Strongly disagree",     shortLabel: "Strongly disagree" },
  { v: 2, label: "Disagree",              shortLabel: "Disagree" },
  { v: 3, label: "Sometimes / not sure",  shortLabel: "Sometimes" },
  { v: 4, label: "Agree",                 shortLabel: "Agree" },
  { v: 5, label: "Strongly agree",        shortLabel: "Strongly agree" }
];

const ENERGY_SCALE = [
  { v: 1, label: "Draining",           shortLabel: "Draining" },
  { v: 2, label: "Somewhat draining",  shortLabel: "Somewhat draining" },
  { v: 3, label: "Neutral",            shortLabel: "Neutral" },
  { v: 4, label: "Energizing",         shortLabel: "Energizing" },
  { v: 5, label: "Highly energizing",  shortLabel: "Highly energizing" }
];

/* Energy prompts describe the activity, not the domain label, so people rate
 * the doing of it rather than how flattering the label sounds. */
const ENERGY_PROMPTS = {
  OB: "Taking in what is around you closely — details, surroundings, the things most people skim past.",
  SA: "Reading early signals that something is changing, before there is clear evidence.",
  HU: "Paying close attention to how people are feeling, and supporting them.",
  SM: "Working out how something complicated actually works, and explaining it to others.",
  IN: "Connecting ideas across different areas, or helping different people understand each other.",
  J:  "Making a call when the information is incomplete and the stakes are real.",
  IV: "Coming up with better ways of doing things and challenging how they are currently done.",
  E:  "Expressing ideas, feelings or experiences so they land with other people.",
  C:  "Refining something carefully until the quality is genuinely high.",
  M:  "Getting people aligned and moving toward a shared goal.",
  AD: "Adjusting to new circumstances and picking up new skills on the fly.",
  PP: "Performing in high-pressure, high-stakes moments where there is no second take."
};

/* Part 3 — reflection items. Not scored. */
const HS1_OPTIONS = [
  "Solving a problem",
  "Making a decision",
  "Understanding people",
  "Learning something new",
  "Generating ideas",
  "Staying organized",
  "Improving quality",
  "Creating something",
  "Remaining calm",
  "Bringing people together",
  "Seeing opportunities",
  "Noticing what others missed",
  "Something else"
];

const OPEN_ITEMS = [
  { id: "HS2", label: "What activities make you lose track of time?",
    hint: "Flow is one of the more honest signals of where your advantage sits." },
  { id: "HS3", label: "What skills have you developed that most people underestimate?",
    hint: "Often things you learned outside work, or things that feel too easy to count." },
  { id: "HS4", label: "What do you do exceptionally well that AI does not yet do well?",
    hint: "Be concrete. A specific example beats a category." }
];

const ARCHETYPES = [
  {
    id: "integrative-strategist",
    name: "The Integrative Strategist",
    domains: ["IN", "SM", "J"],
    tagline: "You see the whole board, then decide.",
    body: "You take in a wide, messy field of information, work out how the pieces relate, and commit to a direction before the picture is complete. Your value shows up in the quality of the framing you give other people.",
    examples: ["Consultants", "Researchers", "Systems leaders", "Strategists", "Policy analysts"]
  },
  {
    id: "trusted-guide",
    name: "The Trusted Guide",
    domains: ["HU", "J", "SA"],
    tagline: "People bring you the things that matter.",
    body: "You read people accurately, you sense trouble early, and you are trusted with hard calls. Your value accumulates as trust, which is slow to build and very hard to replace.",
    examples: ["Coaches", "Clinicians", "Teachers", "Therapists", "Community leaders", "Advisors"]
  },
  {
    id: "creative-maker",
    name: "The Creative Maker",
    domains: ["E", "C", "IV"],
    tagline: "You make things, and they are good.",
    body: "You have a feel for what works, a standard you refuse to drop, and a steady supply of ideas nobody else brought. Your value is visible in the thing itself rather than in describing it.",
    examples: ["Designers", "Artists", "Makers", "Skilled trades", "Musicians", "Writers", "Chefs"]
  },
  {
    id: "precision-performer",
    name: "The Precision Performer",
    domains: ["PP", "C", "AD"],
    tagline: "You deliver when it's live.",
    body: "You perform to a high standard in real time, when conditions shift and there is no chance to redo it. Your value is a combination of skill and composure that only shows up under load.",
    examples: ["Athletes", "Gamers", "Surgeons", "Pilots", "Emergency responders", "Live performers"]
  },
  {
    id: "opportunity-spotter",
    name: "The Opportunity Spotter",
    domains: ["OB", "SA", "IV"],
    tagline: "You see it before anyone else does.",
    body: "You notice what others walk past, you sense which way things are moving, and you turn both into an idea worth acting on. Your value is being early — which is often indistinguishable from being right, later.",
    examples: ["Entrepreneurs", "Investors", "Scouts", "Traders", "Journalists", "Product thinkers"]
  },
  {
    id: "community-builder",
    name: "The Community Builder",
    domains: ["HU", "M", "AD"],
    tagline: "You make groups work.",
    body: "You understand what people need, you can move them toward something shared, and you adjust as the group changes. Your value is the thing nobody notices until you leave and it stops working.",
    examples: ["Organisers", "Managers", "Founders", "Nurses", "Teachers", "Coaches", "Volunteers"]
  }
];
