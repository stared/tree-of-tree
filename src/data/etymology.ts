// The etymological tree of PIE *dóru / *deru- ("tree, wood; firm").
//
// STRUCTURE — built on the reconstructed ABLAUT PARADIGM of the noun, which is
// the consensus of the standard handbooks (Mayrhofer EWAia I 721; Beekes EDG;
// Kloekhorst EDHIL 849; EIEC 598): an athematic noun
//        nom. *dóru   ·   oblique *dréw-   ·   zero-grade/collective *dru-
// Almost every descendant hangs off ONE of these three stems (or a derivative
// of one), NOT off the bare root — going straight to the root is a last resort.
//
// Rules: one name per node (root keeps its two ablaut citation forms); `gloss`
// is meaning only (descent is shown by the tree); non-Latin scripts keep their
// native `form` with romanisation in `translit` (shown in [brackets] below);
// `sense` (meaning bucket) drives colour, never the tree's shape or order;
// `disputed: true` = the link from the parent is contested (dashed + "?").
//
// Sources are cited per node in `refs` (id → URL in references.ts), and include
// Kroonen, Beekes, de Vaan, Derksen, Mayrhofer, Matasović, Martirosyan,
// Kloekhorst, Adams, Orel, Pokorny, EIEC.

export type NodeKind = "root" | "reconstructed" | "attested" | "modern";

export type SenseId = "tree" | "oak" | "firm" | "faith" | "object" | "other";

export interface SenseMeta {
  id: SenseId;
  short: string;
  label: string;
  color: string;
}

export const SENSES: Record<SenseId, SenseMeta> = {
  tree: { id: "tree", short: "tree", label: "tree · wood", color: "#4f9d52" },
  oak: { id: "oak", short: "oak", label: "oak", color: "#8a6f2b" },
  firm: { id: "firm", short: "firm", label: "firm · solid · hard", color: "#8c5aa6" },
  faith: { id: "faith", short: "trust", label: "faithful · trust · truth", color: "#3f7fae" },
  object: { id: "object", short: "wooden", label: "thing made of wood", color: "#c4802f" },
  other: { id: "other", short: "other", label: "other · derived", color: "#9a8d7d" },
};

export const ROOT_COLOR = "#3b2f22";

export interface EtymNode {
  id: string;
  form: string;
  translit?: string;
  lang: string;
  gloss: string;
  kind: NodeKind;
  sense?: SenseId;
  disputed?: boolean;
  /** A headline relative — labelled even in the zoomed-out (bird's-eye) view. */
  important?: boolean;
  note?: string;
  quote?: string;
  refs?: number[];
  children?: EtymNode[];
}

/** A node's display colour comes from its MEANING (sense); the root is special. */
export function senseColor(node: EtymNode): string {
  if (node.kind === "root") return ROOT_COLOR;
  return node.sense ? SENSES[node.sense].color : SENSES.other.color;
}

/** Flat id → node index, for looking a node up by id (e.g. the selected one). */
export function nodeById(root: EtymNode): Map<string, EtymNode> {
  const map = new Map<string, EtymNode>();
  (function walk(n: EtymNode) {
    map.set(n.id, n);
    n.children?.forEach(walk);
  })(root);
  return map;
}

