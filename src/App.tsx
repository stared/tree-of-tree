import { useEffect, useMemo, useRef, useState } from "react";
import { EtymologyTree } from "./components/EtymologyTree";
import { DetailPanel } from "./components/DetailPanel";
import { MobileStory } from "./components/MobileStory";
import { nodeById, senseColor, TREE } from "./data/etymology";
import { COLOPHON, HERO, STEPS } from "./content/load";

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
  const [legendOn, setLegendOn] = useState(false); // legend fades in only once the tree has settled
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const storyRef = useRef<HTMLElement>(null);
  const exploreRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastIdx = STEPS.length; // the "Beyond PIE tree" card sits after the steps
  const totalChapters = STEPS.length + 1; // steps + the "Beyond" closing chapter

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
    function update() {
      const stage = stageRef.current;
      const story = storyRef.current?.getBoundingClientRect();
      const explore = exploreRef.current?.getBoundingClientRect();
      if (!stage || !story || !explore) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (vw <= 920) {
        stage.style.cssText = ""; // hand off to the sticky-banner mobile CSS
        setPhase((p) => (p === "story" ? p : "story"));
        setLegendOn((v) => (v ? v : true));
        return;
      }
      const MZ = vh; // each move spans ~one screen of scroll
      const a = clamp((MZ - story.top) / MZ); // intro → story (slide right)
      const b = clamp((MZ - explore.top) / MZ); // story → explore (open to full width)
      const r = b > 0 ? lerp(STORY, EXPLORE, b) : lerp(INTRO, STORY, a);
      stage.style.position = "fixed";
      stage.style.left = `${(r[0] * vw).toFixed(1)}px`;
      stage.style.top = `${(r[1] * vh).toFixed(1)}px`;
      stage.style.width = `${(r[2] * vw).toFixed(1)}px`;
      stage.style.height = `${(r[3] * vh).toFixed(1)}px`;
      // labels fade in as the slide finishes; the legend waits until fully
      // settled so it never slides; the tree frees to roam once full-width.
      const next: Phase = b >= 0.95 ? "explore" : a >= 0.85 ? "story" : "intro";
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
  }, []);

  const selectedNode = selectedId ? index.get(selectedId) ?? null : null;
  const selectedAccent = selectedNode ? senseColor(selectedNode) : "#999";

  // The full-view toggle: engaged automatically once you scroll to the end;
  // clicking it when engaged scrolls back to the last point (the way out, so you
  // never have to fight the zoom-wheel to leave).
  function toggleExplore() {
    if (phase === "explore") {
      stepRefs.current[lastIdx]?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      exploreRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (mobile) return <MobileStory />;

  return (
    <div className="page">
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

          {/* closing chapter — the words beyond this family; a normal step card */}
          <div
            className={`step${activeStep === lastIdx ? " active" : ""}`}
            data-idx={lastIdx}
            ref={(el) => {
              stepRefs.current[lastIdx] = el;
            }}
          >
            <div className="step-card">
              <div className="step-num">
                {totalChapters} / {totalChapters}
              </div>
              <h2>{COLOPHON.title}</h2>
              <p dangerouslySetInnerHTML={{ __html: COLOPHON.bodyHtml }} />
            </div>
          </div>
        </div>
      </section>

      {/* slide past the last chapter and the tree opens to full width to roam */}
      <section className="act act-explore" ref={exploreRef} aria-hidden="true" />
      {phase === "explore" && (
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
