import { Hero } from "@/components/Hero";
import { DailyChallenge } from "@/components/DailyChallenge";
import { PickYourGoal } from "@/components/PickYourGoal";
import { Tracks } from "@/components/Tracks";
import { Techniques } from "@/components/Techniques";
import { Progress } from "@/components/Progress";
import { CTA } from "@/components/CTA";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <h1 className="sr-only">SpeakBold — Build speaking confidence for public speaking, interviews, and impromptu moments</h1>
      <Hero />
      <DailyChallenge />
      <PickYourGoal />
      <Tracks />
      <Techniques />
      <Progress />
      <CTA />
    </main>
  );
};

export default Index;
