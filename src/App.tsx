import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EtymologyTree } from "./components/EtymologyTree";
import { DetailPanel } from "./components/DetailPanel";
import { buildLayout } from "./lib/layout";
import { SENSES, TREE, type SenseId } from "./data/etymology";

interface Step {
  key: string;
  focus: string[];
  title: string;
  body: ReactNode;
}

const STEPS: Step[] = [
  {
    key: "seed",
    focus: [],
    title: "One seed",
    body: (
      <>
        Every word in this canopy grew from a single Proto-Indo-European root,{" "}
        <b>*deru- / *dóru-</b>, spoken maybe 5,000–6,000 years ago. It meant two
        things at once: <i>“to be firm, solid, steadfast”</i> and, as a noun,{" "}
        <i>“tree, wood.”</i> Those two senses — <b>firmness</b> and <b>wood</b> —
        are the trunk from which everything else splits.
      </>
    ),
  },
  {
    key: "tree",
    focus: ["pgmc-trewa"],
    title: "The literal branch → tree",
    body: (
      <>
        In Germanic the root’s tree-sense became <b>*trewą</b>, then Old English{" "}
        <b>trēow</b>, then simply <b>tree</b>. The same form survives as Gothic{" "}
        <i>triu</i> and Old Norse <i>tré</i>. (German <i>Baum</i> is a different
        word entirely — see <i>beam</i>.)
      </>
    ),
  },
  {
    key: "faith",
    focus: ["pgmc-treuwaz", "pgmc-trausta"],
    title: "Firmness became faith → true, truth, trust",
    body: (
      <>
        The root’s <i>other</i> sense — “firm, steadfast” — gave Germanic{" "}
        <b>*treuwaz</b> “having good faith.” From it: <b>true</b>, <b>truth</b>,
        its doublet <b>troth</b> (and <b>betroth</b>), <b>trow</b>, even{" "}
        <b>truce</b>. A sibling, <b>*traustą</b> “firm, strong,” gave Old Norse{" "}
        <i>traust</i> → English <b>trust</b>, and German <i>Trost</i> “comfort.”
        <br />
        <small>
          A caution: this is shared <i>ancestry</i>, not identity. “True” doesn’t
          literally mean “tree” — both just descend from “be firm.”
        </small>
      </>
    ),
  },
  {
    key: "objects",
    focus: ["pgmc-trugaz", "pgmc-trauja", "pgmc-terwa", "pgmc-trumaz"],
    title: "Things made of wood → trough, tray, tar, trim",
    body: (
      <>
        Wood you can shape leaves its own trail: <b>trough</b> (*trugaz, a
        wooden vessel), <b>tray</b> (*traują), and <b>tar</b> — literally “the
        pitch of certain trees” (*terwą). The “firm” adjective <b>*trumaz</b>{" "}
        gave Old English <i>trum</i> “strong” and, more shakily, <b>trim</b>.
      </>
    ),
  },
  {
    key: "greek",
    focus: ["gk-drys", "gk-doru", "gk-drymos"],
    title: "Greek oaks and spears → drys, doru",
    body: (
      <>
        In Greek the root narrowed to the mightiest tree: <b>δρῦς (drŷs)</b>
        “oak.” Its nymphs, the <i>Dryades</i>, give us <b>dryad</b> and{" "}
        <b>hamadryad</b>. A second form, <b>δόρυ (dóry)</b>, meant the wooden{" "}
        <i>shaft</i> — and so a <b>spear</b>.
      </>
    ),
  },
  {
    key: "dendro",
    focus: ["gk-dendron"],
    title: "The tangled δένδρον → dendrite, rhododendron",
    body: (
      <>
        Greek’s ordinary word for “tree,” <b>δένδρον (déndron)</b>, looks like a
        reduplicated *der-drew-om — but linguists flag the doubling as “highly
        atypical,” so the link is <b>uncertain</b> (dashed here). On it we built{" "}
        <b>dendrite</b>, <b>rhododendron</b> (“rose-tree”), <b>philodendron</b>{" "}
        (“tree-loving”) and <b>dendro</b>chronology.
      </>
    ),
  },
  {
    key: "latin",
    focus: ["la-durus"],
    title: "The hard family → endure, durable… probably",
    body: (
      <>
        Latin <b>dūrus</b> “hard” looks like a perfect fit for a root meaning
        “firm,” and the American Heritage / Watkins tradition files{" "}
        <b>endure, durable, duration, dour, duress, obdurate</b> and even{" "}
        <b>dura mater</b> here. But the specialist de Vaan prefers a{" "}
        <i>different</i> root, *dweh₂- “long.” So this whole branch hangs on one{" "}
        <b>disputed</b> step — shown dashed.
      </>
    ),
  },
  {
    key: "celtic",
    focus: ["pc-daru"],
    title: "Celtic: the tree that became the oak → Derry",
    body: (
      <>
        Celtic narrowed “tree” to “oak”: <b>*daru</b> → Old Irish <i>daur/dair</i>,
        Welsh <b>derw</b>. The Irish <i>doire</i> “oak grove” still names the city
        of <b>Derry</b> (Daire).
      </>
    ),
  },
  {
    key: "druid",
    focus: ["pc-druwits"],
    title: "Druids: oak-knowers, or great sages?",
    body: (
      <>
        The romantic story makes a <b>druid</b> an “oak-knower” (*deru- “oak” +
        *weid- “to know”). Pliny said as much. But modern scholars call the oak
        link “doubtful” and read the first element as “firm/strong” → “great
        sage.” Either way it lives in the *deru-/*drew- complex — the “oak”
        meaning is the <b>disputed</b> part.
      </>
    ),
  },
  {
    key: "slavic",
    focus: ["psl-dervo", "psl-sdorvu"],
    title: "Slavic: tree, and maybe ‘healthy’",
    body: (
      <>
        Slavic *dervo gives Russian <b>де́рево</b> and Polish <b>drzewo</b>
        “tree.” A famous claim says Russian <b>здоровый</b> / Polish <b>zdrowy</b>{" "}
        “healthy” literally meant “made of good wood” (*sъ- “good” + *dorv-). It’s
        a lovely idea — but the second element’s origin is{" "}
        <b>uncertain</b>; Meillet and Derksen tie it instead to “support, hold.”
      </>
    ),
  },
  {
    key: "far",
    focus: ["hit-taru", "txb-or", "hy-tram", "sq-dru", "sa-daru"],
    title: "To the edges of the family",
    body: (
      <>
        The same root surfaces across the whole family: Hittite <b>taru</b> on
        4,000-year-old clay tablets; Tocharian <b>or</b> “wood” from the Tarim
        Basin; Albanian <b>dru</b>; Armenian <b>tram</b> “firm”; and Sanskrit{" "}
        <b>dāru</b> “wood” — whose <i>devadāru</i> “divine tree” we borrowed as{" "}
        <b>deodar</b>, the Himalayan cedar.
      </>
    ),
  },
  {
    key: "explore",
    focus: [],
    title: "Now explore",
    body: (
      <>
        That’s the whole tree of <i>tree</i>. Drag to pan, scroll to zoom,{" "}
        <b>hover</b> any word to trace its line back to the root, and{" "}
        <b>click</b> it for the gloss and the exact sources. Toggle the{" "}
        <b>disputed links</b> off to see only what’s secure.
      </>
    ),
  },
];

export function App() {
  const layout = useMemo(() => buildLayout(TREE), []);
  const [activeStep, setActiveStep] = useState(0);
  const [showDisputed, setShowDisputed] = useState(true);
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
        <div className="hero-kicker">an explorable etymology</div>
        <h1>
          The Tree of <span className="ital">tree</span>
        </h1>
        <p className="hero-dek">
          The English word <b>tree</b> and dozens of unlikely relatives —{" "}
          <b>true</b>, <b>trust</b>, <b>trough</b>, <b>endure</b>, <b>druid</b>,{" "}
          <b>dryad</b>, <b>tar</b>, even Russian <b>zdorov</b> “healthy” — all
          grew from one Proto-Indo-European root,{" "}
          <b className="ital">*deru-</b>. Scroll to follow the branches; the tree
          on the right grows from the root upward, exactly like the thing it
          names.
        </p>

        <div className="hero-key">
          <span className="hero-key-label">colour = meaning</span>
          {(Object.keys(SENSES) as SenseId[]).map((s) => (
            <span className="hero-chip" key={s}>
              <i style={{ background: SENSES[s].color }} />
              {SENSES[s].short}
            </span>
          ))}
        </div>

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
                <p>{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="graphic">
          <div className="graphic-inner">
            <div className="tree-region">
              <EtymologyTree
                focusIds={STEPS[activeStep]?.focus ?? []}
                showDisputed={showDisputed}
                onToggleDisputed={() => setShowDisputed((v) => !v)}
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

      <footer className="colophon">
        <h2>How this was made</h2>
        <p>
          Every link in the tree is sourced. Secure descents are drawn solid;
          contested ones are dashed with a “?”, and clicking any word lists the
          exact dictionaries behind it. Primary sources: the{" "}
          <a href="https://www.etymonline.com/word/*deru-" target="_blank" rel="noreferrer">
            Online Etymology Dictionary
          </a>
          ,{" "}
          <a
            href="https://en.wiktionary.org/wiki/Reconstruction:Proto-Indo-European/d%C3%B3ru"
            target="_blank"
            rel="noreferrer"
          >
            Wiktionary
          </a>
          , the American Heritage Dictionary of Indo-European Roots (Watkins),
          and de Vaan’s Etymological Dictionary of Latin. The full claim-by-claim
          reference list lives in{" "}
          <code>references.md</code>.
        </p>
        <p className="disputes">
          <b>Where scholars disagree, this shows the disagreement rather than
          hiding it:</b>{" "}
          the Latin <i>dūrus</i> family (de Vaan prefers “long,” not “firm”),{" "}
          <i>druid</i> as “oak-knower,” Slavic <i>zdorov</i> as “good wood,” and
          Greek <i>déndron</i>’s odd reduplication are all flagged as uncertain.
        </p>
      </footer>
    </div>
  );
}
