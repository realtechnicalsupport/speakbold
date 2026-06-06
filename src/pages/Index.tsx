import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Hero } from "@/components/Hero";
import { Progress } from "@/components/Progress";
import { CTA } from "@/components/CTA";
import { ImpactBanner } from "@/components/ImpactBanner";
import { WhyItMatters } from "@/components/WhyItMatters";
import { BodyLanguageHero } from "@/components/BodyLanguageHero";

// Landing sections, in scroll order. Labels drive the right-side dot nav.
// The live Body-Language studio sits second — the app's strongest, most
// SDG-4-aligned feature, in front of every cold-open visitor/judge.
const SECTIONS = [
  { id: "intro",   label: "Intro",   Component: Hero },
  { id: "studio",  label: "Live Studio", Component: BodyLanguageHero },
  { id: "impact",  label: "Impact",  Component: ImpactBanner },
  { id: "mission", label: "Mission", Component: WhyItMatters },
  { id: "ranks",   label: "Ranks",   Component: Progress },
  { id: "start",   label: "Start",   Component: CTA },
] as const;

const Index = () => {
  const containerRef = useRef<HTMLElement | null>(null);
  const sectionRefs  = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);

  // Track which section is centred in the snap viewport so the dot-nav can
  // highlight it. Uses the snap container itself as the IntersectionObserver
  // root so it stays correct whether the document or the container scrolls.
  useEffect(() => {
    const root = containerRef.current;
    const els = sectionRefs.current.filter(Boolean) as HTMLElement[];
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        // Pick the most-visible section currently intersecting.
        let best = -1;
        let bestRatio = 0;
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > bestRatio) {
            bestRatio = e.intersectionRatio;
            best = els.indexOf(e.target as HTMLElement);
          }
        }
        if (best !== -1) setActive(best);
      },
      { root, threshold: [0.4, 0.6, 0.8] }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const scrollTo = (i: number) => {
    sectionRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <h1 className="sr-only">
        SpeakBold — Build speaking confidence for public speaking, interviews, and impromptu moments
      </h1>

      {/*
        Snap scroll container. On md+ it becomes a full-height, mandatory
        scroll-snap viewport so each section locks into place as the user
        scrolls. On mobile it falls back to ordinary document flow (snap can
        trap on small screens / tall content). Reduced-motion users get plain
        scrolling — the `.snap-landing` class is neutralised in index.css.
      */}
      <main
        ref={containerRef}
        className="snap-landing isolate relative min-h-screen bg-background md:h-[100dvh] md:snap-y md:snap-mandatory md:overflow-y-auto md:scroll-smooth"
      >
        {/* Ambient orange gradient blobs — passive, slow drift. Fixed to the
            viewport so they sit still behind the snapping sections. -z-10 keeps
            them above the solid page background but behind all section content. */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-15%] left-[-12%] w-[60%] h-[60%] rounded-full blur-[120px] mix-blend-screen animate-blob bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.4),hsl(32_100%_55%/0.2)_45%,transparent_70%)]" />
          <div className="absolute bottom-[-20%] right-[-12%] w-[55%] h-[55%] rounded-full blur-[120px] mix-blend-screen animate-blob bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.28),transparent_70%)] [animation-delay:-11s] [animation-duration:28s]" />
        </div>

        {SECTIONS.map(({ id, Component }, i) => (
          <section
            key={id}
            id={id}
            ref={(el) => { sectionRefs.current[i] = el; }}
            className="md:min-h-[100dvh] md:snap-start md:snap-always md:flex md:flex-col md:justify-center"
          >
            <Component />
          </section>
        ))}
      </main>

      {/* ── Right-side dot navigation (desktop only) ──────────────────────── */}
      <nav
        aria-label="Section navigation"
        className="hidden md:flex fixed right-6 lg:right-8 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-4"
      >
        {SECTIONS.map(({ id, label }, i) => {
          const isActive = active === i;
          return (
            <button
              key={id}
              onClick={() => scrollTo(i)}
              aria-label={`Go to ${label}`}
              aria-current={isActive ? "true" : undefined}
              className="group relative flex items-center justify-center h-3 w-3"
            >
              {/* Hover label */}
              <span className="pointer-events-none absolute right-6 whitespace-nowrap rounded-full bg-foreground/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-background opacity-0 translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
                {label}
              </span>

              {/* Dot — elongates into a pill when active */}
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={
                  isActive
                    ? "block h-3 w-3 rounded-full bg-primary shadow-glow shadow-primary/40"
                    : "block h-1.5 w-1.5 rounded-full bg-foreground/25 group-hover:bg-foreground/50 transition-colors"
                }
              />
            </button>
          );
        })}
      </nav>
    </>
  );
};

export default Index;
