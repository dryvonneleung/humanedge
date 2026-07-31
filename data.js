/* Human Advantage Assessment (HAA) — instrument content
 * Version 0.1 (pilot). 27 scored items + 9 energy ratings + 4 reflection items.
 * Kept separate from app logic so items can be revised after factor analysis.
 */

const HAA_VERSION = "0.1-pilot";

/* If you later want responses posted to a collector (for the 300–500 response
 * factor analysis), set this to an https endpoint that accepts a JSON POST.
 * While it is null, NOTHING leaves the participant's browser. */
const DATA_COLLECTION_ENDPOINT = null;

const CATEGORIES = {
  thinking:   { label: "Thinking",   blurb: "How you make sense of the world" },
  creating:   { label: "Creating",   blurb: "How you bring new things into being" },
  connecting: { label: "Connecting", blurb: "How you work through and with people" },
  performing: { label: "Performing", blurb: "How you deliver when it counts" }
};

const DOMAINS = {
  SM: {
    key: "SM",
    name: "Sense-Making",
    category: "thinking",
    short: "Making sense of complexity.",
    long: "You cut through noise. Where others see a mess, you find the structure, the real question, and the thing that actually matters.",
    lowRead: "You may prefer working inside a clearly framed problem rather than being the one who frames it.",
    valueLine: "you find the signal inside complicated situations",
    aiWith: "AI is very good at summarising and surfacing patterns in large amounts of material. It can do your first pass for you.",
    aiEdge: "Deciding what matters — and what is safe to ignore — depends on context, stakes and consequence. That judgment call stays yours.",
    growWith: "Practise stating the core question in one sentence before you start solving. If you can't, you haven't made sense of it yet."
  },
  IN: {
    key: "IN",
    name: "Integration",
    category: "thinking",
    short: "Connecting ideas across domains.",
    long: "You think across boundaries. Ideas from one world show up usefully in another, and you translate between people who don't share a vocabulary.",
    lowRead: "You may create value through depth in one domain rather than movement between many.",
    valueLine: "you connect things other people keep separate",
    aiWith: "AI is a strong analogy engine and a fast way to get oriented in an unfamiliar field, which extends your range.",
    aiEdge: "Knowing which cross-domain connection is genuinely load-bearing — rather than merely clever — requires lived understanding of both sides.",
    growWith: "Deliberately read one thing a month far outside your field, and write down one transfer to your own work."
  },
  J: {
    key: "J",
    name: "Judgment",
    category: "thinking",
    short: "Making decisions under uncertainty.",
    long: "You can act on incomplete information without freezing, and you hold competing priorities without collapsing them into false simplicity.",
    lowRead: "You may prefer decisions to be well-evidenced before you commit — a real asset in high-consequence, low-urgency work.",
    valueLine: "you decide well when the information is incomplete",
    aiWith: "AI can lay out options, surface base rates, and argue the other side before you commit.",
    aiEdge: "Accountability is not delegable. Weighing values, taking the risk, and owning the outcome is a human act.",
    growWith: "Keep a short decision log: what you decided, what you expected, what actually happened. Calibration comes from feedback, not volume."
  },
  IV: {
    key: "IV",
    name: "Innovation",
    category: "creating",
    short: "Generating new possibilities.",
    long: "You see options other people walk past. Assumptions look optional to you, and you naturally imagine the better version of what already exists.",
    lowRead: "You may create value by making existing things work reliably rather than by generating alternatives.",
    valueLine: "you see possibilities other people overlook",
    aiWith: "AI gives you volume — many variations, fast — which is useful when you need to get past the obvious first idea.",
    aiEdge: "AI recombines what already exists. Noticing that the framing itself is wrong is a different act.",
    growWith: "Write down the assumption you're least willing to question in your current work. Then question it on paper."
  },
  C: {
    key: "C",
    name: "Craftsmanship",
    category: "creating",
    short: "Producing high-quality work through care and refinement.",
    long: "You care how it's made. You'll keep refining past the point where it's merely acceptable, and detail is a strength rather than a chore.",
    lowRead: "You may create value through speed, breadth or momentum rather than refinement.",
    valueLine: "you hold a standard of quality other people can rely on",
    aiWith: "AI can get you a fast, rough first draft — which is often the least enjoyable part of craft work anyway.",
    aiEdge: "The last 10% is where quality lives, and it's judged by taste and standards rather than by rules. That's the part that carries your name.",
    growWith: "Name your quality bar out loud on your next piece of work, so others can see the standard you're holding."
  },
  E: {
    key: "E",
    name: "Expression",
    category: "creating",
    short: "Communicating or expressing ideas, emotions, beauty, or meaning.",
    long: "You make things land. You have a feel for what reads well, looks right, or moves people — and you enjoy the act of expressing it.",
    lowRead: "You may prefer that the work speak for itself rather than performing or packaging it.",
    valueLine: "you make ideas and feelings land with other people",
    aiWith: "AI can produce competent drafts, alternatives and formats quickly, so you spend your time on the parts that need a point of view.",
    aiEdge: "Competent is not moving. Voice, taste, timing and the willingness to say something true are not average-able.",
    growWith: "Publish or share something small and unpolished on a regular rhythm. Expression strengthens through contact with an audience."
  },
  HU: {
    key: "HU",
    name: "Human Understanding",
    category: "connecting",
    short: "Understanding people and relationships.",
    long: "You read what isn't said. People bring you things, and you naturally think about how a decision will land on the people it touches.",
    lowRead: "You may prefer explicit communication over reading between the lines — which makes you clear and low-drama to work with.",
    valueLine: "you understand what people actually need",
    aiWith: "AI can help you rehearse a hard conversation or consider a perspective you're not naturally taking.",
    aiEdge: "Being genuinely known by another person is not a service that can be simulated. Trust, presence and care are the whole point.",
    growWith: "Ask one more question than feels necessary before offering a solution."
  },
  M: {
    key: "M",
    name: "Mobilization",
    category: "connecting",
    short: "Influencing, coordinating, or inspiring others.",
    long: "You move people toward something together. You adjust how you communicate depending on who's in front of you, and you find the common ground.",
    lowRead: "You create value through depth rather than influence. Some of the most important work is done by people who are not in the room persuading.",
    valueLine: "you get people moving in the same direction",
    aiWith: "AI can help you draft the message, anticipate objections, and tailor it for different audiences.",
    aiEdge: "People follow commitment, not content. Being trusted enough to be followed is earned in person.",
    growWith: "State the shared goal before stating your position. Alignment usually fails at the goal, not the tactics."
  },
  AP: {
    key: "AP",
    name: "Adaptability & Performance",
    category: "performing",
    short: "Executing effectively under changing conditions.",
    long: "You hold up when conditions change. You recalibrate quickly, stay steady under pressure, and pick up new skills and tools without much friction.",
    lowRead: "You may do your best work in stable conditions with room to go deep — a genuine strength in sustained, careful work.",
    valueLine: "you stay effective when conditions change",
    aiWith: "AI shortens your learning curve on new tools, which makes adapting cheaper.",
    aiEdge: "Real-time performance under pressure — physical, emotional, situational — is embodied. It doesn't transfer to a model.",
    growWith: "Notice what you do in the first 60 seconds after something goes wrong. That habit is your performance ceiling."
  }
};

