# SpeakBold — UI Overhaul Plan

**Direction:** Stripe-polished premium · **Scope:** Landing + shared shell first · **Effects:** Remove all glitch / scanline / grain
**Constraint:** Keep the existing color scheme — orange `#FF4D00` (`hsl(18 100% 50%)`) + charcoal dark (`hsl(240 5% 11%)`).

---

## 1. Vision

Move SpeakBold from its current **aggressive cyberpunk-editorial** look (extreme uppercase letter-spacing, glitch text, scanlines, grain, infinite float animations) to a **Stripe-polished premium** aesthetic:

- **Gradient mesh** backgrounds — orange bleeding softly into charcoal, no hard edges
- **Glossy cards** — subtle top highlight, gradient hairline border, soft backdrop
- **Soft glows + layered shadows** — depth through light, not borders
- **Generous whitespace** and a disciplined type scale
- **Smooth 300ms motion** with spring physics on interactive elements
- **One primary CTA per view**, everything else visually subordinate

The orange stays as the single accent. The personality shifts from "shouting" to "confident and refined."

---

## 2. Design tokens (foundation — do this first)

All token work lives in `src/index.css` (CSS variables + utility layer) and `tailwind.config.ts`.

### 2.1 Color variables (`:root` / `.dark` in index.css)
Keep existing hues. **Add** the missing tokens the Tailwind config already references but that aren't defined:

```css
--primary-glow: 18 100% 60%;   /* lighter orange for glow/gradient stops */
--surface-1: 240 5% 13%;        /* raised card */
--surface-2: 240 5% 16%;        /* hovered/elevated card */
--surface-glass: 240 5% 13% / 0.7;
```
Audit the config for other referenced-but-undefined vars (`--sidebar-*`, `--popover-*`) and either define or remove them.

### 2.2 Gradient mesh utilities (new, replaces `bg-waves` / scanlines)
```css
.bg-mesh {
  background:
    radial-gradient(60% 50% at 15% 0%, hsl(var(--primary) / 0.18), transparent 60%),
    radial-gradient(50% 40% at 100% 10%, hsl(var(--primary-glow) / 0.10), transparent 55%),
    radial-gradient(80% 60% at 50% 100%, hsl(var(--primary) / 0.06), transparent 70%),
    hsl(var(--background));
}
.bg-mesh-soft { /* lighter variant for inner pages */ }
```

### 2.3 Premium shadow + glow scale
```css
--shadow-sm:  0 1px 2px rgb(0 0 0 / 0.20);
--shadow-md:  0 4px 16px rgb(0 0 0 / 0.25);
--shadow-lg:  0 12px 40px rgb(0 0 0 / 0.35);
--shadow-glow: 0 0 40px hsl(var(--primary) / 0.35);   /* refine existing */
--shadow-card: 0 1px 0 hsl(0 0% 100% / 0.06) inset, 0 8px 30px rgb(0 0 0 / 0.30);
```
Replace the current single hard `shadow-glow` usage with this graduated scale (`elevation-consistent` rule).

### 2.4 Glossy card utility (replaces `.glass-card` / `.grain`)
```css
.card-premium {
  background: linear-gradient(180deg, hsl(var(--surface-1)) 0%, hsl(var(--background)) 100%);
  border: 1px solid transparent;
  background-clip: padding-box;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  position: relative;
}
.card-premium::before { /* gradient hairline border via mask */ }
.card-premium::after  { /* subtle top sheen highlight */ }
```

### 2.5 Radius scale (tighten the current 2rem default)
Current `--radius: 2rem` (32px) reads as "bubbly," not premium. Move to a refined scale:
```css
--radius-sm: 8px;  --radius-md: 12px;  --radius-lg: 16px;  --radius-xl: 24px;
/* pill (9999px) stays for buttons */
```
Cards → `--radius-lg/xl`. Buttons stay pill. This single change does a lot of the "premium" lift.

### 2.6 Typography
Three font families are currently imported (Outfit, Plus Jakarta Sans, Inter) but the config references "Syne" (undefined). Consolidate:

| Role | Font | Weights | Notes |
|---|---|---|---|
| Display / headings | **Outfit** | 600 / 700 | Drop the italic-serif glitch treatment. Tight tracking `-0.02em`, never uppercase for headings. |
| Body / UI | **Inter** | 400 / 500 / 600 | The premium SaaS standard — already imported. Becomes the workhorse. |

