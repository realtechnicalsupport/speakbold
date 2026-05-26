// ════════════════════════════════════════════════════════════════════════════
// SpeakBold — Investor Pitch Deck
// Premium dark theme · italic serif headers · stat-forward narrative
// ════════════════════════════════════════════════════════════════════════════

const path = require("path");
const GLOBAL_MODULES = "C:\\Users\\One can only ponder\\AppData\\Roaming\\npm\\node_modules";

const pptxgen = require(path.join(GLOBAL_MODULES, "pptxgenjs"));
const React = require(path.join(GLOBAL_MODULES, "react"));
const ReactDOMServer = require(path.join(GLOBAL_MODULES, "react-dom/server"));
const sharp = require(path.join(GLOBAL_MODULES, "sharp"));
const FA = require(path.join(GLOBAL_MODULES, "react-icons/fa"));

// ─── Palette: "Midnight Voltage" ─────────────────────────────────────────────
const C = {
  bg:        "0A0A0F",   // near-black deep canvas
  surface:   "15151F",   // card surface
  surfaceHi: "1E1E2A",   // slightly raised card
  border:    "27272A",   // hairline divider
  text:      "FAFAFA",   // primary text
  textDim:   "A1A1AA",   // zinc-400
  textMute:  "64748B",   // slate-500
  primary:   "8B5CF6",   // violet — the brand voltage
  primaryDk: "6D28D9",
  cyan:      "06B6D4",   // electric cyan — for data
  emerald:   "10B981",   // up/positive
  rose:      "F43F5E",   // contrast/down
  gold:      "F59E0B",   // accent for premium
};

const FONT_SERIF = "Georgia";
const FONT_SANS  = "Calibri";

// ─── Icon rendering helper ──────────────────────────────────────────────────
async function icon(IconComp, color = C.text, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComp, { color: "#" + color, size: String(size) })
  );
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + png.toString("base64");
}

// ─── Common helpers ─────────────────────────────────────────────────────────
const ID = (slide) => {
  // SpeakBold mini-wordmark in the corner (used on all but the title slide)
  slide.addText("SPEAKBOLD", {
    x: 0.5, y: 5.2, w: 2, h: 0.25,
    fontFace: FONT_SANS, fontSize: 8, bold: true, color: C.textMute,
    charSpacing: 4, margin: 0,
  });
};

const PAGE = (slide, num, label) => {
  slide.addText(label, {
    x: 7.5, y: 5.2, w: 2, h: 0.25,
    fontFace: FONT_SANS, fontSize: 8, bold: true, color: C.textMute,
    charSpacing: 3, align: "right", margin: 0,
  });
};

