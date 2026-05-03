import { useState } from "react";
import { Link } from "react-router-dom";
import { Mic, MessageSquare, Briefcase, Activity, Lightbulb, Trophy, Sparkles, ArrowRight, Play, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const SLIDES = [
  {
    title: "SpeakBold",
    subtitle: "Build speaking confidence, daily.",
    hero: true,
    content: null,
  },
  {
    title: "The Problem",
    points: [
      "75% of people fear public speaking more than death",
      "Most practice apps are over-complicated or expensive", 
      "No daily habit-building tools that actually work",
    ],
    icon: "problem",
  },
  {
    title: "The Solution",
    points: [
      "5-minute daily speaking practice",
      "Pick a track, hit start, speak",
      "No fluff. Just reps.",
    ],
    icon: "solution",
  },
  {
    title: "4 Tracks",
    tracks: [
      { name: "Public Speaking", icon: Mic, desc: "Vocal drills with recording" },
      { name: "Impromptu", icon: MessageSquare, desc: "60-second random prompts" },
      { name: "Interviews", icon: Briefcase, desc: "AI-generated questions" },
      { name: "Body Language", icon: Activity, desc: "Confidence through posture" },
    ],
  },
  {
    title: "Key Features",
    features: [
      { icon: Play, text: "Timer independent of recording" },
      { icon: Mic, text: "Save recordings to your account" },
      { icon: Sparkles, text: "AI content via Groq (free)" },
      { icon: Lightbulb, text: "Daily challenges with streaks" },
      { icon: Trophy, text: "Mobile-optimized with bottom nav" },
    ],
  },
  {
    title: "Tech Stack",
    tech: ["React + TypeScript", "Vite", "Tailwind CSS", "Supabase", "Groq API", "Vercel"],
  },
  {
    title: "Market Validation",
    points: [
        "Built with Vite + React (rapid prototyping)",
      "Free tier available immediately",
      "Mobile-first design for daily habits",
      "Open source: github.com/realtechnicalsupport/speakbold",
    ],
  },
  {
    title: "Try It Now",
    cta: true,
    content: null,
  },
];

export const PitchDeck = () => {
  const [slide, setSlide] = useState(0);
  const total = SLIDES.length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
            <span className="grid place-items-center h-9 w-9 rounded-full bg-warm text-primary-foreground">
              <Mic className="h-4 w-4" />
            </span>
            <span className="font-display text-xl font-semibold leading-none">
              Speak<em className="not-italic text-primary">Bold</em>
            </span>
          </Link>
          <span className="text-sm text-muted-foreground">Pitch Deck</span>
        </div>
      </header>

      {/* Slide */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl animate-fade-in">
          {SLIDES[slide].hero ? (
            <div className="text-center space-y-6">
              <div className="h-24 w-24 mx-auto rounded-full bg-warm grid place-items-center mb-6">
                <Mic className="h-12 w-12 text-primary-foreground" />
              </div>
              <h1 className="font-display text-6xl md:text-8xl font-bold leading-tight">
                Speak<em className="text-primary">Bold</em>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground">
                {SLIDES[slide].subtitle}
              </p>
              <Button size="lg" className="mt-4" asChild>
                <Link to="/">Try It Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          ) : SLIDES[slide].cta ? (
            <div className="text-center space-y-6">
              <div className="h-20 w-20 mx-auto rounded-full bg-primary/10 grid place-items-center mb-6">
                <Play className="h-10 w-10 text-primary" />
              </div>
              <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight">
                Ready to speak <em className="text-primary">boldly?</em>
              </h1>
              <div className="flex gap-4 justify-center mt-6">
                <Button size="lg" asChild>
                  <Link to="/">Try SpeakBold <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="https://github.com/realtechnicalsupport/speakbold" target="_blank">View on GitHub</a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <h2 className="font-display text-4xl md:text-6xl font-bold leading-tight">
                {SLIDES[slide].title}
              </h2>

              {SLIDES[slide].points && (
                <ul className="space-y-4">
                  {SLIDES[slide].points!.map((p, i) => (
                    <li key={i} className="flex items-start gap-3 text-lg md:text-xl text-muted-foreground">
                      <Check className="h-6 w-6 text-primary shrink-0 mt-1" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}

              {SLIDES[slide].tracks && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SLIDES[slide].tracks!.map((t, i) => {
                    const Icon = t.icon;
                    return (
                      <Card key={i} className="p-6 border-border bg-card-gradient">
                        <Icon className="h-8 w-8 text-primary mb-3" />
                        <h3 className="font-display text-xl font-semibold mb-2">{t.name}</h3>
                        <p className="text-muted-foreground">{t.desc}</p>
                      </Card>
                    );
                  })}
                </div>
              )}

              {SLIDES[slide].features && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {SLIDES[slide].features!.map((f, i) => {
                    const Icon = f.icon;
                    return (
                      <div key={i} className="flex items-center gap-3 p-4 border border-border rounded-xl bg-card-gradient">
                        <Icon className="h-5 w-5 text-primary shrink-0" />
                        <span className="text-sm md:text-base">{f.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {SLIDES[slide].tech && (
                <div className="flex flex-wrap gap-2">
                  {SLIDES[slide].tech!.map((t, i) => (
                    <span key={i} className="px-4 py-2 rounded-full border border-primary/30 text-primary text-sm">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Navigation */}
      <footer className="border-t border-border">
        <div className="container flex items-center justify-between py-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSlide(Math.max(0, slide - 1))}
            disabled={slide === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {slide + 1} / {total}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSlide(Math.min(total - 1, slide + 1))}
            disabled={slide === total - 1}
          >
            Next
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default PitchDeck;