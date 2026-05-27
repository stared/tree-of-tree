import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EtymologyTree } from "./components/EtymologyTree";
import { DetailPanel } from "./components/DetailPanel";
import { buildLayout } from "./lib/layout";
import { TREE } from "./data/etymology";

interface Step {
  key: string;
  focus: string[];
  title: string;
  body: ReactNode;
}

// Typographic style guide for all prose below:
//   • a word cited AS a word (any language) → <b> … </b>
//   • non-Latin script → native form + romanization in parens, both bold
//   • a meaning / gloss → <i> … </i> (italic, no quote marks)
//   • a real running quotation → “double quotes”
//   • titles: short, plain words — no quotes, no markup, one line
//   • punctuation sits OUTSIDE quotes unless it belongs to the quote
const STEPS: Step[] = [
  {
    key: "seed",
    focus: [],
    title: "The old root",
    body: (
      <>
        Every word in this canopy grew from a single Proto-Indo-European root,{" "}
        <b>*deru-</b> / <b>*dóru-</b>, spoken maybe 5,000–6,000 years ago. It
        meant two things at once: <i>to be firm, solid, steadfast</i> and, as a
        noun, <i>tree, wood</i>. Those two senses — firmness and wood — are the
        trunk from which everything else splits.
      </>
    ),
  },
  {
    key: "tree",
    focus: ["pgmc-trewa"],
    title: "The English tree",
    body: (
      <>
        In Germanic the root’s tree-sense became <b>*trewą</b>, then Old English{" "}
        <b>trēow</b>, then simply <b>tree</b>. This is really the English (and
        close-Germanic) line — Gothic <b>triu</b> and Old Norse <b>tré</b> keep
        it too. Elsewhere the everyday word for a tree is something else
        entirely: German <b>Baum</b>, Latin <b>arbor</b>, Greek <b>déndron</b>.
      </>
    ),
  },
  {
    key: "objects",
    focus: ["pgmc-trugaz", "pgmc-trauja"],
    title: "Wood you shape",
    body: (
      <>
        Wood you can hollow and carve leaves its own trail: <b>trough</b> and{" "}
        <b>tray</b> both descend from <b>*dru-ko-</b> <i>wooden vessel</i>,
        through Old English <b>trog</b> and <b>trēg</b>.
      </>
    ),
  },
  {
    key: "tar",
    focus: ["pgmc-terwa"],
    title: "Tree-pitch",
    body: (
      <>
        Render the resin of certain trees and you get <b>tar</b> — literally{" "}
        <i>the pitch of certain trees</i>, from the o-grade <b>*derw-o-</b>. It
        gives English <b>tar</b> and German <b>Teer</b>: the same formation as
        Slavic <b>dervo</b> <i>tree</i> and Lithuanian <b>derva</b> <i>resin</i>.
      </>
    ),
  },
  {
    key: "faith",
    focus: ["pgmc-treuwaz", "pgmc-trausta"],
    title: "As firm as a tree",
    body: (
      <>
        Here’s the surprise the dictionaries confirm: <b>true</b> is a
        tree-word. From the same oblique stem <b>*dréw-</b> as <b>tree</b>,
        Germanic <b>*treuwaz</b> meant <i>firm, steadfast — as a tree</i>,
        giving <b>true</b>, <b>truth</b>, <b>troth</b>, <b>betroth</b>,{" "}
        <b>trow</b>, <b>truce</b>. Its close kin <b>*traustą</b> gave{" "}
        <b>trust</b> (and German <b>Trost</b> <i>comfort</i>).
      </>
    ),
  },
  {
    key: "greek-oak",
    focus: ["gk-drys"],
    title: "The mightiest tree",
    body: (
      <>
        In Greek the root narrowed to the mightiest tree: <b>δρῦς [drŷs]</b>{" "}
        <i>oak</i>. Its tree-nymphs, the <b>Dryades</b>, give us <b>dryad</b> —
        and the <b>hamadryad</b>, the nymph fated to die together with her own
        tree.
      </>
    ),
  },
  {
    key: "greek-spear",
    focus: ["gk-doru"],
    title: "The wooden shaft",
    body: (
      <>
        A second Greek form, <b>δόρυ [dóry]</b>, kept the bare <i>wood</i> sense
        and narrowed it to the wooden shaft of a spear — and survives as the
        English borrowing <b>doru</b>, a long thrusting spear.
      </>
    ),
  },
  {
    key: "grove",
    focus: ["gk-drymos", "sa-druma", "pgmc-trumaz"],
    title: "A dense thicket",
    body: (
      <>
        The zero-grade <b>*dru-</b> also built <b>*drumo-</b> <i>a dense stand
        of trees</i>: Greek <b>δρυμός [drymós]</b> <i>oak forest</i>, Sanskrit{" "}
        <b>druma</b> <i>tree</i>. Germanic took the <i>dense, firm</i> sense to{" "}
        <b>*trumaz</b> → Old English <b>trum</b> <i>strong</i>, and — more
        shakily — <b>trim</b>.
      </>
    ),
  },
  {
    key: "dendro",
    focus: ["gk-dendron"],
    title: "The tangled déndron",
    body: (
      <>
        Greek’s ordinary word for a tree, <b>δένδρον [déndron]</b>, looks like a
        reduplicated <b>*der-drew-om</b> — but the doubling is highly unusual,
        so the link is uncertain (dashed here). On it we built{" "}
        <b>dendrite</b>, <b>rhododendron</b> <i>rose-tree</i>,{" "}
        <b>philodendron</b> <i>tree-loving</i>, and <b>dendrochronology</b>.
      </>
    ),
  },
  {
    key: "latin",
    focus: ["la-durus"],
    title: "The hard family",
    body: (
      <>
        Latin <b>dūrus</b> <i>hard</i> looks like a perfect fit for a root
        meaning <i>firm</i>, and a long tradition files <b>endure</b>,{" "}
        <b>durable</b>, <b>duration</b>, <b>dour</b>, <b>duress</b>,{" "}
        <b>obdurate</b>, even <b>dura mater</b> here. But that very first step is
        disputed — shown dashed.
        <br />
        <small>
          <b>Dura lex, sed lex</b> — <i>the law is harsh, but it is the law</i>.
        </small>
      </>
    ),
  },
  {
    key: "celtic",
    focus: ["pc-daru"],
    title: "The Celtic oak",
    body: (
      <>
        Celtic took the general tree and narrowed it to one species — the oak in
        particular: <b>*daru</b> → Old Irish <b>daur</b>, <b>dair</b>; Welsh{" "}
        <b>derw</b>. The Irish <b>doire</b> <i>oak grove</i> still names the city
        of <b>Derry</b> (<b>Daire</b>).
      </>
    ),
  },
  {
    key: "druid",
    focus: ["pc-druwits"],
    title: "Druids",
    body: (
      <>
        The romantic story makes a <b>druid</b> an <i>oak-knower</i> (<b>*deru-</b>{" "}
        <i>oak</i> + <b>*weid-</b> <i>to know</i>). Pliny said as much. But the
        oak link is doubtful; the first element may instead be{" "}
        <i>firm, strong</i> → <i>great sage</i>. Either way it lives in the{" "}
        <b>*deru-</b> / <b>*drew-</b> complex; the oak meaning is the disputed
        part.
      </>
    ),
  },
  {
    key: "slavic",
    focus: ["psl-dervo", "psl-sdorvu"],
    title: "Slavic: tree, health?",
    body: (
      <>
        Slavic <b>dervo</b> gives Polish <b>drzewo</b> and Ukrainian{" "}
        <b>де́рево [dérevo]</b> <i>tree</i>. A famous claim says Polish{" "}
        <b>zdrowy</b> and Ukrainian <b>здоровий [zdorovyj]</b> <i>healthy</i>{" "}
        once meant <i>made of good wood</i> (<b>*sъ-</b> <i>good</i> +{" "}
        <b>*dorv-</b>).
        <br />
        <small>
          A lovely idea — but that second step is uncertain, and shown dashed.
        </small>
      </>
    ),
  },
  {
    key: "far",
    focus: ["hit-taru", "txb-or", "hy-torg", "sq-dru", "sa-daru"],
    title: "Edges of the family",
    body: (
      <>
        The same root surfaces across the whole family: Hittite <b>taru</b> on
        4,000-year-old clay tablets; Tocharian <b>or</b> <i>wood</i> from the
        Tarim Basin; Albanian <b>dru</b>; Armenian <b>tram</b> <i>firm</i>; and
        Sanskrit <b>dāru</b> <i>wood</i> — whose <b>devadāru</b> <i>divine
        tree</i> we borrowed as <b>deodar</b>, the Himalayan cedar.
      </>
    ),
  },
  {
    key: "explore",
    focus: [],
    title: "Now explore",
    body: (
      <>
        That’s the whole tree of <b>tree</b>. Drag to pan, scroll to zoom, hover
        any word to trace its line back to the root, and click it for the gloss
        and the exact sources. The dashed links are the ones scholars dispute.
      </>
    ),
  },
];

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
        <div className="hero-kicker">an explorable etymology</div>
        <h1>
          The Tree of <span className="ital">tree</span>
        </h1>
        <p className="hero-dek">
          The English word <b>tree</b> and dozens of unlikely relatives —{" "}
          <b>true</b>, <b>trust</b>, <b>trough</b>, <b>endure</b>, <b>druid</b>,{" "}
          <b>dryad</b>, <b>tar</b>, even Polish <b>zdrowy</b> <i>healthy</i> —
          all grew from one Proto-Indo-European root, <b>*deru-</b>. Scroll to
          follow the branches; the tree on the right grows from the root upward,
          exactly like the thing it names.
        </p>

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
          contested ones are dashed and flagged with a “?”, and clicking any word
          lists the exact dictionaries behind it. Primary sources: the{" "}
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
          reference list lives in <code>references.md</code>.
        </p>
        <p className="disputes">
          Where scholars disagree, this shows the disagreement rather than hiding
          it: the Latin <b>dūrus</b> family, <b>druid</b> as <i>oak-knower</i>,
          the Slavic <i>good wood</i> reading, and Greek <b>déndron</b>’s odd
          reduplication are all drawn dashed. Click any of them to see who
          contests the link, and why.
        </p>
      </footer>
    </div>
  );
}
