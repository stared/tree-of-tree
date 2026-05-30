import { useEffect, useMemo, useRef, useState } from "react";
import { EtymologyTree } from "./components/EtymologyTree";
import { DetailPanel } from "./components/DetailPanel";
import { nodeById, senseColor, TREE } from "./data/etymology";
import { COLOPHON, HERO, STEPS } from "./content/load";

// Three discrete phases the tree moves through as you scroll. The tree is ONE
// fixed element; its rectangle is set by CSS per `data-phase`, so WITHIN a phase
// it is perfectly stable (scrolling scrolls), and only at a boundary does it
// glide to the next slot. Same size throughout — only its place changes.
//   intro — full screen, no labels, locked: a calm backdrop for the title
//   story — right pane, labelled: text steps scroll on the left, then the tree
//           frees up to roam in place once you reach the closing card
type Phase = "intro" | "story";

export function App() {
  const index = useMemo(() => nodeById(TREE), []);
  const [activeStep, setActiveStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const storyRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // the closing "Beyond PIE tree" card is the last one; reaching it frees the tree
  const lastIdx = STEPS.length;

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
    const STORY = [0.42, 0, 0.58, 1]; // right pane (and it stays here to the end)
    function update() {
      const stage = stageRef.current;
      const story = storyRef.current?.getBoundingClientRect();
      if (!stage || !story) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (vw <= 920) {
        stage.style.cssText = ""; // hand off to the sticky-banner mobile CSS
        setPhase((p) => (p === "story" ? p : "story"));
        return;
      }
      const MZ = vh; // the intro→story move spans ~one screen of scroll
      const a = clamp((MZ - story.top) / MZ);
      const r = lerp(INTRO, STORY, a);
      stage.style.position = "fixed";
      stage.style.left = `${(r[0] * vw).toFixed(1)}px`;
      stage.style.top = `${(r[1] * vh).toFixed(1)}px`;
      stage.style.width = `${(r[2] * vw).toFixed(1)}px`;
      stage.style.height = `${(r[3] * vh).toFixed(1)}px`;
      // labels fade in only as the move finishes — the "old root" step arriving
      const next: Phase = a >= 0.85 ? "story" : "intro";
      setPhase((p) => (p === next ? p : next));
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
            focusIds={activeStep >= lastIdx ? [] : STEPS[activeStep]?.focus ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
            interactive={activeStep >= lastIdx}
            showLabels={phase !== "intro"}
            chrome={phase !== "intro"}
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
                  {String(i + 1).padStart(2, "0")} / {STEPS.length}
                </div>
                <h2>{s.title}</h2>
                <p dangerouslySetInnerHTML={{ __html: s.bodyHtml }} />
              </div>
            </div>
          ))}

          {/* closing card — the words beyond this family; reaching it frees the tree */}
          <div
            className="step"
            data-idx={lastIdx}
            ref={(el) => {
              stepRefs.current[lastIdx] = el;
            }}
          >
            <div
              className="step-card colophon-card"
              dangerouslySetInnerHTML={{
                __html: `<h2>${COLOPHON.title}</h2>${COLOPHON.bodyHtml}`,
              }}
            />
          </div>
        </div>
      </section>

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
