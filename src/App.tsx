import { useEffect, useMemo, useRef, useState } from "react";
import { EtymologyTree } from "./components/EtymologyTree";
import { DetailPanel } from "./components/DetailPanel";
import { MobileStory } from "./components/MobileStory";
import { nodeById, senseColor, TREE } from "./data/etymology";
import { CLOSING, HERO, STEPS } from "./content/load";

// Three discrete phases the tree moves through as you scroll. The tree is ONE
// fixed element; its rectangle is set by CSS per `data-phase`, so WITHIN a phase
// it is perfectly stable (scrolling scrolls), and only at a boundary does it
// glide to the next slot. Same size throughout — only its place changes.
//   intro   — full screen, no labels, locked: a calm backdrop for the title
//   story   — right pane, labelled: text steps scroll on the left
//   explore — slide further and the tree takes the full width (small note below),
//             fully interactive to roam
type Phase = "intro" | "story" | "explore";

export function App() {
  const index = useMemo(() => nodeById(TREE), []);
  const [activeStep, setActiveStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  // explore (full-width, free-roam) is now a DELIBERATE choice — you click the
  // invitation at the end of the story, never scroll into it by accident.
  const [exploring, setExploring] = useState(false);
  const [legendOn, setLegendOn] = useState(false); // legend fades in only once the tree has settled
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const storyRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const totalChapters = STEPS.length + CLOSING.length; // steps + closing chapters

  // Mobile gets a completely different, simpler layout (one scrolling column,
  // no sticky tree / modes / zoom) — the scrollytelling choreography fights a
  // small screen. We switch on the SAME 920px breakpoint the CSS uses.
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 920px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 920px)");
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // scrollytelling: mark the step nearest the middle of the viewport as active
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveStep(Number((e.target as HTMLElement).dataset.idx));
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Drive the tree's rectangle CONTINUOUSLY from scroll, so it slides between
  // slots as you scroll (not a one-shot animation). Within a phase the rect is
  // pinned, so scrolling there just scrolls. Phase (for labels/interaction) is
  // derived from the same morph params.
  useEffect(() => {
    let raf = 0;
    const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
    const lerp = (A: number[], B: number[], t: number) => A.map((v, i) => v + (B[i] - v) * t);
    const INTRO = [0, 0, 1, 1]; // full screen — the backdrop
    const STORY = [0.42, 0, 0.58, 1]; // right pane, for the narrative
    const EXPLORE = [0, 0, 1, 0.85]; // full width, with a small note strip below
    const GLIDE = "left .6s ease, top .6s ease, width .6s ease, height .6s ease";
    function update() {
      const stage = stageRef.current;
      const story = storyRef.current?.getBoundingClientRect();
      if (!stage || !story) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (vw <= 920) {
        stage.style.cssText = ""; // hand off to the sticky-banner mobile CSS
        setPhase((p) => (p === "story" ? p : "story"));
        setLegendOn((v) => (v ? v : true));
        return;
      }
      // `animate` lets the rect glide between slots; we turn it OFF only while the
      // intro→story slide is actively tracking scroll (it must follow frame-for-
      // frame). Settled, it stays on so toggling Explore eases in/out smoothly.
      const apply = (r: number[], animate: boolean) => {
        stage.style.position = "fixed";
        stage.style.transition = animate ? GLIDE : "none";
        stage.style.left = `${(r[0] * vw).toFixed(1)}px`;
        stage.style.top = `${(r[1] * vh).toFixed(1)}px`;
        stage.style.width = `${(r[2] * vw).toFixed(1)}px`;
        stage.style.height = `${(r[3] * vh).toFixed(1)}px`;
      };
      // Explore is driven by state, not scroll: opened by the end-of-story
      // invitation (or the Explore toggle), so it never ambushes the reader.
      if (exploring) {
        apply(EXPLORE, true);
        setPhase((p) => (p === "explore" ? p : "explore"));
        setLegendOn((v) => (v ? v : true));
        return;
      }
      const MZ = vh; // each move spans ~one screen of scroll
      const a = clamp((MZ - story.top) / MZ); // intro → story (slide right)
      const sliding = a > 0.002 && a < 0.998; // mid-slide: track scroll, no glide
      apply(lerp(INTRO, STORY, a), !sliding);
      // labels fade in as the slide finishes; the legend waits until fully settled.
      const next: Phase = a >= 0.85 ? "story" : "intro";
      setPhase((p) => (p === next ? p : next));
      setLegendOn((v) => {
        const on = a >= 0.995;
        return v === on ? v : on;
      });
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(() => ((raf = 0), update()));
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [exploring]);

  const selectedNode = selectedId ? index.get(selectedId) ?? null : null;
  const selectedAccent = selectedNode ? senseColor(selectedNode) : "#999";

  // Remember which chapter we left so leaving explore returns to exactly there
  // (not always the last one) — no fighting the zoom-wheel to get back.
  const enteredFromRef = useRef(0);
  function enterExplore() {
    enteredFromRef.current = activeStep;
    setExploring(true);
  }
  function toggleExplore() {
    if (exploring) {
      setExploring(false);
      stepRefs.current[enteredFromRef.current]?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      enterExplore();
    }
  }

  if (mobile) return <MobileStory />;

  return (
    <div className={`page${exploring ? " exploring" : ""}`}>
      <section className="act act-intro">
        <header className="hero">
          <div className="hero-kicker">{HERO.kicker}</div>
          <h1 dangerouslySetInnerHTML={{ __html: HERO.titleHtml }} />
          <p className="hero-dek" dangerouslySetInnerHTML={{ __html: HERO.bodyHtml }} />
          <div className="hero-scroll">↓ scroll</div>
        </header>
      </section>

      <div className="tree-stage" data-phase={phase} ref={stageRef}>
        <div className="tree-region">
          <EtymologyTree
            focusIds={phase === "explore" ? [] : STEPS[activeStep]?.focus ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
            interactive={phase === "explore"}
            showLabels={phase !== "intro"}
            chrome={legendOn}
            exploreSelected={phase === "explore"}
            onToggleExplore={toggleExplore}
          />
          <DetailPanel
            node={selectedNode}
            accent={selectedAccent}
            onClose={() => setSelectedId(null)}
          />
        </div>
      </div>

      <section className="act act-story" ref={storyRef}>
        <div className="narrative">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`step${i === activeStep ? " active" : ""}`}
              data-idx={i}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
            >
              <div className="step-card">
                <div className="step-num">
                  {String(i + 1).padStart(2, "0")} / {totalChapters}
                </div>
                <h2>{s.title}</h2>
                <p dangerouslySetInnerHTML={{ __html: s.bodyHtml }} />
              </div>
            </div>
          ))}

          {/* closing chapters — beyond the family, then the ending notes; each a
              normal step card, continuing the numbering after the steps */}
          {CLOSING.map((c, j) => {
            const idx = STEPS.length + j;
            return (
              <div
                key={`closing-${j}`}
                className={`step${activeStep === idx ? " active" : ""}`}
                data-idx={idx}
                ref={(el) => {
                  stepRefs.current[idx] = el;
                }}
              >
                <div className="step-card">
                  <div className="step-num">
                    {idx + 1} / {totalChapters}
                  </div>
                  <h2>{c.title}</h2>
                  {/* a div, not a <p>: closing chapters can be multi-paragraph
                      (the loader leaves their <p> tags in), which must not nest
                      inside a <p> or the paragraph breaks collapse. */}
                  <div className="step-body" dangerouslySetInnerHTML={{ __html: c.bodyHtml }} />
                  {/* the invitation to roam sits under the last closing chapter:
                      opening the full tree is a deliberate click, never a scroll
                      surprise. It fades out with the story when exploring. */}
                  {j === CLOSING.length - 1 && (
                    <div className="explore-invite">
                      <button className="explore-cta" onClick={enterExplore}>
                        Explore the whole tree →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {exploring && (
        <div className="explore-note">Now explore on your own. Click any word to see its sources.</div>
      )}

      <footer className="authorbar">
        By{" "}
        <a href="https://p.migdal.pl/" target="_blank" rel="noreferrer">
          Piotr Migdał
        </a>{" "}
        · Source &amp; data on{" "}
        <a href="https://github.com/stared/tree-of-tree" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  );
}
