// The etymological tree of PIE *deru- / *dóru-.
//
// Nodes are WORDS ONLY — each node is an actual form. No language-family
// grouping nodes.
//
// Rules baked into the data:
//  - ONE name per node (only the root may carry its two ablaut citation forms).
//  - `gloss` is the word's MEANING only; derivation is shown by the TREE.
//  - non-Latin scripts keep their native `form`; the romanisation goes in
//    `translit`, rendered in [brackets] beneath the form.
//  - parent → child means "descends from". Crucially, words that share an
//    intermediate formation hang off THAT shared form, not off the root:
//    e.g. Slavic *dervo (drzewo), *sъdorvъ (zdrowy), Germanic *terwą (tar),
//    Lithuanian derva and Welsh derw all descend from *derw-o-. Going all the
//    way back to the root is a last resort. (Intermediate formations per
//    Wiktionary's *dóru "derived terms".)
//  - colour encodes the word's sense (meaning bucket), not its language.
//
// Bottom-up view: root in the soil, modern words in the canopy.
// `disputed: true` = link from the parent is contested (dashed + "?").
// Sources: src/data/references.ts and /references.md (the `refs` ids).

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
  firm: { id: "firm", short: "firm", label: "firm · solid · hard", color: "#6b7785" },
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
  note?: string;
  quote?: string;
  refs?: number[];
  children?: EtymNode[];
}