const DOMAIN_ORDER = ["SM", "IN", "J", "IV", "C", "E", "HU", "M", "AP"];

/* 27 scored items.
 * Presentation order is deliberately interleaved (each block of 9 covers all
 * 9 domains) to reduce halo effects and response sets within a domain. */
const ITEMS = [
  { id: "SM1", d: "SM", text: "I can quickly identify what matters most in a complicated situation." },
  { id: "IV1", d: "IV", text: "I often see possibilities that others overlook." },
  { id: "HU1", d: "HU", text: "I can often tell what people need without them explicitly saying it." },
  { id: "C1",  d: "C",  text: "I take pride in producing work of high quality." },
  { id: "J1",  d: "J",  text: "I remain comfortable making decisions when information is incomplete." },
  { id: "IN1", d: "IN", text: "I frequently connect ideas from different fields." },
  { id: "E1",  d: "E",  text: "I enjoy expressing ideas, emotions, or experiences in creative ways." },
  { id: "M1",  d: "M",  text: "I can encourage people to move toward a common goal." },
  { id: "AP1", d: "AP", text: "I adjust quickly when circumstances change." },

  { id: "SM2", d: "SM", text: "I enjoy understanding how different parts of a problem fit together." },
  { id: "IV2", d: "IV", text: "I enjoy questioning assumptions." },
  { id: "HU2", d: "HU", text: "People frequently come to me for advice or support." },
  { id: "C2",  d: "C",  text: "I enjoy refining something until it is done well." },
  { id: "J2",  d: "J",  text: "People trust my judgment in difficult situations." },
  { id: "IN2", d: "IN", text: "My best insights often come from combining seemingly unrelated concepts." },
  { id: "E2",  d: "E",  text: "People often respond positively to the experiences, designs, stories, or creations I produce." },
  { id: "M2",  d: "M",  text: "I adapt my communication style to different audiences." },
  { id: "AP2", d: "AP", text: "I remain calm under pressure." },

  { id: "SM3", d: "SM", text: "People often ask me to help make sense of confusing situations." },
  { id: "IV3", d: "IV", text: "I regularly imagine improvements to existing systems, products, or ideas." },
  { id: "HU3", d: "HU", text: "I naturally consider how decisions will affect others." },
  { id: "C3",  d: "C",  text: "Attention to detail is one of my strengths." },
  { id: "J3",  d: "J",  text: "I can weigh competing priorities without becoming overwhelmed." },
  { id: "IN3", d: "IN", text: "I enjoy translating between people with different perspectives or expertise." },
  { id: "E3",  d: "E",  text: "I have a strong sense for what feels aesthetically or emotionally effective." },
  { id: "M3",  d: "M",  text: "I help people find common ground when perspectives differ." },
  { id: "AP3", d: "AP", text: "I learn new skills, tools, or techniques relatively quickly." }
];

