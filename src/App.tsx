import { useEffect, useMemo, useRef, useState } from "react";
import { EtymologyTree } from "./components/EtymologyTree";
import { DetailPanel } from "./components/DetailPanel";
import { buildLayout } from "./lib/layout";
import { TREE } from "./data/etymology";
import { COLOPHON, HERO, STEPS } from "./content/load";

export function App() {
  const layout = useMemo(() => buildLayout(TREE), []);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // scrollytelling: mark the step nearest the middle of the viewport as active
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            setActiveStep(idx);
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const selectedNode = selectedId ? layout.byId.get(selectedId) ?? null : null;
  const selectedAccent = selectedNode?.color ?? "#999";

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-kicker">{HERO.kicker}</div>
        <h1 dangerouslySetInnerHTML={{ __html: HERO.titleHtml }} />
        <p
          className="hero-dek"
          dangerouslySetInnerHTML={{ __html: HERO.bodyHtml }}
        />
        <div className="hero-scroll">↓ scroll</div>
      </header>

      <section className="scrolly">
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
        </div>

        <div className="graphic">
          <div className="graphic-inner">
            <div className="tree-region">
              <EtymologyTree
                focusIds={STEPS[activeStep]?.focus ?? []}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              <DetailPanel
                node={selectedNode?.data ?? null}
                accent={selectedAccent}
                onClose={() => setSelectedId(null)}
              />
            </div>
          </div>
        </div>
      </section>

      <footer
        className="colophon"
        dangerouslySetInnerHTML={{
          __html: `<h2>${COLOPHON.title}</h2>${COLOPHON.bodyHtml}`,
        }}
      />
    </div>
  );
}
