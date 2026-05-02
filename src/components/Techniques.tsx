const TECHNIQUES = [
  {
    title: "Breathe low, breathe slow",
    body: "Three diaphragm breaths before you speak. It drops your pitch and steadies your voice.",
  },
  {
    title: "Plant your feet",
    body: "Hip-width apart, weight even. Stillness reads as authority. Move only with intention.",
  },
  {
    title: "End on the period",
    body: "Most filler words live where sentences should end. Hit the period, then breathe.",
  },
  {
    title: "Look in fours",
    body: "Hold eye contact for one full thought, then move. The whole room feels seen.",
  },
  {
    title: "Use the STAR frame",
    body: "Situation, Task, Action, Result. Interview answers stop rambling with this structure.",
  },
  {
    title: "Open palms win trust",
    body: "Gestures above the waist with palms visible signal honesty and openness.",
  },
];

export const Techniques = () => {
  return (
    <section className="py-16 sm:py-24">
      <div className="container">
        {/* Section header */}
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="inline-block px-3 py-1 text-xs font-medium text-accent bg-accent/10 rounded-full mb-4">
            Pro Tips
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Six things great speakers do
          </h2>
          <p className="text-muted-foreground">
            Small techniques with outsized impact.
          </p>
        </div>

        {/* Techniques grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {TECHNIQUES.map((technique, i) => (
            <div 
              key={i} 
              className="p-5 bg-card border border-border rounded-xl"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl font-bold text-accent/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-semibold">{technique.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {technique.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