const AGREE_SCALE = [
  { v: 1, label: "Strongly disagree", shortLabel: "Strongly disagree" },
  { v: 2, label: "Disagree",          shortLabel: "Disagree" },
  { v: 3, label: "Neutral",           shortLabel: "Neutral" },
  { v: 4, label: "Agree",             shortLabel: "Agree" },
  { v: 5, label: "Strongly agree",    shortLabel: "Strongly agree" }
];

const ENERGY_SCALE = [
  { v: 1, label: "Draining",           shortLabel: "Draining" },
  { v: 2, label: "Somewhat draining",  shortLabel: "Somewhat draining" },
  { v: 3, label: "Neutral",            shortLabel: "Neutral" },
  { v: 4, label: "Energizing",         shortLabel: "Energizing" },
  { v: 5, label: "Highly energizing",  shortLabel: "Highly energizing" }
];

/* Energy prompts describe the activity, not the trait label, so people rate the
 * doing of it rather than how flattering the label sounds. */
const ENERGY_PROMPTS = {
  SM: "Working out what really matters in a complicated, messy situation.",
  IN: "Connecting ideas across different fields, or translating between people who see things differently.",
  J:  "Making a call when the information is incomplete and the stakes are real.",
  IV: "Coming up with new possibilities and questioning how things are currently done.",
  C:  "Refining something carefully until the quality is genuinely high.",
  E:  "Expressing ideas, emotions or experiences so they land with other people.",
  HU: "Paying close attention to what people need, and supporting them.",
  M:  "Getting a group aligned and moving toward a shared goal.",
  AP: "Adjusting fast, performing under pressure, and learning new things on the fly."
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

/* Archetypes. `special: "quiet"` marks the profile that depends partly on a
 * low Mobilization score (independence-oriented) rather than three highs. */
const ARCHETYPES = [
  {
    id: "integrative-strategist",
    name: "Integrative Strategist",
    domains: ["IN", "SM", "J"],
    tagline: "You see the whole board, then decide.",
    body: "You take in a wide, messy field of information, work out how the pieces relate, and commit to a direction before the picture is complete. Your value shows up in the quality of the framing you give other people.",
    examples: ["Consultants", "Researchers", "Systems leaders", "Strategists", "Policy analysts"]
  },
  {
    id: "master-craftsperson",
    name: "Master Craftsperson",
    domains: ["C", "E", "AP"],
    tagline: "You make things well, and they show it.",
    body: "You hold a standard, you have a feel for what works, and you can hold that standard under real conditions rather than ideal ones. Your value is visible in the object, the performance or the finished piece itself.",
    examples: ["Designers", "Artists", "Makers", "Skilled trades", "Musicians", "Chefs"]
  },
  {
    id: "trusted-guide",
    name: "Trusted Guide",
    domains: ["HU", "J", "M"],
    tagline: "People bring you the things that matter.",
    body: "You read people accurately, you're trusted with hard calls, and you can move a group without needing to dominate it. Your value accumulates as trust, which is slow to build and hard to replace.",
    examples: ["Coaches", "Clinicians", "Teachers", "Community leaders", "Advisors"]
  },
  {
    id: "creative-explorer",
    name: "Creative Explorer",
    domains: ["IV", "IN", "E"],
    tagline: "You find the thing that doesn't exist yet.",
    body: "You generate possibilities, pull material from unrelated places, and you can express the result well enough that other people can see it too. Your value is in opening doors rather than walking through known ones.",
    examples: ["Entrepreneurs", "Writers", "Creators", "Product thinkers", "Founders"]
  },
  {
    id: "precision-performer",
    name: "Precision Performer",
    domains: ["AP", "C", "J"],
    tagline: "You deliver when it's live.",
    body: "You perform to a high standard in real time, when conditions are shifting and there's no chance to redo it. Your value is a combination of skill and composure that only shows up under load.",
    examples: ["Athletes", "Gamers", "Surgeons", "Pilots", "Emergency responders", "Live performers"]
  },
  {
    id: "quiet-specialist",
    name: "Quiet Specialist",
    domains: ["C", "SM"],
    special: "quiet",
    tagline: "Depth, not volume.",
    body: "You go deep, you hold a high standard, and you do it without needing an audience or a room to persuade. A great deal of important work is done exactly this way, and it is routinely under-credited.",
    examples: ["Analysts", "Developers", "Researchers", "Craftspeople", "Editors", "Archivists"]
  }
];