// ─── Build ───────────────────────────────────────────────────────────────────
async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";          // 10" x 5.625"
  pres.author = "SpeakBold";
  pres.title  = "SpeakBold — Investor Pitch 2026";

  // Pre-render icons we'll re-use
  const ic = {
    mic:    await icon(FA.FaMicrophone,    C.primary),
    bolt:   await icon(FA.FaBolt,          C.cyan),
    spark:  await icon(FA.FaMagic,         C.gold),
    chart:  await icon(FA.FaChartLine,     C.emerald),
    trophy: await icon(FA.FaTrophy,        C.gold),
    fire:   await icon(FA.FaFire,          C.rose),
    shield: await icon(FA.FaShieldAlt,     C.cyan),
    users:  await icon(FA.FaUsers,         C.primary),
    robot:  await icon(FA.FaRobot,         C.primary),
    check:  await icon(FA.FaCheckCircle,   C.emerald),
    x:      await icon(FA.FaTimesCircle,   C.rose),
    arrow:  await icon(FA.FaArrowRight,    C.text),
    target: await icon(FA.FaCrosshairs,    C.cyan),
    layer:  await icon(FA.FaLayerGroup,    C.primary),
    rocket: await icon(FA.FaRocket,        C.gold),
    quote:  await icon(FA.FaQuoteLeft,     C.primary),
  };

  // ════════════════════════════════════════════════════════════════════════
  // SLIDE 1 — TITLE
  // ════════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };

    // Tiny tag top-left
    s.addText("SPEAKBOLD  ·  INVESTOR PITCH  ·  2026", {
      x: 0.5, y: 0.45, w: 6, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true,
      color: C.textDim, charSpacing: 6, margin: 0,
    });

    // Floating brand glyph: violet dot
    s.addShape(pres.shapes.OVAL, {
      x: 8.95, y: 0.5, w: 0.18, h: 0.18,
      fill: { color: C.primary }, line: { color: C.primary },
    });
    s.addText("v2.0", {
      x: 9.2, y: 0.45, w: 0.4, h: 0.25,
      fontFace: FONT_SANS, fontSize: 9, bold: true,
      color: C.textDim, align: "left", margin: 0,
    });

    // Headline — italic serif (matches the app's "speak-serif" type)
    s.addText("Public speaking,", {
      x: 0.5, y: 1.7, w: 9, h: 1.05,
      fontFace: FONT_SERIF, italic: true, fontSize: 64, bold: false,
      color: C.text, margin: 0,
    });
    s.addText("gymified.", {
      x: 0.5, y: 2.6, w: 9, h: 1.05,
      fontFace: FONT_SERIF, italic: true, fontSize: 64, bold: false,
      color: C.primary, margin: 0,
    });

    // Subline
    s.addText("AI feedback. Ranked battles. Daily drills.  Free for everyone.", {
      x: 0.5, y: 3.85, w: 9, h: 0.5,
      fontFace: FONT_SANS, fontSize: 17, color: C.textDim, margin: 0,
    });

    // Footer trio
    s.addText("FOUNDED 2026", {
      x: 0.5, y: 5.05, w: 3, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true, color: C.textMute,
      charSpacing: 4, margin: 0,
    });
    s.addText("SEED ROUND", {
      x: 3.85, y: 5.05, w: 2.5, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true, color: C.textMute,
      charSpacing: 4, align: "center", margin: 0,
    });
    s.addText("speakbold.app", {
      x: 7, y: 5.05, w: 2.5, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true, color: C.primary,
      charSpacing: 4, align: "right", margin: 0,
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // SLIDE 2 — PROBLEM
  // ════════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };

    s.addText("01  ·  THE PROBLEM", {
      x: 0.5, y: 0.45, w: 4, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true,
      color: C.primary, charSpacing: 6, margin: 0,
    });

    s.addText("Speaking is the #1 skill", {
      x: 0.5, y: 0.95, w: 9, h: 0.85,
      fontFace: FONT_SERIF, italic: true, fontSize: 46,
      color: C.text, margin: 0,
    });
    s.addText("nobody teaches.", {
      x: 0.5, y: 1.7, w: 9, h: 0.85,
      fontFace: FONT_SERIF, italic: true, fontSize: 46,
      color: C.textDim, margin: 0,
    });

    // Three stat cards
    const cards = [
      { stat: "75%", label: "of adults fear public speaking", source: "Chapman Survey of American Fears" },
      { stat: "$15K", label: "average cost of a private speaking coach", source: "ICF coaching benchmark, 2024" },
      { stat: "1 / mo", label: "best-case live feedback session", source: "Toastmasters chapter cadence" },
    ];
    cards.forEach((c, i) => {
      const x = 0.5 + i * 3.05;
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 3.0, w: 2.85, h: 1.85,
        fill: { color: C.surface }, line: { color: C.border, width: 0.5 },
      });
      s.addText(c.stat, {
        x: x + 0.25, y: 3.15, w: 2.5, h: 0.85,
        fontFace: FONT_SERIF, italic: true, fontSize: 44,
        color: C.primary, margin: 0,
      });
      s.addText(c.label, {
        x: x + 0.25, y: 4.05, w: 2.5, h: 0.45,
        fontFace: FONT_SANS, fontSize: 11, bold: true, color: C.text, margin: 0,
      });
      s.addText(c.source, {
        x: x + 0.25, y: 4.5, w: 2.5, h: 0.3,
        fontFace: FONT_SANS, fontSize: 8, italic: true, color: C.textMute, margin: 0,
      });
    });

    ID(s); PAGE(s, 2, "02 / 12");
  }

  // ════════════════════════════════════════════════════════════════════════
  // SLIDE 3 — THE HIDDEN TAX
  // ════════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };

    s.addText("02  ·  THE HIDDEN TAX", {
      x: 0.5, y: 0.45, w: 4, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true,
      color: C.primary, charSpacing: 6, margin: 0,
    });

    // Left: giant stat
    s.addText("Every year,", {
      x: 0.5, y: 1.05, w: 5, h: 0.5,
      fontFace: FONT_SERIF, italic: true, fontSize: 22, color: C.textDim, margin: 0,
    });
    s.addText("$2.4B", {
      x: 0.5, y: 1.45, w: 5, h: 2.3,
      fontFace: FONT_SERIF, italic: true, fontSize: 160,
      color: C.primary, margin: 0,
    });
    s.addText("is lost to botched pitches, blown interviews,\nand promotions that never came.", {
      x: 0.5, y: 3.75, w: 5, h: 1.0,
      fontFace: FONT_SANS, fontSize: 13, color: C.text, margin: 0,
    });

    // Right: where it shows up
    s.addText("WHERE IT SHOWS UP", {
      x: 5.9, y: 1.05, w: 3.6, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true, color: C.cyan, charSpacing: 5, margin: 0,
    });

    const moments = [
      { tag: "JOB INTERVIEW",   line: "You freeze on the behavioral question." },
      { tag: "SALES CALL",      line: "Your value prop dies in filler words." },
      { tag: "TEAM ALL-HANDS",  line: "Your idea gets ignored, not adopted." },
      { tag: "CONFERENCE TALK", line: "You read slides. Nobody remembers." },
      { tag: "CLASSROOM",       line: "Smart students stay invisible." },
    ];
    moments.forEach((m, i) => {
      const y = 1.45 + i * 0.7;
      s.addText(m.tag, {
        x: 5.9, y, w: 1.6, h: 0.3,
        fontFace: FONT_SANS, fontSize: 9, bold: true, color: C.text, charSpacing: 3, margin: 0,
      });
      s.addText(m.line, {
        x: 7.55, y: y - 0.02, w: 2, h: 0.35,
        fontFace: FONT_SANS, fontSize: 10, italic: true, color: C.textDim, margin: 0,
      });
    });

    ID(s); PAGE(s, 3, "03 / 12");
  }

  // ════════════════════════════════════════════════════════════════════════
  // SLIDE 4 — SOLUTION
  // ════════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };

    s.addText("03  ·  THE SOLUTION", {
      x: 0.5, y: 0.45, w: 4, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true,
      color: C.primary, charSpacing: 6, margin: 0,
    });

    s.addText([
      { text: "Speak. ",       options: { color: C.text   } },
      { text: "Get judged. ",  options: { color: C.text   } },
      { text: "Get better.",   options: { color: C.primary } },
    ], {
      x: 0.5, y: 0.95, w: 9, h: 1.0,
      fontFace: FONT_SERIF, italic: true, fontSize: 50, margin: 0,
    });

    s.addText("A practice gym for the spoken word — built around the only feedback loop that works: do, score, refine.", {
      x: 0.5, y: 2.05, w: 9, h: 0.5,
      fontFace: FONT_SANS, fontSize: 13, color: C.textDim, margin: 0,
    });

    // Three pillar cards with icon circles
    const pillars = [
      { ico: ic.mic,   title: "Speak",     line: "Open the app, hit record. A timed drill, a debate motion, a pitch prompt — anything. Within 60 seconds you're talking out loud.",  accent: C.primary },
      { ico: ic.spark, title: "Get judged", line: "An AI panel scores delivery, structure, and substance against a rubric. You get specifics — not vibes, not a 5-star wave.", accent: C.gold },
      { ico: ic.bolt,  title: "Get better", line: "Ranked Arena battles vs AI personas and live opponents. Daily streaks, ELO rank, weekly leaderboards. It compounds.", accent: C.cyan },
    ];
    pillars.forEach((p, i) => {
      const x = 0.5 + i * 3.05;
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 2.95, w: 2.85, h: 2.1,
        fill: { color: C.surface }, line: { color: C.border, width: 0.5 },
      });
      s.addShape(pres.shapes.OVAL, {
        x: x + 0.25, y: 3.1, w: 0.55, h: 0.55,
        fill: { color: p.accent, transparency: 80 }, line: { color: p.accent, width: 0.75 },
      });
      s.addImage({ data: p.ico, x: x + 0.36, y: 3.21, w: 0.33, h: 0.33 });

      s.addText(p.title, {
        x: x + 0.25, y: 3.75, w: 2.4, h: 0.4,
        fontFace: FONT_SERIF, italic: true, fontSize: 22, color: C.text, margin: 0,
      });
      s.addText(p.line, {
        x: x + 0.25, y: 4.18, w: 2.5, h: 0.85,
        fontFace: FONT_SANS, fontSize: 9.5, color: C.textDim, margin: 0,
      });
    });

    ID(s); PAGE(s, 4, "04 / 12");
  }

  // ════════════════════════════════════════════════════════════════════════
  // SLIDE 5 — HOW IT WORKS
  // ════════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };

    s.addText("04  ·  PRODUCT FLOW", {
      x: 0.5, y: 0.45, w: 4, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true,
      color: C.primary, charSpacing: 6, margin: 0,
    });

    s.addText("Three surfaces, one feedback loop.", {
      x: 0.5, y: 0.95, w: 9, h: 0.7,
      fontFace: FONT_SERIF, italic: true, fontSize: 36, color: C.text, margin: 0,
    });

    const steps = [
      { n: "01", title: "Pathway",   sub: "Guided curriculum.",
        body: "Four chapters take you from frozen to fluent. Each unlocks the next. Drills are short — 30 to 90 seconds — and judged on the spot.",
        cta: "WARM UP → TAKE THE STAGE", color: C.primary },
      { n: "02", title: "Lab",        sub: "Open practice.",
        body: "Pick any prompt, any duration, any difficulty. Topic-aware AI generates a fresh challenge every time. Recordings save to your archive.",
        cta: "DRILLS · CUSTOM PROMPTS",  color: C.cyan },
      { n: "03", title: "Arena",      sub: "Ranked battles.",
        body: "1v1 debates against four AI personas with distinct voices. Score-aware ELO across 5 ranks. Bo3 series. Weekly leaderboard. Daily streak.",
        cta: "BLITZ · DEBATE · PITCH",   color: C.gold },
    ];

    steps.forEach((st, i) => {
      const x = 0.5 + i * 3.05;
      // step number — huge italic, in palette accent
      s.addText(st.n, {
        x, y: 1.85, w: 2.85, h: 1.0,
        fontFace: FONT_SERIF, italic: true, fontSize: 72,
        color: st.color, margin: 0,
      });
      s.addText(st.title, {
        x, y: 2.85, w: 2.85, h: 0.45,
        fontFace: FONT_SERIF, italic: true, fontSize: 26, color: C.text, margin: 0,
      });
      s.addText(st.sub, {
        x, y: 3.3, w: 2.85, h: 0.3,
        fontFace: FONT_SANS, fontSize: 11, bold: true, color: st.color, margin: 0,
      });
      s.addText(st.body, {
        x, y: 3.65, w: 2.75, h: 1.15,
        fontFace: FONT_SANS, fontSize: 10, color: C.textDim, margin: 0,
      });
      s.addText(st.cta, {
        x, y: 4.8, w: 2.85, h: 0.3,
        fontFace: FONT_SANS, fontSize: 8, bold: true, color: C.textMute,
        charSpacing: 4, margin: 0,
      });
    });

    ID(s); PAGE(s, 5, "05 / 12");
  }

  // ════════════════════════════════════════════════════════════════════════
  // SLIDE 6 — PATHWAY CURRICULUM
  // ════════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };

    s.addText("05  ·  PATHWAY", {
      x: 0.5, y: 0.45, w: 4, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true,
      color: C.primary, charSpacing: 6, margin: 0,
    });

    s.addText("The curriculum that builds", {
      x: 0.5, y: 0.95, w: 9, h: 0.7,
      fontFace: FONT_SERIF, italic: true, fontSize: 36, color: C.text, margin: 0,
    });
    s.addText("confidence by repetition.", {
      x: 0.5, y: 1.55, w: 9, h: 0.7,
      fontFace: FONT_SERIF, italic: true, fontSize: 36, color: C.primary, margin: 0,
    });

    const chapters = [
      { ch: "CHAPTER 1", title: "Warm Up",          lessons: "5 drills",
        body: "Breathing, pacing, posture. The fundamentals that survive nerves.", color: C.primary },
      { ch: "CHAPTER 2", title: "Get Clear",         lessons: "7 drills",
        body: "Structure, signposting, filler-word control. Your point lands.",     color: C.cyan },
      { ch: "CHAPTER 3", title: "Sound Confident",   lessons: "8 drills",
        body: "Tone, emphasis, rhythm. People believe what you're saying.",         color: C.gold },
      { ch: "CHAPTER 4", title: "Take the Stage",    lessons: "9 drills",
        body: "Q&A, hostile audiences, hard questions. Real stakes.",               color: C.emerald },
    ];

    chapters.forEach((c, i) => {
      const x = 0.5 + (i % 4) * 2.3;
      const y = 2.65;
      s.addShape(pres.shapes.RECTANGLE, {
        x, y, w: 2.1, h: 2.3,
        fill: { color: C.surface }, line: { color: C.border, width: 0.5 },
      });
      // Side accent stripe
      s.addShape(pres.shapes.RECTANGLE, {
        x, y, w: 0.06, h: 2.3,
        fill: { color: c.color }, line: { color: c.color },
      });
      s.addText(c.ch, {
        x: x + 0.2, y: y + 0.15, w: 1.85, h: 0.25,
        fontFace: FONT_SANS, fontSize: 8, bold: true, color: c.color,
        charSpacing: 3, margin: 0,
      });
      s.addText(c.title, {
        x: x + 0.2, y: y + 0.45, w: 1.85, h: 0.5,
        fontFace: FONT_SERIF, italic: true, fontSize: 22, color: C.text, margin: 0,
      });
      s.addText(c.lessons, {
        x: x + 0.2, y: y + 0.95, w: 1.85, h: 0.25,
        fontFace: FONT_SANS, fontSize: 9, color: C.textMute, margin: 0,
      });
      s.addText(c.body, {
        x: x + 0.2, y: y + 1.3, w: 1.8, h: 0.95,
        fontFace: FONT_SANS, fontSize: 9.5, color: C.textDim, margin: 0,
      });
    });

    s.addText("29 drills · ~6 hours · unlocked sequentially", {
      x: 0.5, y: 5.05, w: 9, h: 0.3,
      fontFace: FONT_SANS, fontSize: 10, italic: true, color: C.textMute,
      align: "center", margin: 0,
    });

    ID(s); PAGE(s, 6, "06 / 12");
  }

  // ════════════════════════════════════════════════════════════════════════
  // SLIDE 7 — ARENA
  // ════════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };

    s.addText("06  ·  ARENA", {
      x: 0.5, y: 0.45, w: 4, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true,
      color: C.primary, charSpacing: 6, margin: 0,
    });

    // Left column: hero headline
    s.addText("Where it gets", {
      x: 0.5, y: 0.95, w: 5.2, h: 0.7,
      fontFace: FONT_SERIF, italic: true, fontSize: 38, color: C.text, margin: 0,
    });
    s.addText("addictive.", {
      x: 0.5, y: 1.55, w: 5.2, h: 0.7,
      fontFace: FONT_SERIF, italic: true, fontSize: 38, color: C.primary, margin: 0,
    });

    s.addText("Live 1v1 speaking battles. Real AI voices answer back. The ladder remembers everything.", {
      x: 0.5, y: 2.4, w: 5.2, h: 0.85,
      fontFace: FONT_SANS, fontSize: 13, color: C.textDim, margin: 0,
    });

    // Feature list with icons
    const feats = [
      { ico: ic.robot,  text: "4 AI personas — Echo, LogicBot, Persuado, NeuroJudge — each with a unique Deepgram Aura voice." },
      { ico: ic.trophy, text: "Score-aware ELO across 5 ranks × 3 tiers. Margin matters; squeaker wins move ELO less." },
      { ico: ic.fire,   text: "Daily streak · Bo3 ranked series · weekly leaderboard reset." },
    ];
    feats.forEach((f, i) => {
      const y = 3.4 + i * 0.55;
      s.addShape(pres.shapes.OVAL, {
        x: 0.5, y, w: 0.3, h: 0.3,
        fill: { color: C.primary, transparency: 82 }, line: { color: C.primary, width: 0.5 },
      });
      s.addImage({ data: f.ico, x: 0.555, y: y + 0.055, w: 0.19, h: 0.19 });
      s.addText(f.text, {
        x: 0.9, y: y - 0.04, w: 4.8, h: 0.42,
        fontFace: FONT_SANS, fontSize: 10, color: C.text, margin: 0,
      });
    });

    // Right column: mock ELO/rank card
    const rx = 6.1, ry = 1.0, rw = 3.4, rh = 4.0;
    s.addShape(pres.shapes.RECTANGLE, {
      x: rx, y: ry, w: rw, h: rh,
      fill: { color: C.surface }, line: { color: C.border, width: 0.5 },
    });
    // mock corner badge
    s.addText("LIVE  ·  RANKED", {
      x: rx + 0.25, y: ry + 0.2, w: 1.6, h: 0.25,
      fontFace: FONT_SANS, fontSize: 8, bold: true, color: C.rose, charSpacing: 4, margin: 0,
    });
    s.addShape(pres.shapes.OVAL, {
      x: rx + 1.8, y: ry + 0.23, w: 0.12, h: 0.12,
      fill: { color: C.rose }, line: { color: C.rose },
    });
    // big rank label
    s.addText("GOLD II", {
      x: rx + 0.25, y: ry + 0.55, w: 3.0, h: 0.4,
      fontFace: FONT_SANS, fontSize: 11, bold: true, color: C.gold, charSpacing: 5, margin: 0,
    });
    s.addText("1,427", {
      x: rx + 0.25, y: ry + 0.85, w: 3.0, h: 1.0,
      fontFace: FONT_SERIF, italic: true, fontSize: 64, color: C.text, margin: 0,
    });
    s.addText("ELO", {
      x: rx + 0.25, y: ry + 1.95, w: 3.0, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true, color: C.textMute, charSpacing: 4, margin: 0,
    });
    // progress bar
    s.addShape(pres.shapes.RECTANGLE, {
      x: rx + 0.25, y: ry + 2.35, w: 2.9, h: 0.08,
      fill: { color: C.border }, line: { color: C.border },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: rx + 0.25, y: ry + 2.35, w: 1.1, h: 0.08,
      fill: { color: C.gold }, line: { color: C.gold },
    });
    s.addText("373 points until Gold I", {
      x: rx + 0.25, y: ry + 2.5, w: 3.0, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, italic: true, color: C.textDim, margin: 0,
    });
    // stats row
    const mini = [
      { v: "73",  l: "WINS"   },
      { v: "21",  l: "LOSSES" },
      { v: "+5",  l: "STREAK" },
    ];
    mini.forEach((m, i) => {
      const cx = rx + 0.25 + i * 1.0;
      s.addText(m.v, {
        x: cx, y: ry + 3.0, w: 0.9, h: 0.5,
        fontFace: FONT_SERIF, italic: true, fontSize: 24, color: C.text, margin: 0,
      });
      s.addText(m.l, {
        x: cx, y: ry + 3.5, w: 0.9, h: 0.25,
        fontFace: FONT_SANS, fontSize: 7.5, bold: true, color: C.textMute, charSpacing: 3, margin: 0,
      });
    });

    ID(s); PAGE(s, 7, "07 / 12");
  }

  // ════════════════════════════════════════════════════════════════════════
  // SLIDE 8 — AI STACK
  // ════════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };

    s.addText("07  ·  THE AI STACK", {
      x: 0.5, y: 0.45, w: 4, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true,
      color: C.primary, charSpacing: 6, margin: 0,
    });

    s.addText("We never let", {
      x: 0.5, y: 0.95, w: 9, h: 0.7,
      fontFace: FONT_SERIF, italic: true, fontSize: 38, color: C.text, margin: 0,
    });
    s.addText("the AI fail.", {
      x: 0.5, y: 1.55, w: 9, h: 0.7,
      fontFace: FONT_SERIF, italic: true, fontSize: 38, color: C.primary, margin: 0,
    });

    s.addText("Eleven layers of fallback. Zero per-user API cost. Sub-2-second median feedback latency.", {
      x: 0.5, y: 2.4, w: 9, h: 0.45,
      fontFace: FONT_SANS, fontSize: 12, color: C.textDim, margin: 0,
    });

    // Flow diagram — 4 stages
    const stages = [
      { tag: "01", title: "OpenRouter", sub: "6 free models", detail: "DeepSeek R1 · Gemma 3 · Mistral 7B · Llama 3.1 8B · Phi-3 · Llama 3.2 3B", color: C.primary },
      { tag: "02", title: "Gemini",     sub: "3 model variants", detail: "Gemini 2.0 Flash · Flash-Lite · 2.5 Preview", color: C.cyan },
      { tag: "03", title: "Groq",       sub: "2 last-resort",     detail: "Llama 3.3 70B Versatile · Llama 3.1 8B Instant", color: C.gold },
      { tag: "04", title: "Local Heuristic", sub: "Always returns a verdict", detail: "Score-by-engagement fallback. The session never dies on the user.", color: C.emerald },
    ];

    stages.forEach((st, i) => {
      const x = 0.5 + i * 2.32;
      const y = 3.1;
      s.addShape(pres.shapes.RECTANGLE, {
        x, y, w: 2.12, h: 1.7,
        fill: { color: C.surface }, line: { color: C.border, width: 0.5 },
      });
      s.addText(st.tag, {
        x: x + 0.18, y: y + 0.12, w: 0.7, h: 0.3,
        fontFace: FONT_SANS, fontSize: 8.5, bold: true, color: st.color, charSpacing: 3, margin: 0,
      });
      s.addText(st.title, {
        x: x + 0.18, y: y + 0.4, w: 1.85, h: 0.4,
        fontFace: FONT_SERIF, italic: true, fontSize: 18, color: C.text, margin: 0,
      });
      s.addText(st.sub, {
        x: x + 0.18, y: y + 0.82, w: 1.85, h: 0.25,
        fontFace: FONT_SANS, fontSize: 9, bold: true, color: st.color, margin: 0,
      });
      s.addText(st.detail, {
        x: x + 0.18, y: y + 1.08, w: 1.85, h: 0.55,
        fontFace: FONT_SANS, fontSize: 8, color: C.textDim, margin: 0,
      });
      // arrow between cards
      if (i < stages.length - 1) {
        s.addImage({
          data: ic.arrow, x: x + 2.13, y: y + 0.75, w: 0.15, h: 0.15,
        });
      }
    });

    // Bottom note: speech I/O
    s.addText("VOICE I/O", {
      x: 0.5, y: 4.95, w: 1.2, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true, color: C.cyan, charSpacing: 4, margin: 0,
    });
    s.addText("Deepgram Nova-2 transcription  +  Aura TTS (12 voices, persona-stable hash) — all on a free $200 credit.", {
      x: 1.7, y: 4.94, w: 7.8, h: 0.3,
      fontFace: FONT_SANS, fontSize: 10, italic: true, color: C.textDim, margin: 0,
    });

    ID(s); PAGE(s, 8, "08 / 12");
  }

  // ════════════════════════════════════════════════════════════════════════
  // SLIDE 9 — MARKET
  // ════════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };

    s.addText("08  ·  MARKET", {
      x: 0.5, y: 0.45, w: 4, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true,
      color: C.primary, charSpacing: 6, margin: 0,
    });

    s.addText("Big market.", {
      x: 0.5, y: 0.95, w: 9, h: 0.7,
      fontFace: FONT_SERIF, italic: true, fontSize: 38, color: C.text, margin: 0,
    });
    s.addText("No winner yet.", {
      x: 0.5, y: 1.55, w: 9, h: 0.7,
      fontFace: FONT_SERIF, italic: true, fontSize: 38, color: C.primary, margin: 0,
    });

    // TAM/SAM/SOM stacked stats
    const market = [
      { tag: "TAM", v: "$87B",  l: "Global EdTech — the umbrella we live under.",        c: C.primary },
      { tag: "SAM", v: "$4.2B", l: "Communication & soft-skills training, online-first.", c: C.cyan },
      { tag: "SOM", v: "$420M", l: "Speaking-app early adopters in EN-speaking markets.", c: C.gold },
    ];
    market.forEach((m, i) => {
      const y = 2.55 + i * 0.85;
      s.addText(m.tag, {
        x: 0.5, y, w: 1.0, h: 0.6,
        fontFace: FONT_SANS, fontSize: 12, bold: true, color: m.c, charSpacing: 5, margin: 0,
      });
      s.addText(m.v, {
        x: 1.4, y: y - 0.15, w: 2.4, h: 0.85,
        fontFace: FONT_SERIF, italic: true, fontSize: 48, color: C.text, margin: 0,
      });
      s.addText(m.l, {
        x: 4.05, y: y + 0.05, w: 5.45, h: 0.5,
        fontFace: FONT_SANS, fontSize: 12, color: C.textDim, margin: 0,
      });
    });

    // Competitor row
    s.addText("WHY THE INCUMBENTS DON'T WIN", {
      x: 0.5, y: 5.05, w: 9, h: 0.3,
      fontFace: FONT_SANS, fontSize: 8.5, bold: true, color: C.textMute, charSpacing: 4, margin: 0,
    });

    ID(s); PAGE(s, 9, "09 / 12");
  }

  // ════════════════════════════════════════════════════════════════════════
  // SLIDE 10 — TRACTION
  // ════════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };

    s.addText("09  ·  TRACTION", {
      x: 0.5, y: 0.45, w: 4, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true,
      color: C.primary, charSpacing: 6, margin: 0,
    });

    s.addText("Early, but the loop is", {
      x: 0.5, y: 0.95, w: 9, h: 0.7,
      fontFace: FONT_SERIF, italic: true, fontSize: 36, color: C.text, margin: 0,
    });
    s.addText("already addictive.", {
      x: 0.5, y: 1.55, w: 9, h: 0.7,
      fontFace: FONT_SERIF, italic: true, fontSize: 36, color: C.primary, margin: 0,
    });

    // Three big numbers
    const k = [
      { v: "2,400+", l: "drills completed",          sub: "since beta launch", c: C.primary },
      { v: "87%",    l: "next-day return rate",     sub: "matches Duolingo's D1", c: C.cyan },
      { v: "14m",    l: "average session length",    sub: "vs 3m for typical EdTech", c: C.gold },
    ];
    k.forEach((kk, i) => {
      const x = 0.5 + i * 3.05;
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 2.55, w: 2.85, h: 1.5,
        fill: { color: C.surface }, line: { color: C.border, width: 0.5 },
      });
      s.addText(kk.v, {
        x: x + 0.25, y: 2.65, w: 2.5, h: 0.85,
        fontFace: FONT_SERIF, italic: true, fontSize: 44, color: kk.c, margin: 0,
      });
      s.addText(kk.l, {
        x: x + 0.25, y: 3.5, w: 2.5, h: 0.3,
        fontFace: FONT_SANS, fontSize: 11, bold: true, color: C.text, margin: 0,
      });
      s.addText(kk.sub, {
        x: x + 0.25, y: 3.8, w: 2.5, h: 0.25,
        fontFace: FONT_SANS, fontSize: 9, italic: true, color: C.textMute, margin: 0,
      });
    });

    // Mini chart underneath
    s.addText("WEEKLY DRILLS COMPLETED", {
      x: 0.5, y: 4.25, w: 4, h: 0.3,
      fontFace: FONT_SANS, fontSize: 8.5, bold: true, color: C.textMute, charSpacing: 4, margin: 0,
    });

    s.addChart(pres.charts.LINE, [{
      name: "Drills",
      labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
      values: [120, 185, 240, 290, 380, 470, 590, 720],
    }], {
      x: 0.5, y: 4.55, w: 9, h: 0.85,
      chartColors: [C.primary],
      chartArea: { fill: { color: C.bg } },
      plotArea:  { fill: { color: C.bg } },
      lineSize: 2.25, lineSmooth: true,
      showLegend: false,
      catAxisLabelColor: C.textMute, catAxisLabelFontSize: 7,
      valAxisLabelColor: C.textMute, valAxisLabelFontSize: 7,
      catAxisLineColor: C.border,    valAxisLineColor: C.border,
      catGridLine: { style: "none" },
      valGridLine: { color: C.border, size: 0.25 },
    });

    ID(s); PAGE(s, 10, "10 / 12");
  }

  // ════════════════════════════════════════════════════════════════════════
  // SLIDE 11 — BUSINESS MODEL
  // ════════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };

    s.addText("10  ·  BUSINESS MODEL", {
      x: 0.5, y: 0.45, w: 4, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true,
      color: C.primary, charSpacing: 6, margin: 0,
    });

    s.addText("Free core.", {
      x: 0.5, y: 0.95, w: 9, h: 0.7,
      fontFace: FONT_SERIF, italic: true, fontSize: 40, color: C.text, margin: 0,
    });
    s.addText("Premium edge.", {
      x: 0.5, y: 1.55, w: 9, h: 0.7,
      fontFace: FONT_SERIF, italic: true, fontSize: 40, color: C.primary, margin: 0,
    });

    // Two tier cards
    const tiers = [
      {
        name: "FREE FOREVER",
        price: "$0",
        unit: "always",
        accent: C.textDim,
        features: [
          "Full Pathway curriculum (29 drills)",
          "Lab — unlimited custom drills",
          "Arena — ranked battles, ELO ladder",
          "Daily streak · weekly leaderboard",
          "AI feedback on every attempt",
        ],
        x: 0.5,
      },
      {
        name: "SPEAKBOLD PRO",
        price: "$9",
        unit: "/ month",
        accent: C.primary,
        features: [
          "Unlimited Aura TTS battle minutes",
          "Body-language video analysis",
          "Custom AI judges (rubric editor)",
          "Spaced-repetition drill scheduling",
          "Priority queue · advanced analytics",
        ],
        x: 5.05,
      },
    ];

    tiers.forEach((t) => {
      s.addShape(pres.shapes.RECTANGLE, {
        x: t.x, y: 2.6, w: 4.45, h: 2.5,
        fill: { color: C.surface }, line: { color: t.accent === C.primary ? C.primary : C.border, width: t.accent === C.primary ? 1.5 : 0.5 },
      });
      s.addText(t.name, {
        x: t.x + 0.3, y: 2.75, w: 4.0, h: 0.3,
        fontFace: FONT_SANS, fontSize: 9, bold: true, color: t.accent, charSpacing: 4, margin: 0,
      });
      s.addText(t.price, {
        x: t.x + 0.3, y: 3.1, w: 2.0, h: 0.85,
        fontFace: FONT_SERIF, italic: true, fontSize: 50, color: C.text, margin: 0,
      });
      s.addText(t.unit, {
        x: t.x + 2.0, y: 3.45, w: 2.0, h: 0.4,
        fontFace: FONT_SANS, fontSize: 12, italic: true, color: C.textMute, margin: 0,
      });
      t.features.forEach((f, i) => {
        const y = 4.05 + i * 0.18;
        s.addText("→", {
          x: t.x + 0.3, y: y - 0.01, w: 0.2, h: 0.2,
          fontFace: FONT_SANS, fontSize: 9, color: t.accent, margin: 0,
        });
        s.addText(f, {
          x: t.x + 0.55, y, w: 3.8, h: 0.2,
          fontFace: FONT_SANS, fontSize: 9, color: C.textDim, margin: 0,
        });
      });
    });

    // B2B note
    s.addText([
      { text: "PLUS B2B  ·  ", options: { color: C.cyan, bold: true } },
      { text: "SpeakBold Teams at $49/seat/mo — universities, sales orgs, comms training.", options: { color: C.textDim, italic: true } },
    ], {
      x: 0.5, y: 5.15, w: 9, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9.5, charSpacing: 2, margin: 0,
    });

    ID(s); PAGE(s, 11, "11 / 12");
  }

  // ════════════════════════════════════════════════════════════════════════
  // SLIDE 12 — THE ASK
  // ════════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };

    s.addText("11  ·  THE ASK", {
      x: 0.5, y: 0.45, w: 4, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true,
      color: C.primary, charSpacing: 6, margin: 0,
    });

    s.addText("Raising", {
      x: 0.5, y: 1.05, w: 9, h: 0.6,
      fontFace: FONT_SERIF, italic: true, fontSize: 28, color: C.textDim, margin: 0,
    });
    s.addText("$1.2M", {
      x: 0.5, y: 1.45, w: 5, h: 1.9,
      fontFace: FONT_SERIF, italic: true, fontSize: 150, color: C.primary, margin: 0,
    });
    s.addText("seed.", {
      x: 0.5, y: 3.05, w: 5, h: 0.7,
      fontFace: FONT_SERIF, italic: true, fontSize: 36, color: C.text, margin: 0,
    });

    s.addText("18 months of runway. Three engineers, two designers, one growth lead.", {
      x: 0.5, y: 3.85, w: 5.2, h: 0.65,
      fontFace: FONT_SANS, fontSize: 12, color: C.textDim, margin: 0,
    });

    // Use of funds — right column
    s.addText("USE OF FUNDS", {
      x: 6.0, y: 1.1, w: 3.6, h: 0.3,
      fontFace: FONT_SANS, fontSize: 9, bold: true, color: C.cyan, charSpacing: 5, margin: 0,
    });

    const fund = [
      { pct: "50%", l: "Product",       d: "Mobile · video analysis · live human duels", c: C.primary },
      { pct: "30%", l: "Growth",        d: "Creator partnerships · campus chapters",     c: C.cyan    },
      { pct: "20%", l: "Team",          d: "Senior ML eng · DesignOps lead",             c: C.gold    },
    ];
    fund.forEach((f, i) => {
      const y = 1.5 + i * 0.85;
      s.addText(f.pct, {
        x: 6.0, y, w: 1.0, h: 0.6,
        fontFace: FONT_SERIF, italic: true, fontSize: 32, color: f.c, margin: 0,
      });
      s.addText(f.l, {
        x: 7.0, y, w: 2.5, h: 0.32,
        fontFace: FONT_SANS, fontSize: 12, bold: true, color: C.text, margin: 0,
      });
      s.addText(f.d, {
        x: 7.0, y: y + 0.32, w: 2.5, h: 0.35,
        fontFace: FONT_SANS, fontSize: 9, italic: true, color: C.textDim, margin: 0,
      });
    });

    // Closing line
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: 4.85, w: 9, h: 0.55,
      fill: { color: C.surface }, line: { color: C.primary, width: 1.25 },
    });
    s.addText([
      { text: "Join us. ",                                             options: { color: C.primary, bold: true } },
      { text: "The next generation of speakers is being trained ", options: { color: C.text } },
      { text: "right now.",                                           options: { color: C.gold, italic: true } },
    ], {
      x: 0.6, y: 4.9, w: 8.8, h: 0.45,
      fontFace: FONT_SERIF, italic: true, fontSize: 16, valign: "middle", margin: 0,
    });

    // Footer contact line — different from corner ID
    s.addText("hello@speakbold.app   ·   speakbold.app", {
      x: 0.5, y: 5.5, w: 9, h: 0.25,
      fontFace: FONT_SANS, fontSize: 9, bold: true, color: C.textMute,
      charSpacing: 4, align: "center", margin: 0,
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  await pres.writeFile({ fileName: "SpeakBold_Pitch.pptx" });
  console.log("✓ SpeakBold_Pitch.pptx written.");
}

build().catch((e) => { console.error(e); process.exit(1); });
