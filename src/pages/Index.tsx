import { Hero } from "@/components/Hero";
import { Progress } from "@/components/Progress";
import { CTA } from "@/components/CTA";
import { ImpactBanner } from "@/components/ImpactBanner";
import { WhyItMatters } from "@/components/WhyItMatters";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <h1 className="sr-only">SpeakBold — Build speaking confidence for public speaking, interviews, and impromptu moments</h1>
      <Hero />
      <ImpactBanner />
      <WhyItMatters />
      <Progress />
      <CTA />
    </main>
  );
};

export default Index;
