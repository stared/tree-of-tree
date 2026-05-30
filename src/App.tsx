import { useEffect, useMemo, useRef, useState } from "react";
import { EtymologyTree } from "./components/EtymologyTree";
import { DetailPanel } from "./components/DetailPanel";
import { nodeById, senseColor, TREE } from "./data/etymology";
import { COLOPHON, HERO, STEPS } from "./content/load";

// Three discrete phases the tree moves through as you scroll. The tree is ONE
// fixed element; its rectangle is set by CSS per `data-phase`, so WITHIN a phase
// it is perfectly stable (scrolling scrolls), and only at a boundary does it
// glide to the next slot. Same size throughout — only its place changes.
//   intro   — full screen, no labels, locked: a calm backdrop for the title
//   story   — right pane, labelled, clickable: text steps scroll on the left
//   explore — full screen, fully interactive: just the tree, to roam
type Phase = "intro" | "story" | "explore";

export function App() {
  const index = useMemo(() => nodeById(TREE), []);
  const [activeStep, setActiveStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const storyRef = useRef<HTMLElement>(null);
  const exploreRef = useRef<HTMLElement>(null);

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

  // pick the phase from scroll position (the tree's CSS does the gliding)
  useEffect(() => {
    let raf = 0;
    function update() {
      // mobile: no choreography — the tree is a static labelled banner that the
      // page scrolls past, so keep it non-interactive ("story") and let drags scroll
      if (window.innerWidth <= 920) {
        setPhase((p) => (p === "story" ? p : "story"));
        return;
      }
      const vh = window.innerHeight;
      const story = storyRef.current?.getBoundingClientRect();
      const explore = exploreRef.current?.getBoundingClientRect();
      if (!story || !explore) return;
      const next: Phase = explore.top <= vh * 0.5 ? "explore" : story.top <= vh * 0.45 ? "story" : "intro";
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

      <div className="tree-stage" data-phase={phase}>
        <div className="tree-region">
          <EtymologyTree
            focusIds={phase === "explore" ? [] : STEPS[activeStep]?.focus ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
            interactive={phase === "explore"}
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

          {/* the colophon rides along as the closing card, then we hand off to explore */}
          <div
            className="step"
            data-idx={STEPS.length}
            ref={(el) => {
              stepRefs.current[STEPS.length] = el;
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

      <section className="act act-explore" ref={exploreRef} aria-hidden="true" />
    </div>
  );
}