export const TREE: EtymNode = {
  id: "deru",
  form: "*deru-, *dóru-",
  lang: "Proto-Indo-European",
  gloss: "tree, wood, firm, solid",
  kind: "root",
  note:
    "The handbooks split on which sense is older: Pokorny derives 'firm' from 'tree/oak' (to be 'oak-strong'); Watkins reverses it ('be firm' → 'tree'); EIEC calls the link unresolved; NIL/LIV tentatively split off a verb *der- 'to fix, make firm'. This tree follows the majority view — one family — and branches by the noun's three ablaut stems.",
  quote: "“‘tree’, probably originally and properly ‘oak’ … figuratively ‘firm – firmly trusting’.” (Pokorny, IEW 214)",
  refs: [79, 80, 2, 1, 81],
  // children at EVERY level are ordered to make the story's camera sweep smooth.
  // A node's "position" is the mean leaf-index of the subtree it frames; we
  // MINIMISE the sum of SQUARED step-to-step travel (squared, so one big flight
  // costs far more than several small hops; the whole-tree framings at the ends
  // anchor the centre, which pulls the opening `tree` inward — it lands dead
  // centre). Found by simulated annealing over all per-node permutations:
  // scripts/optimize-order.mjs (deterministic, re-runnable). `sense` (colour)
  // never drives order.
  children: [
    {
      id: "gk-dendron",
      form: "δένδρον",
      translit: "déndron",
      lang: "Ancient Greek",
      gloss: "tree",
      kind: "attested",
      sense: "tree",
      disputed: true,
      note: "A reduplication of *drew-, but Beekes flags it '<IE?>' and calls the reduplication 'rare' — the formation is uncertain.",
      quote: "“the form of the Greek reduplication is rare.” (Beekes, EDG 315)",
      refs: [69, 42],
      children: [
        { id: "dendrite", form: "dendrite", lang: "English", gloss: "a branching, tree-like form", kind: "modern", sense: "tree", important: true, refs: [43] },
        { id: "rhododendron", form: "rhododendron", lang: "English", gloss: "a flowering 'rose-tree' shrub", kind: "modern", sense: "tree", refs: [45] },
        { id: "philodendron", form: "philodendron", lang: "English", gloss: "a 'tree-loving' climbing plant", kind: "modern", sense: "tree", refs: [46] },
      ],
    },

    {
      id: "la-durus",
      form: "dūrus",
      lang: "Latin",
      gloss: "hard, tough, harsh",
      kind: "attested",
      sense: "firm",
      disputed: true,
      note: "One Latin word, a whole English family: durable, duration, during, duress, obdurate, indurate (even dura mater 'hard mother') — all plainly dur-, no point drawing every one. The catch: de Vaan derives dūrus NOT from *deru- 'firm' but from *du(e)h₂-ró- 'long, far' (Skt dūrá 'far', Gk dērós 'long') — a different root. The *deru- link is the Watkins/AHD tradition only.",
      quote: "“PIE *du(e)h₂-ro- ‘far, long’.” (de Vaan, EDL 184)",
      refs: [27, 26, 24, 2],
      children: [
        { id: "endure", form: "endure", lang: "English", gloss: "to last; to bear", kind: "modern", sense: "firm", important: true, note: "The plainly-dur one: Latin in-dūrāre 'to harden' → 'to last, bear'.", refs: [31] },
        { id: "dour", form: "dour", lang: "English", gloss: "stern, gloomy, hard", kind: "modern", sense: "firm", note: "The one you'd never guess: dour is literally the word 'hard' — its dur- is hidden.", refs: [33] },
        { id: "duramen", form: "duramen", lang: "English", gloss: "heartwood", kind: "modern", sense: "object", note: "The lovely one: the hard, dead wood at a tree's core. Here the root's two faces — 'hard' and 'wood' — meet again in a single word.", refs: [24] },
      ],
    },

    {
      id: "stem-doru",
      form: "*dóru",
      lang: "PIE (nominative)",
      gloss: "wood, tree",
      kind: "reconstructed",
      sense: "tree",
      note: "The bare noun, preserved most plainly in the oldest and easternmost branches.",
      quote: "“dáru- n. Holz … Idg. *dóru, *dréu̯-s, *dru°.” (Mayrhofer, EWAia I 721)",
      refs: [80, 72, 76],
      children: [
        { id: "hit-taru", form: "𒋫𒊒", translit: "taru", lang: "Hittite", gloss: "tree, wood", kind: "attested", sense: "tree", note: "Anatolian is the oldest attested IE — a ~4,000-year-old clay-tablet word.", quote: "“PAnat. *doru- … PIE *dóru-.” (Kloekhorst, EDHIL 849)", refs: [76, 1] },

        {
          id: "txb-or",
          form: "or",
          lang: "Tocharian B",
          gloss: "wood",
          kind: "attested",
          sense: "tree",
          note: "From the Tarim Basin (western China). *d- was lost via the oblique stem (*dreu-s > *reu).",
          quote: "“PTch *or … connected … to PIE *dóru ‘tree, wood’.” (Adams, DTB)",
          refs: [77, 1],
          children: [{ id: "txb-arwa", form: "ārwa", lang: "Tocharian B", gloss: "firewood", kind: "attested", sense: "object", note: "The plural of or.", refs: [77, 1] }],
        },

        { id: "hy-torg", form: "տորգ", translit: "torg", lang: "Old Armenian", gloss: "wooden frame; web, loom", kind: "attested", sense: "object", quote: "“*doru-i(h₂)- … would yield Arm. torg.” (Martirosyan, EDAIL 606)", refs: [75, 1] },

        {
          id: "sa-daru",
          form: "दारु",
          translit: "dāru",
          lang: "Sanskrit",
          gloss: "wood, timber",
          kind: "attested",
          sense: "tree",
          quote: "“dáru- n. Holz (RV+) … Idg. *dóru, *dréu̯-s.” (Mayrhofer, EWAia I 721)",
          refs: [72, 73, 51],
          children: [
            { id: "sa-daruna", form: "दारुण", translit: "dāruṇa", lang: "Sanskrit", gloss: "hard, harsh, cruel", kind: "attested", sense: "firm", note: "Mayrhofer: derived FROM dāru 'wood' (hardness of wood) — not evidence of an independent 'firm' root-meaning.", quote: "“dārúṇa- ist Ableitung von d° ‘Holz’ und kein Beleg für *fest.” (Mayrhofer, EWAia I 721)", refs: [72, 73, 54] },
            {
              id: "sa-devadaru",
              form: "देवदारु",
              translit: "devadāru",
              lang: "Sanskrit",
              gloss: "divine tree",
              kind: "attested",
              sense: "tree",
              refs: [55, 56],
              children: [{ id: "deodar", form: "deodar", lang: "English", gloss: "the Himalayan cedar", kind: "modern", sense: "tree", important: true, refs: [55, 56] }],
            },
          ],
        },

        { id: "luw-taru", form: "𒋫𒀀𒊒", translit: "tāru", lang: "Luwian", gloss: "tree, wood", kind: "attested", sense: "tree", refs: [76, 1] },

        {
          id: "op-daru",
          form: "𐎭𐎠𐎽𐎢𐎺",
          translit: "dāruv",
          lang: "Old Persian",
          gloss: "wood",
          kind: "attested",
          sense: "tree",
          note: "The Iranian half of Indo-Iranian, beside Sanskrit dāru — cuneiform Old Persian of the Achaemenid inscriptions.",
          quote: "“Old Persian 𐎭𐎠𐎽𐎢𐎺 (dāruv) … from PIE *dóru.” (Wiktionary)",
          refs: [82, 72, 1],
          children: [
            {
              id: "fa-daru",
              form: "دارو",
              translit: "dāru",
              lang: "Persian",
              gloss: "medicine, drug",
              kind: "modern",
              sense: "other",
              note: "The surprising one: 'medicine' from a diminutive *dāru-ka- 'little plant, herb' (Middle Persian dārūg). NOT the source of English drug, which is unrelated.",
              quote: "“from Middle Persian dārūg, … perhaps from Proto-Iranian *dā́rukah ‘tree, wood’.” (Wiktionary)",
              refs: [83],
            },

            {
              id: "fa-dar",
              form: "دار",
              translit: "dār",
              lang: "Persian",
              gloss: "wood; (now usually) a gallows",
              kind: "modern",
              sense: "object",
              note: "'Wood' narrowed to the wooden thing it became — like Greek δόρυ 'wood → spear'.",
              refs: [82],
            },
          ],
        },

        {
          id: "gk-doru",
          form: "δόρυ",
          translit: "dóry",
          lang: "Ancient Greek",
          gloss: "wood; a spear-shaft, spear",
          kind: "attested",
          sense: "object",
          note: "The 'wood → spear' narrowing (the spear is its shaft). Borrowed into English only as the hoplite term doru — not the boat, nor the fish 'John Dory', both unrelated.",
          quote: "“δόρυ [n.] ‘wood, tree (trunk), spear’ … <IE *doru ‘tree, wood’>.” (Beekes, EDG 349)",
          refs: [69, 40],
        },

        {
          id: "pc-daru",
          form: "*daru",
          lang: "Proto-Celtic",
          gloss: "oak",
          kind: "reconstructed",
          sense: "oak",
          note: "Celtic narrowed 'tree' to 'oak'. Matasović: nom. *daru, oblique *darw-, an ablauting paradigm of *dóru.",
          quote: "“PIE *doru- ‘tree, wood’ … an ablauting paradigm Nom. *doru / Gen. *drw-os.” (Matasović, EDPC 91)",
          refs: [74, 57],
          children: [
            {
              id: "oir-dair",
              form: "dair",
              lang: "Old Irish",
              gloss: "oak",
              kind: "attested",
              sense: "oak",
              refs: [58],
              children: [
                {
                  id: "doire",
                  form: "doire",
                  lang: "Irish",
                  gloss: "oak grove",
                  kind: "modern",
                  sense: "oak",
                  refs: [60],
                  children: [{ id: "derry", form: "Derry", lang: "place name", gloss: "a city named for its oak grove", kind: "modern", sense: "oak", refs: [60, 61] }],
                },
              ],
            },
          ],
        },
      ],
    },

    {
      id: "stem-drew",
      form: "*dréw-",
      lang: "PIE (oblique stem)",
      gloss: "of the tree / wood",
      kind: "reconstructed",
      sense: "tree",
      note: "The oblique stem. Germanic built its tree-word here — and, by the metaphor 'firm as a tree/oak', its words for true, trust and faith.",
      quote: "“For the shift of meaning, cf. Lat. rōbustus … from rōbur ‘oak; strength’.” (Kroonen, EDPG 522)",
      refs: [67, 68, 69],
      children: [
        {
          id: "pgmc-treuwaz",
          form: "*treuwaz",
          lang: "Proto-Germanic",
          gloss: "faithful, trustworthy",
          kind: "reconstructed",
          sense: "faith",
          note: "The famous 'firm as a tree/oak → true' shift. Orel derives 'true' straight from the tree-word; Kroonen links them; Matasović spells out 'firm as an oak > strong > true'. So true/truth are tree-words at heart.",
          quote: "“*trewwaz … Based on *trewan [‘tree’].” (Orel, Handbook 410)",
          refs: [5, 67, 68, 74],
          children: [
            {
              id: "oe-triewe",
              form: "trēowe",
              lang: "Old English",
              gloss: "faithful, steady",
              kind: "attested",
              sense: "faith",
              refs: [5],
              children: [
                { id: "true", form: "true", lang: "English", gloss: "in accordance with fact; faithful", kind: "modern", sense: "faith", important: true, refs: [5] },
                {
                  id: "oe-treowth",
                  form: "trēowþ",
                  lang: "Old English",
                  gloss: "faith, fidelity; a pledge",
                  kind: "attested",
                  sense: "faith",
                  note: "The 'faithful' adjective + the abstract suffix -þ (a formation already Proto-Germanic, *triwwiþō) — truth is literally 'true-ness'.",
                  quote: "“From Proto-Germanic *triwwiþō … by surface analysis, trēowe + -þ.” (Wiktionary)",
                  refs: [7, 89],
                  children: [
                    { id: "truth", form: "truth", lang: "English", gloss: "what is true; veracity", kind: "modern", sense: "faith", refs: [7] },
                    {
                      id: "troth",
                      form: "troth",
                      lang: "English",
                      gloss: "a solemn pledge",
                      kind: "modern",
                      sense: "faith",
                      refs: [8],
                      children: [{ id: "betroth", form: "betroth", lang: "English", gloss: "to promise in marriage", kind: "modern", sense: "faith", refs: [9] }],
                    },
                  ],
                },
              ],
            },

            { id: "trow", form: "trow", lang: "English (archaic)", gloss: "to believe, trust", kind: "modern", sense: "faith", refs: [10] },

            { id: "truce", form: "truce", lang: "English", gloss: "an agreed halt to fighting", kind: "modern", sense: "faith", note: "Originally a plural — 'pledges'.", refs: [22] },

            { id: "trig", form: "trig", lang: "English (dialectal)", gloss: "neat, firm, sound", kind: "modern", sense: "firm", note: "Unrelated to trig = trigonometry.", refs: [14] },

            { id: "nl-trouw", form: "trouw", lang: "Dutch", gloss: "faithful; loyalty", kind: "modern", sense: "faith", refs: [5] },

            { id: "de-treu", form: "treu", lang: "German", gloss: "faithful, loyal", kind: "modern", sense: "faith", refs: [23, 5] },

            { id: "got-triggws", form: "triggws", lang: "Gothic", gloss: "faithful, true", kind: "attested", sense: "faith", refs: [5, 6] },

            {
              id: "pgmc-trausta",
              form: "*traustą",
              lang: "Proto-Germanic",
              gloss: "confidence, trust",
              kind: "reconstructed",
              sense: "faith",
              note: "etymonline/Watkins derive the abstract noun *traustą straight from *treuwaz 'faithful' — so trust is a branch off true, not a separate stem. (Kroonen instead makes the -st- a parallel formation on the verb *trūēn- 'to trust'; either way, one 'firm' family.)",
              quote: "“Proto-Germanic abstract noun *traustam … which derives from *treuwaz.” (etymonline)",
              refs: [11, 12, 67, 68],
              children: [
                {
                  id: "on-traust",
                  form: "traust",
                  lang: "Old Norse",
                  gloss: "help, confidence, protection",
                  kind: "attested",
                  sense: "faith",
                  refs: [11],
                  children: [
                    {
                      id: "trust",
                      form: "trust",
                      lang: "English",
                      gloss: "reliance on another's integrity",
                      kind: "modern",
                      sense: "faith",
                      important: true,
                      refs: [11],
                      children: [
                        {
                          id: "tryst",
                          form: "tryst",
                          lang: "English",
                          gloss: "a secret meeting, esp. between lovers",
                          kind: "modern",
                          sense: "faith",
                          disputed: true,
                          note: "A doublet of trust: via Old French triste 'an appointed waiting place in hunting', probably from Old Norse treysta 'to trust, make firm' — 'the place one waits trustingly'. The pre-French step is uncertain.",
                          quote: "“probably from a Scandinavian source akin to Old Norse treysta ‘to trust, make firm’.” (etymonline)",
                          refs: [87, 88],
                        },
                      ],
                    },
                  ],
                },
                { id: "de-trost", form: "Trost", lang: "German", gloss: "comfort, consolation", kind: "modern", sense: "faith", refs: [12] },
                { id: "nl-troost", form: "troost", lang: "Dutch", gloss: "comfort", kind: "modern", sense: "faith", refs: [12] },
              ],
            },
          ],
        },

        {
          id: "pgmc-trewa",
          form: "*trewą",
          lang: "Proto-Germanic",
          gloss: "tree, wood",
          kind: "reconstructed",
          sense: "tree",
          quote: "“*trewa- … > *dréu-o-.” (Kroonen, EDPG 522)",
          refs: [3, 4, 67],
          children: [
            {
              id: "oe-treow",
              form: "trēow",
              lang: "Old English",
              gloss: "tree; timber, beam",
              kind: "attested",
              sense: "tree",
              refs: [3],
              children: [{ id: "tree", form: "tree", lang: "English", gloss: "a woody perennial plant", kind: "modern", sense: "tree", important: true, refs: [3] }],
            },
            { id: "got-triu", form: "triu", lang: "Gothic", gloss: "tree, wood", kind: "attested", sense: "tree", refs: [4] },
            { id: "on-tre", form: "tré", lang: "Old Norse", gloss: "tree", kind: "attested", sense: "tree", refs: [4] },
          ],
        },

        {
          id: "derwo",
          form: "*derw-o-",
          lang: "PIE (o-grade)",
          gloss: "tree, wood",
          kind: "reconstructed",
          sense: "tree",
          note: "The o-grade of this oblique stem — *dréw- (e-grade) and *derw-o- (o-grade) are ablaut variants of one stem, not separate roots. Its fates: a Slavic 'tree', a Baltic & Germanic 'tar', a Welsh 'oak'.",
          quote: "“derwo-/derwā … OCS drěvo, Lith. dervà ‘Pech’, Welsh derw ‘Eiche’.” (Pokorny, IEW 215)",
          refs: [79, 70, 71, 21],
          children: [
            {
              id: "psl-dervo",
              form: "*dervo",
              lang: "Proto-Slavic",
              gloss: "tree, wood",
              kind: "reconstructed",
              sense: "tree",
              quote: "“BSl. *der(H)wom; PIE *deru-o-.” (Derksen, EDSIL 99)",
              refs: [70, 62],
              children: [
                { id: "pl-drzewo", form: "drzewo", lang: "Polish", gloss: "tree", kind: "modern", sense: "tree", refs: [62] },
                { id: "uk-derevo", form: "де́рево", translit: "dérevo", lang: "Ukrainian", gloss: "tree", kind: "modern", sense: "tree", refs: [62] },
                { id: "ocs-drevo", form: "дрѣво", translit: "drěvo", lang: "Old Church Slavonic", gloss: "tree", kind: "attested", sense: "tree", refs: [62] },
              ],
            },

            {
              id: "psl-sdorvu",
              form: "*sъdorvъ",
              translit: "sŭdorvŭ",
              lang: "Proto-Slavic",
              gloss: "healthy",
              kind: "reconstructed",
              sense: "other",
              disputed: true,
              note: "The famous 'made of good wood' reading ties *-dorvъ to *dervo 'tree'. But Derksen (2008) PREFERS Meillet's *dʰer- 'hold firm' (Skt dhruvá-) — a DIFFERENT root — because Winter's law fails to lengthen the first member. (He warms to 'good wood' in 2015 after Petit removed that objection.) So the drzewo link is contested.",
              quote: "“Meillet's etymology … cognate with Skt. dhruvá- ‘firm, solid’ … is preferable.” (Derksen, EDSIL 478)",
              refs: [70, 71, 63],
              children: [
                { id: "pl-zdrowy", form: "zdrowy", lang: "Polish", gloss: "healthy", kind: "modern", sense: "other", important: true, refs: [63] },
                { id: "uk-zdorovyj", form: "здоро́вий", translit: "zdoróvyj", lang: "Ukrainian", gloss: "healthy", kind: "modern", sense: "other", refs: [63] },
              ],
            },

            { id: "cy-derw", form: "derw", lang: "Welsh", gloss: "oak; oaks", kind: "modern", sense: "oak", quote: "“*derw-o- ‘oak’ … OIr. derb, MW derwen.” (Matasović, EDPC 91)", refs: [74, 59] },

            { id: "lt-derva", form: "derva", lang: "Lithuanian", gloss: "tar; resinous wood", kind: "modern", sense: "object", note: "Derksen: the same etymon as Slavic *dervo; Baltic specialised 'resinous wood → tar'.", quote: "“PSL *dérvo … PIE *deru-o-.” (Derksen, EDBIL 123)", refs: [71, 64] },

            {
              id: "pgmc-terwa",
              form: "*terwą",
              lang: "Proto-Germanic",
              gloss: "tar, tree-resin",
              kind: "reconstructed",
              sense: "object",
              quote: "“literally ‘the pitch of (certain kinds) of trees’ … from PIE *derw-.” (etymonline)",
              refs: [20, 21, 67],
              children: [
                {
                  id: "oe-teoru",
                  form: "teoru",
                  lang: "Old English",
                  gloss: "tar, resin",
                  kind: "attested",
                  sense: "object",
                  refs: [20],
                  children: [{ id: "tar", form: "tar", lang: "English", gloss: "dark sticky pitch", kind: "modern", sense: "object", important: true, refs: [20] }],
                },
                { id: "de-teer", form: "Teer", lang: "German", gloss: "tar", kind: "modern", sense: "object", refs: [21] },
              ],
            },
          ],
        },

        {
          id: "gk-drys",
          form: "δρῦς",
          translit: "drŷs",
          lang: "Ancient Greek",
          gloss: "oak; tree",
          kind: "attested",
          sense: "oak",
          note: "Beekes: the feminine 'oak/tree' arose from the oblique-case forms of the neuter 'wood'.",
          quote: "“The feminine δρῦς … arose from the oblique case forms of the word for ‘wood’.” (Beekes, EDG 356)",
          refs: [69, 38],
          children: [
            {
              id: "gk-dryas",
              form: "Δρυάς",
              translit: "Dryás",
              lang: "Ancient Greek",
              gloss: "a wood-nymph",
              kind: "attested",
              sense: "tree",
              refs: [39],
              children: [
                {
                  id: "dryad",
                  form: "dryad",
                  lang: "English",
                  gloss: "a tree nymph",
                  kind: "modern",
                  sense: "tree",
                  important: true,
                  refs: [39],
                  children: [{ id: "hamadryad", form: "hamadryad", lang: "English", gloss: "a nymph that dies with her tree", kind: "modern", sense: "tree", note: "Strictly Greek hama- 'together' + dryas; shown here as built on dryad.", refs: [39] }],
                },
              ],
            },
          ],
        }
      ],
    },

    {
      id: "stem-dru",
      form: "*dru-",
      lang: "PIE (zero grade)",
      gloss: "wood (collective)",
      kind: "reconstructed",
      sense: "tree",
      quote: "“δρῦ [n.pl.] ‘wood, forest’ <IE *dru- ‘wood, tree’>.” (Beekes, EDG 356)",
      refs: [69, 72, 79],
      children: [
        {
          id: "pc-druwits",
          form: "*druwits",
          lang: "Proto-Celtic",
          gloss: "a druid",
          kind: "reconstructed",
          sense: "other",
          note: "Matasović: the first element is this oak/tree word *dru-, metaphorically 'strong, firm', + *weyd- 'to know' — 'one of strong insight'. Pliny's literal 'oak-knower' (Greek drûs) is folk-etymology, but the root is right.",
          quote: "“*dru-wid- is therefore the priest with ‘strong insight’.” (Matasović, EDPC 107)",
          refs: [74, 48, 50],
          children: [{ id: "druid", form: "druid", lang: "English", gloss: "a Celtic priest or seer", kind: "modern", sense: "other", important: true, refs: [48, 50] }],
        },

        {
          id: "drumo",
          form: "*dru-mo-",
          lang: "PIE",
          gloss: "thicket, woodland",
          kind: "reconstructed",
          sense: "tree",
          note: "An -m- derivative. In Germanic it took the 'firm, strong' sense (OE trum) — Pokorny lists trum here.",
          quote: "“dru-mó-s … OE trum ‘fest, kräftig’; Gr. δρυμός; OInd drumá-.” (Pokorny, IEW 215)",
          refs: [79, 69, 72, 16],
          children: [
            { id: "gk-drymos", form: "δρυμός", translit: "drymós", lang: "Ancient Greek", gloss: "a thicket, oak forest", kind: "attested", sense: "tree", refs: [47] },
            { id: "sa-druma", form: "द्रुम", translit: "druma", lang: "Sanskrit", gloss: "tree", kind: "attested", sense: "tree", refs: [53] },
            {
              id: "pgmc-trumaz",
              form: "*trumaz",
              lang: "Proto-Germanic",
              gloss: "firm, strong",
              kind: "reconstructed",
              sense: "firm",
              quote: "“Continues Proto-Indo-European *drumos, from *deru-, *drew- (‘tree’).” (Wiktionary; cf. Pokorny)",
              refs: [16, 79],
              children: [
                {
                  id: "oe-trum",
                  form: "trum",
                  lang: "Old English",
                  gloss: "firm, strong",
                  kind: "attested",
                  sense: "firm",
                  refs: [15, 16],
                  children: [
                    {
                      id: "trim",
                      form: "trim",
                      lang: "English",
                      gloss: "neat and in good order",
                      kind: "modern",
                      sense: "firm",
                      disputed: true,
                      note: "trim 'is missing in Middle English after about 1250, which makes connection uncertain' (etymonline).",
                      quote: "“the word is missing in Middle English after about 1250, which makes connection uncertain.” (etymonline)",
                      refs: [15],
                    },
                  ],
                },
              ],
            },
          ],
        },

        {
          id: "druko",
          form: "*dru-ko-",
          lang: "PIE",
          gloss: "trough, wooden vessel",
          kind: "reconstructed",
          sense: "object",
          quote: "“*truga- … > *dru-ko-.” (Kroonen, EDPG 523)",
          refs: [79, 67, 17],
          children: [
            {
              id: "pgmc-trugaz",
              form: "*trugaz",
              lang: "Proto-Germanic",
              gloss: "trough, wooden vessel",
              kind: "reconstructed",
              sense: "object",
              refs: [17, 18],
              children: [
                {
                  id: "oe-trog",
                  form: "trog",
                  lang: "Old English",
                  gloss: "shallow wooden vessel",
                  kind: "attested",
                  sense: "object",
                  refs: [17],
                  children: [{ id: "trough", form: "trough", lang: "English", gloss: "a long open container", kind: "modern", sense: "object", important: true, refs: [17] }],
                },
                { id: "de-trog", form: "Trog", lang: "German", gloss: "trough", kind: "modern", sense: "object", refs: [17] },
              ],
            },
            {
              id: "pgmc-trauja",
              form: "*trauhja",
              lang: "Proto-Germanic",
              gloss: "wooden vessel",
              kind: "reconstructed",
              sense: "object",
              note: "Kroonen derives 'tray' from *trauhja- < *drouk-io- — a *dru-k- derivative, so a cousin of trough.",
              quote: "“OE trīg n. ‘tray’ < *trauhja- < *drouk-io-.” (Kroonen, EDPG 523)",
              refs: [19, 67],
              children: [
                {
                  id: "oe-treg",
                  form: "trēg",
                  lang: "Old English",
                  gloss: "flat wooden board with a rim",
                  kind: "attested",
                  sense: "object",
                  refs: [19],
                  children: [{ id: "tray", form: "tray", lang: "English", gloss: "a flat carrying board", kind: "modern", sense: "object", refs: [19] }],
                },
              ],
            },
          ],
        },

        { id: "sq-dru", form: "dru", lang: "Albanian", gloss: "wood, tree; firewood", kind: "modern", sense: "tree", quote: "“From PAlb *druwa … Gk δρῦς, Skt dru-, Slav *drъvo.” (Orel, AED 76)", refs: [78, 65] },
      ],
    },
  ],
};