Type scale (replace ad-hoc `text-[10px]`, `text-[140px]`, etc.):
`12 · 14 · 16 · 18 · 20 · 24 · 32 · 48 · 64 · 80`
- Body min **16px** (`readable-font-size`), line-height **1.5–1.6** (`line-height`)
- Hero display caps at ~80px desktop / ~48px mobile (down from 140px)
- **Remove `font-display: 'Syne'`** from config or import Syne — fix the mismatch.

### 2.7 Motion tokens
```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--dur-fast: 150ms; --dur: 250ms; --dur-slow: 350ms;
```
Standard: enter `ease-out` 250–350ms, exit ~60–70% of enter (`exit-faster-than-enter`), interactive press scale 0.97 (`scale-feedback`), all gated behind the existing `prefers-reduced-motion` rule.

---

## 3. Effects removal (delete pass)

Per the "remove all" decision, strip these globally:

| Effect | Where | Action |
|---|---|---|
| Glitch text layers | `Hero.tsx` (two `motion.span` "Bold." duplicates) | Delete both layers |
| Scanlines | `App.tsx` (the `bg-[linear-gradient(...)] z-[100]` div) | Delete |
| Grain texture | `index.css` `.grain` + all `<div className="grain" />` usages (OnboardingModal, RecorderPanel, etc.) | Delete class + every instance |
| `bg-waves` animated SVG | `index.css` + `Hero.tsx` | Replace with `.bg-mesh` |
| Infinite `animate-float` / `animate-drift` / `animate-pulse-subtle` | `App.tsx` blobs, `index.css` keyframes | Already mostly removed in Phase 2; finish removal, keep only static mesh |
| Extreme letter-spacing `tracking-[0.3em]`–`[0.6em]` | Header nav, buttons, labels app-wide | Reduce to `tracking-wide` on labels, `tracking-tight` on headings |

Grep targets: `grain`, `tracking-\[0\.[3-6]`, `animate-float`, `animate-drift`, `bg-waves`, `scanline`.

---

## 4. Shared shell

### 4.1 `Button` (`src/components/ui/button.tsx`)
Rework variants for the polished look:
- **`default`** → orange fill, `--shadow-glow` on hover, subtle gradient (`linear-gradient(180deg, primary-glow, primary)`), press scale 0.97
- **`outline`** → 1px primary/30 border, fills `primary/5` on hover (keep)
- **Delete** `hero` and `spotlight` variants (they bake in `uppercase tracking-[0.2em]` — anti-pattern). Replace usages with `default` / `outline` + `size="lg"/"xl"`.
- All sizes already meet 44px min-height ✓ (`touch-target-size`)