export const TREE: EtymNode = {
  id: "deru",
  form: "*deru-, *dóru-",
  lang: "Proto-Indo-European",
  gloss: "firm, solid, steadfast; and, as a noun, tree, wood",
  kind: "root",
  note:
    "One root, two faces: an adjective 'firm, solid' (giving true, trust, hard) and a noun 'tree, wood' " +
    "(giving tree, oak and the rest). Words that share a LATER formation — *derw-o-, *dru-mo-, *druh₂- — " +
    "branch together; the rest are direct reflexes of the root.",
  quote: "“to be firm, solid, steadfast … with specialized senses ‘wood,’ ‘tree.’” (etymonline)",
  refs: [1, 2, 24],
  // children are ordered to INTERLEAVE branches & senses — never sorted by meaning.
  children: [
    // *trewą "tree" (Germanic)
    {
      id: "pgmc-trewa",
      form: "*trewą",
      lang: "Proto-Germanic",
      gloss: "tree, wood",
      kind: "reconstructed",
      sense: "tree",
      quote: "“from PIE *drew-o-, suffixed variant form of root *deru-.” (etymonline)",
      refs: [3, 4],
      children: [
        {
          id: "oe-treow",
          form: "trēow",
          lang: "Old English",
          gloss: "tree; timber, beam",
          kind: "attested",
          sense: "tree",
          refs: [3],
          children: [{ id: "tree", form: "tree", lang: "English", gloss: "a woody perennial plant", kind: "modern", sense: "tree", refs: [3] }],
        },
        { id: "got-triu", form: "triu", lang: "Gothic", gloss: "tree, wood", kind: "attested", sense: "tree", refs: [4] },
        { id: "on-tre", form: "tré", lang: "Old Norse", gloss: "tree", kind: "attested", sense: "tree", refs: [4] },
      ],
    },

    // δόρυ "spear" (Greek)
    {
      id: "gk-doru",
      form: "δόρυ",
      translit: "dóry",
      lang: "Ancient Greek",
      gloss: "wood; a spear-shaft, spear",
      kind: "attested",
      sense: "object",
      quote: "“From Proto-Hellenic *dóru, from Proto-Indo-European *dóru.” (Wiktionary)",
      refs: [40],
      children: [{ id: "dory", form: "doru", lang: "English", gloss: "a long thrusting spear", kind: "modern", sense: "object", note: "Not the flat-bottomed boat, nor the fish 'John Dory'.", refs: [40, 41] }],
    },

    // *treuwaz "faithful" (Germanic) — the big 'faith' family
    {
      id: "pgmc-treuwaz",
      form: "*treuwaz",
      lang: "Proto-Germanic",
      gloss: "faithful, trustworthy",
      kind: "reconstructed",
      sense: "faith",
      note: "From the root's 'steadfast' sense; no closer shared formation is reconstructed, so it sits on the root.",
      quote: "“from PIE root *deru- 'be firm, solid, steadfast.'” (etymonline)",
      refs: [5, 6],
      children: [
        {
          id: "oe-triewe",
          form: "trēowe",
          lang: "Old English",
          gloss: "faithful, steady",
          kind: "attested",
          sense: "faith",
          refs: [5],
          children: [{ id: "true", form: "true", lang: "English", gloss: "in accordance with fact; faithful", kind: "modern", sense: "faith", refs: [5] }],
        },
        {
          id: "oe-treowth",
          form: "trēowþ",
          lang: "Old English",
          gloss: "faith, fidelity; a pledge",
          kind: "attested",
          sense: "faith",
          quote: "“shares roots with troth, truce, trust, and tree.” (etymonline)",
          refs: [7],
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
        { id: "trow", form: "trow", lang: "English (archaic)", gloss: "to believe, trust", kind: "modern", sense: "faith", refs: [10] },
        { id: "truce", form: "truce", lang: "English", gloss: "an agreed halt to fighting", kind: "modern", sense: "faith", note: "Originally a plural — 'pledges'.", refs: [22] },
        { id: "trig", form: "trig", lang: "English (dialectal)", gloss: "neat, firm, sound", kind: "modern", sense: "firm", note: "Unrelated to trig = trigonometry.", refs: [14] },
        { id: "de-treu", form: "treu", lang: "German", gloss: "faithful, loyal", kind: "modern", sense: "faith", refs: [23, 5] },
        { id: "nl-trouw", form: "trouw", lang: "Dutch", gloss: "faithful; loyalty", kind: "modern", sense: "faith", refs: [5] },
        { id: "got-triggws", form: "triggws", lang: "Gothic", gloss: "faithful, true", kind: "attested", sense: "faith", refs: [5, 6] },
      ],
    },

    // *derw-o- "tree, wood" — the shared cluster (drzewo ~ zdrowy ~ tar ~ derw)
    {
      id: "derwo",
      form: "*derw-o-",
      lang: "Proto-Indo-European",
      gloss: "tree, wood",
      kind: "reconstructed",
      sense: "tree",
      note: "One formation, many fates: a Slavic 'tree', a Baltic and Germanic 'tar', a Welsh 'oak', and — by one account — a Slavic word for 'healthy'.",
      quote: "“*derw-ó-m → Balto-Slavic *dérwa, Celtic *derwom, Germanic *terwą ('tar').” (Wiktionary)",
      refs: [1, 62, 21],
      children: [
        {
          id: "psl-dervo",
          form: "*dervo",
          lang: "Proto-Slavic",
          gloss: "tree, wood",
          kind: "reconstructed",
          sense: "tree",
          quote: "“Inherited from Proto-Balto-Slavic *dérwan, from Proto-Indo-European *derw-o-m.” (Wiktionary)",
          refs: [62],
          children: [
            { id: "ru-derevo", form: "де́рево", translit: "dérevo", lang: "Russian", gloss: "tree", kind: "modern", sense: "tree", refs: [62] },
            { id: "pl-drzewo", form: "drzewo", lang: "Polish", gloss: "tree", kind: "modern", sense: "tree", refs: [62] },
            { id: "ocs-drevo", form: "дрѣво", translit: "drěvo", lang: "Old Church Slavonic", gloss: "tree", kind: "attested", sense: "tree", refs: [62] },
          ],
        },
        {
          id: "psl-sdorvu",
          form: "*sъdorvъ",
          lang: "Proto-Slavic",
          gloss: "healthy",
          kind: "reconstructed",
          sense: "other",
          disputed: true,
          note: "*sъ- 'good' + a *dorv- element. By one reading that element is this very *derw- 'tree' ('of sound wood'); but Wiktionary calls it 'uncertain', and Meillet/Derksen instead derive it from *dʰer- 'to support, hold'.",
          quote: "“by surface analysis, *sъ- ('good') + *dorv-… The exact origin of the second component *dorv- is uncertain.” (Wiktionary)",
          refs: [63],
          children: [
            { id: "ru-zdorov", form: "здоро́вый", translit: "zdoróvyj", lang: "Russian", gloss: "healthy", kind: "modern", sense: "other", refs: [63] },
            { id: "pl-zdrowy", form: "zdrowy", lang: "Polish", gloss: "healthy", kind: "modern", sense: "other", refs: [63] },
          ],
        },
        { id: "lt-derva", form: "derva", lang: "Lithuanian", gloss: "tar; resinous wood", kind: "modern", sense: "object", refs: [64] },
        {
          id: "pgmc-terwa",
          form: "*terwą",
          lang: "Proto-Germanic",
          gloss: "tar, tree-resin",
          kind: "reconstructed",
          sense: "object",
          quote: "“literally ‘the pitch of (certain kinds) of trees’ … from PIE *derw-.” (etymonline)",
          refs: [20, 21],
          children: [
            {
              id: "oe-teoru",
              form: "teoru",
              lang: "Old English",
              gloss: "tar, resin",
              kind: "attested",
              sense: "object",
              refs: [20],
              children: [{ id: "tar", form: "tar", lang: "English", gloss: "dark sticky pitch", kind: "modern", sense: "object", refs: [20] }],
            },
            { id: "de-teer", form: "Teer", lang: "German", gloss: "tar", kind: "modern", sense: "object", refs: [21] },
          ],
        },
        { id: "cy-derw", form: "derw", lang: "Welsh", gloss: "oak; oaks", kind: "modern", sense: "oak", refs: [59] },
        { id: "hy-torg", form: "տորգ", translit: "torg", lang: "Old Armenian", gloss: "wooden framework; fabric", kind: "attested", sense: "object", note: "From the related 'wooden' derivative *dérwis.", refs: [1] },
      ],
    },

    // dūrus "hard" (Latin) — direct reflex of the firm adjective (disputed)
    {
      id: "la-durus",
      form: "dūrus",
      lang: "Latin",
      gloss: "hard, tough, harsh",
      kind: "attested",
      sense: "firm",
      disputed: true,
      note: "Watkins / etymonline derive dūrus from the 'firm' sense of the root; but de Vaan (2008) prefers an unrelated root *duh₂-ró- 'long'. The whole hard-words family hangs on this contested step.",
      quote: "“there are semantic problems if the change ‘long’ > ‘enduring’ is not accepted.” (de Vaan, via Wiktionary)",
      refs: [26, 27, 24, 2],
      children: [
        { id: "durable", form: "durable", lang: "English", gloss: "able to last", kind: "modern", sense: "firm", refs: [28] },
        { id: "endure", form: "endure", lang: "English", gloss: "to last; to bear", kind: "modern", sense: "firm", refs: [31] },
        { id: "duration", form: "duration", lang: "English", gloss: "length of time", kind: "modern", sense: "firm", refs: [29] },
        { id: "during", form: "during", lang: "English", gloss: "throughout the time of", kind: "modern", sense: "firm", refs: [30] },
        { id: "dour", form: "dour", lang: "English", gloss: "stern, gloomy", kind: "modern", sense: "firm", refs: [33] },
        { id: "duress", form: "duress", lang: "English", gloss: "coercion, compulsion", kind: "modern", sense: "firm", refs: [34] },
        { id: "obdurate", form: "obdurate", lang: "English", gloss: "stubborn, unyielding", kind: "modern", sense: "firm", refs: [35] },
        { id: "indurate", form: "indurate", lang: "English", gloss: "to harden", kind: "modern", sense: "firm", refs: [36] },
        { id: "duramen", form: "duramen", lang: "English", gloss: "heartwood", kind: "modern", sense: "object", refs: [24] },
        { id: "duramater", form: "dura mater", lang: "English", gloss: "tough membrane around the brain", kind: "modern", sense: "firm", refs: [37] },
      ],
    },

    // *druh₂- collective "wood, trees" → δρῦς → dryad
    {
      id: "druh2",
      form: "*druh₂-",
      lang: "Proto-Indo-European",
      gloss: "wood, trees (collective)",
      kind: "reconstructed",
      sense: "tree",
      quote: "“*druh₂ → Ancient Greek drûs; *druh₂-óm → Albanian dru.” (Wiktionary)",
      refs: [1, 38, 65],
      children: [
        {
          id: "gk-drys",
          form: "δρῦς",
          translit: "drŷs",
          lang: "Ancient Greek",
          gloss: "oak; tree",
          kind: "attested",
          sense: "oak",
          refs: [38],
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
                  refs: [39],
                  children: [{ id: "hamadryad", form: "hamadryad", lang: "English", gloss: "a nymph that dies with her tree", kind: "modern", sense: "tree", note: "Strictly formed in Greek (hama- 'together with' + dryas); shown here as built on dryad.", refs: [39] }],
                },
              ],
            },
          ],
        },
        { id: "sq-dru", form: "dru", lang: "Albanian", gloss: "wood, tree; firewood", kind: "modern", sense: "tree", quote: "“from Proto-Albanian *druwa, from Proto-Indo-European *druh₂-ó-m, from *dóru.” (Wiktionary)", refs: [65] },
        { id: "sa-dru", form: "द्रु", translit: "dru", lang: "Sanskrit", gloss: "wood; tree, branch", kind: "attested", sense: "tree", refs: [52] },
      ],
    },

    // *traustą "confidence" (Germanic) → trust
    {
      id: "pgmc-trausta",
      form: "*traustą",
      lang: "Proto-Germanic",
      gloss: "confidence, help",
      kind: "reconstructed",
      sense: "faith",
      quote: "“*traustą … From *traustaz ('firm, strong').” (Wiktionary)",
      refs: [11, 12],
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
              refs: [11],
              children: [{ id: "trusty", form: "trusty", lang: "English", gloss: "dependable", kind: "modern", sense: "faith", refs: [13] }],
            },
          ],
        },
        { id: "de-trost", form: "Trost", lang: "German", gloss: "comfort, consolation", kind: "modern", sense: "faith", refs: [12] },
        { id: "nl-troost", form: "troost", lang: "Dutch", gloss: "comfort", kind: "modern", sense: "faith", refs: [12] },
      ],
    },

    // *dru-mo- "thicket" → drymós, druma, AND Germanic *trumaz → trim
    {
      id: "drumo",
      form: "*dru-mo-",
      lang: "Proto-Indo-European",
      gloss: "thicket, woodland",
      kind: "reconstructed",
      sense: "tree",
      quote: "“*dru-mos ('thicket') → Greek drumós, Sanskrit druma, Germanic *trumaz.” (Wiktionary)",
      refs: [1, 47, 53, 16],
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
          quote: "“Continues Proto-Indo-European *drumos, from *deru-, *drew- ('tree').” (Wiktionary)",
          refs: [16],
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

    // *daru "oak" (Goidelic Celtic) → Derry
    {
      id: "pc-daru",
      form: "*daru",
      lang: "Proto-Celtic",
      gloss: "oak",
      kind: "reconstructed",
      sense: "oak",
      note: "Celtic narrowed the inherited 'tree' to 'oak'.",
      quote: "“From Proto-Indo-European *dóru ('tree').” (Wiktionary)",
      refs: [57, 58],
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

    // *trugaz "trough" (Germanic, *dru-ko-)
    {
      id: "pgmc-trugaz",
      form: "*trugaz",
      lang: "Proto-Germanic",
      gloss: "trough, wooden vessel",
      kind: "reconstructed",
      sense: "object",
      note: "Its own formation (*dru-ko-) — no closer cognate here, so it sits on the root.",
      quote: "“*drukós ('trough, vessel'), derived from *dóru ('tree, wood').” (Wiktionary)",
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
          children: [{ id: "trough", form: "trough", lang: "English", gloss: "a long open container", kind: "modern", sense: "object", refs: [17] }],
        },
        { id: "de-trog", form: "Trog", lang: "German", gloss: "trough", kind: "modern", sense: "object", refs: [17] },
      ],
    },

    // δένδρον: a unique reduplication, its own formation (Greek)
    {
      id: "gk-dendron",
      form: "δένδρον",
      translit: "déndron",
      lang: "Ancient Greek",
      gloss: "tree",
      kind: "attested",
      sense: "tree",
      disputed: true,
      note: "A reduplicated form based on *dóru, but 'this type of reduplication is highly atypical, so the formation must be regarded as uncertain' (Wiktionary).",
      quote: "“this type of reduplication is highly atypical, so the formation must be regarded as uncertain.” (Wiktionary)",
      refs: [42],
      children: [
        { id: "dendrite", form: "dendrite", lang: "English", gloss: "a branching, tree-like form", kind: "modern", sense: "tree", refs: [43] },
        { id: "dendro", form: "dendro-", lang: "English", gloss: "tree- (combining form)", kind: "modern", sense: "tree", refs: [44] },
        { id: "rhododendron", form: "rhododendron", lang: "English", gloss: "a flowering 'rose-tree' shrub", kind: "modern", sense: "tree", refs: [45] },
        { id: "philodendron", form: "philodendron", lang: "English", gloss: "a 'tree-loving' climbing plant", kind: "modern", sense: "tree", refs: [46] },
      ],
    },

    // *traują "tray" (Germanic)
    {
      id: "pgmc-trauja",
      form: "*traują",
      lang: "Proto-Germanic",
      gloss: "wooden vessel",
      kind: "reconstructed",
      sense: "object",
      quote: "“from PIE *dreu-, variant of root *deru- … original sense ‘might have been wooden vessel.’” (etymonline)",
      refs: [19],
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

    // *daru → druid (Celtic, disputed) — direct reflex of the root
    {
      id: "pc-druwits",
      form: "*druwits",
      lang: "Proto-Celtic",
      gloss: "a druid",
      kind: "reconstructed",
      sense: "other",
      disputed: true,
      note: "Built on *weid- 'to know'. The old 'oak-knower' reading is 'doubtful'; since the 1960s scholars read the first element as *drew- 'firm, solid' → 'great sage'.",
      quote: "“The connection with 'oak' is doubtful both on phonological and historical grounds.” (Wiktionary)",
      refs: [48, 49, 50],
      children: [{ id: "druid", form: "druid", lang: "English", gloss: "a Celtic priest or seer", kind: "modern", sense: "other", refs: [48, 50] }],
    },

    // ── bare-noun reflexes of *dóru (no closer shared ancestor) ──
    { id: "hit-taru", form: "𒋫𒊒", translit: "taru", lang: "Hittite", gloss: "tree, wood", kind: "attested", sense: "tree", note: "Anatolian is the oldest attested Indo-European — a ~4,000-year-old clay-tablet word.", refs: [1] },
    {
      id: "sa-daru",
      form: "दारु",
      translit: "dāru",
      lang: "Sanskrit",
      gloss: "wood, timber",
      kind: "attested",
      sense: "tree",
      quote: "“from Proto-Indo-Iranian *dā́ru ('tree, wood'), from Proto-Indo-European *dóru.” (Wiktionary)",
      refs: [51],
      children: [
        { id: "sa-daruna", form: "दारुण", translit: "dāruṇa", lang: "Sanskrit", gloss: "hard, harsh, cruel", kind: "attested", sense: "firm", note: "The hardness of wood, generalised to 'harsh'.", refs: [54] },
        {
          id: "sa-devadaru",
          form: "देवदारु",
          translit: "devadāru",
          lang: "Sanskrit",
          gloss: "divine tree",
          kind: "attested",
          sense: "tree",
          refs: [55, 56],
          children: [{ id: "deodar", form: "deodar", lang: "English", gloss: "the Himalayan cedar", kind: "modern", sense: "tree", refs: [55, 56] }],
        },
      ],
    },
    { id: "luw-taru", form: "𒋫𒀀𒊒", translit: "tāru", lang: "Luwian", gloss: "tree, wood", kind: "attested", sense: "tree", refs: [1] },
    {
      id: "txb-or",
      form: "or",
      lang: "Tocharian",
      gloss: "wood",
      kind: "attested",
      sense: "tree",
      note: "From the Tarim Basin, in western China.",
      refs: [1],
      children: [{ id: "txb-arwa", form: "ārwa", lang: "Tocharian B", gloss: "firewood", kind: "attested", sense: "object", note: "The plural of or.", refs: [1] }],
    },
    { id: "hy-tram", form: "տրամ", translit: "tram", lang: "Old Armenian", gloss: "firm, solid", kind: "attested", sense: "firm", quote: "“from Proto-Indo-European *dru-rā-mo ('firm, solid').” (Wiktionary)", refs: [66] },
    { id: "hy-tarr", form: "տարր", translit: "tarr", lang: "Old Armenian", gloss: "element, matter, substance", kind: "attested", sense: "other", refs: [1] },
  ],
};
