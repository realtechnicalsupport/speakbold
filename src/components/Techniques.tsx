const TECHNIQUES = [
  {
    n: "01",
    title: "Breathe low, breathe slow",
    body: "Three diaphragm breaths before you speak. It drops your pitch, steadies your hands, and tells your brain you're safe.",
  },
  {
    n: "02",
    title: "Plant your feet",
    body: "Hip-width apart, weight even. Pacing reads as nerves; stillness reads as authority. Move only with intention.",
  },
  {
    n: "03",
    title: "End on the period",
    body: "Most filler words live where sentences should end. Hit the period, take a breath, then start the next thought.",
  },
  {
    n: "04",
    title: "Look in fours",
    body: "Hold eye contact for one full thought, then move. Four people, four thoughts. The whole room feels seen.",
  },
  {
    n: "05",
    title: "Use the STAR frame",
    body: "Situation, Task, Action, Result. Interview answers stop rambling the moment you give them shape.",
  },
  {
    n: "06",
    title: "Open palms win trust",
    body: "Gestures above the waist with palms visible signal honesty. Pockets and crossed arms close the room.",
  },
];

export const Techniques = () => {
  return (
    <section id="techniques" className="border-t border-border bg-muted/30">
      <div className="container py-24 md:py-32">
        <div className="max-w-2xl mb-16">
          <div className="flex items-center gap-3 text-primary text-xs font-semibold tracking-[0.2em] uppercase mb-6">
            <span className="h-px w-10 bg-primary" />
            Six things great speakers do
          </div>
          <h2 className="font-display text-4xl md:text-6xl font-semibold leading-[1.05] text-balance">
            Small techniques. <em className="text-primary not-italic">Outsized presence.</em>
          </h2>
        </div>

        <div className="grid gap-x-12 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {TECHNIQUES.map((t) => (
            <div key={t.n} className="group">
              <div className="flex items-baseline gap-4 mb-4">
                <span className="font-display text-5xl text-primary/40 font-semibold group-hover:text-primary transition-colors duration-500">
                  {t.n}
                </span>
                <h3 className="font-display text-xl font-semibold leading-tight">{t.title}</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed text-pretty pl-[4.5rem]">{t.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