### 4.2 `SiteHeader` (`src/components/SiteHeader.tsx`)
- Nav links: `tracking-[0.4em]` uppercase → **sentence case, `tracking-tight`, `opacity-60` inactive / `opacity-100` active** (`nav-state-active`). Keep the `layoutId` underline (it's good).
- Header bg: `glass` → translucent charcoal with `backdrop-blur` + bottom hairline; add a faint `--shadow-md` on scroll.
- Logo: keep the orange mic dot, drop italic; pair with Inter wordmark.
- Mesh-aware: header sits above `.bg-mesh`, so use `bg-background/70 backdrop-blur-xl`.

### 4.3 Card system
Introduce `.card-premium` (§2.4) and migrate landing cards to it. Establish the elevation scale so all cards/modals/sheets share consistent shadows.

### 4.4 Spacing rhythm
Adopt 4/8 scale section padding tiers: `py-16 / py-24 / py-32` by hierarchy (`section-spacing-hierarchy`). Container max-width stays `1320px` (already set), gutters `1.5rem` mobile → wider on desktop.

---

## 5. Landing page — section by section

Composition stays: `Hero → ImpactBanner → WhyItMatters → Progress → CTA`.

### 5.1 `Hero.tsx`
- **Background:** `.bg-mesh` (orange→charcoal gradient mesh) replacing animated SVG waves + glow blobs
- **Headline:** "Speak Bold." kept but **clean** — Outfit 700, ~80px, no glitch, no italic drama; optional single orange word
- **Subhead:** already good ("Real practice. Instant AI feedback. Become a confident speaker — free.")
- **CTAs:** primary "Get started" (orange fill + glow), secondary "Watch demo" / "Practice now" (outline). One clear primary (`primary-action`).
- **Below CTAs:** two glossy `.card-premium` preview tiles (e.g. "AI feedback" + "Live Arena") with soft glow — the Stripe "glossy card" motif
- Entrance: staggered fade-up 30–50ms (`stagger-sequence`), reduced-motion safe

### 5.2 `ImpactBanner.tsx`
- Convert to a **stat strip** on a subtle mesh band: 3–4 metrics (e.g. "4 AI coaches · 100% free · instant feedback"), tabular figures (`number-tabular`), generous spacing. Drop any uppercase shouting.

### 5.3 `WhyItMatters.tsx`
- **Bento-ish grid** of glossy cards (2×2 or 3-up), each with a Lucide icon in an orange-tint chip, a short heading (Outfit), and body copy at `opacity-70` min (`contrast-readability`).
- Soft shadow + gradient hairline, hover lifts with `--shadow-lg` + 1.02 scale.

### 5.4 `Progress.tsx`
- Showcase the product: a polished mock of the drill/feedback UI inside a glossy device-frame card with a soft glow halo behind it (Stripe's "product on a pedestal"). Static image/mock, no infinite motion.

### 5.5 `CTA.tsx`
- Full-width mesh panel, large headline, single orange "Get started free" button with glow. Footer below with sentence-case links (kill the uppercase `tracking-widest`).

---

## 6. Motion system

- Global tokens from §2.7; one rhythm across the app (`motion-consistency`)
- Page/section reveals: fade-up `ease-out` 300ms, stagger children
- Interactive: press scale 0.97, hover lift on cards, smooth color transitions 150ms
- Modals/sheets animate from trigger (scale+fade), scrim 40–60% (`modal-motion`, `scrim`)
- Everything respects `prefers-reduced-motion` (rule already in CSS from Phase 2)
- Drop all `repeat: Infinity` animations on the landing/shell (perf + polish)

---

## 7. Quality gates (verify before "done")

From the UI/UX skill Quick Reference — CRITICAL/HIGH first:
- [ ] Text contrast ≥ 4.5:1 on mesh backgrounds (test orange-on-charcoal and body grays) — `color-contrast`
- [ ] Visible focus rings on all interactive elements — `focus-states`
- [ ] Touch targets ≥ 44px — `touch-target-size`
- [ ] No layout shift from gradient/mesh or image swaps (CLS < 0.1) — `content-jumping`
- [ ] Body ≥ 16px, line-height 1.5+ — `readable-font-size`, `line-height`
- [ ] One primary CTA per section — `primary-action`
- [ ] `prefers-reduced-motion` disables mesh/scale animations — `reduced-motion`
- [ ] Mobile 375px + landscape verified, no horizontal scroll — `horizontal-scroll`
- [ ] Semantic color tokens, no raw hex in components — `color-semantic`
- [ ] Dark mode contrast checked independently (it's the only mode here)

---

## 8. Execution order

**Phase A — Tokens & cleanup (foundation, no visual regressions yet)**
1. Add/fix CSS variables (§2.1), gradient mesh (§2.2), shadow scale (§2.3), glossy card (§2.4), radius scale (§2.5), motion tokens (§2.7)
2. Fix font config mismatch (Syne → Outfit/Inter), wire type scale (§2.6)
3. Effects deletion pass (§3)

**Phase B — Shell**
4. `Button` variant rework (§4.1)
5. `SiteHeader` redesign (§4.2)
6. Migrate to `.card-premium` + elevation scale (§4.3), spacing rhythm (§4.4)

**Phase C — Landing**
7. `Hero` (§5.1) → `ImpactBanner` (§5.2) → `WhyItMatters` (§5.3) → `Progress` (§5.4) → `CTA` (§5.5)

**Phase D — Verify**
8. Run §7 quality gates on 375px / 768px / 1320px; `npx tsc --noEmit`; visual pass in browser

**Files touched:** `src/index.css`, `tailwind.config.ts`, `src/components/ui/button.tsx`, `src/components/SiteHeader.tsx`, `src/App.tsx`, `src/components/Hero.tsx`, `src/components/ImpactBanner.tsx`, `src/components/WhyItMatters.tsx`, `src/components/Progress.tsx`, `src/components/CTA.tsx`, plus grain/grep cleanup across `OnboardingModal.tsx`, `RecorderPanel.tsx`.

---

## 9. Out of scope (later rollout)

Once landing + shell land and the token system is proven, roll the same tokens/cards/motion into the app pages: **Pathway, Arena, Lab, Profile, Leaderboard, OnboardingModal, TutorialOverlay**. These reuse the foundation from Phase A, so each becomes a styling pass rather than a redesign. This pairs naturally with the pending **Phase 5** refactor (decomposing `Arena.tsx`).
