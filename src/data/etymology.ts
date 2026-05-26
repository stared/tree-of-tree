// The etymological tree of PIE *deru- / *dóru-.
//
// Nodes are WORDS ONLY — every node is an actual form (a reconstructed root,
// a proto-form, an attested word, or a modern word). There are no artificial
// "language-family" grouping nodes; each branch's earliest form hangs directly
// off the root, and a word's language is shown as a small label beneath it.
//
// Colour encodes the word's MEANING (its sense), not its language family.
//
// The view is BOTTOM-UP: the root is the soil; modern words are the canopy.
// `disputed: true` means the link FROM the parent is contested (dashed + "?").
// Sources live in src/data/references.ts and /references.md (the `refs` ids).

export type NodeKind =
  | "root" // the PIE root itself
  | "reconstructed" // starred proto-forms (*trewą, *daru …)
  | "attested" // attested historical words (Old English trēow, Greek δρῦς …)
  | "modern"; // living words & English borrowings (tree, druid, deodar …)

// Meaning buckets — what the word means, regardless of language.
export type SenseId =
  | "tree" // the literal noun: tree, wood
  | "oak" // the narrowed tree
  | "firm" // the adjective sense: firm, solid, hard
  | "faith" // steadfastness → faithful, true, trust
  | "object" // a thing made of wood: trough, tray, tar, spear
  | "other"; // derived / abstract offshoots: healthy, druid, …

export interface SenseMeta {
  id: SenseId;
  short: string; // one-word key label
  label: string; // fuller description (detail panel)
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
  form: string; // the word or reconstruction (asterisk kept for proto-forms)
  lang: string; // language / stage — shown beneath the word
  gloss: string; // short meaning
  kind: NodeKind;
  sense?: SenseId; // meaning bucket → colour (omitted on the root)
  disputed?: boolean; // link from parent is contested
  note?: string; // extra detail / the nature of a dispute
  quote?: string; // short verbatim source quote for the detail panel
  refs?: number[]; // reference ids → references.ts
  children?: EtymNode[];
}

export const TREE: EtymNode = {
  id: "deru",
  form: "*deru- / *dóru-",
  lang: "Proto-Indo-European",
  gloss: "be firm, solid, steadfast; (noun) tree, wood",
  kind: "root",
  note:
    "One root, two faces: an adjective sense 'firm, solid' and a noun 'tree, wood'. " +
    "Every colour below is a different shade of meaning that grew from these two.",
  quote: "“to be firm, solid, steadfast … with specialized senses ‘wood,’ ‘tree.’” (etymonline)",
  refs: [1, 2, 24],
  children: [
    // ───────────── GERMANIC ─────────────
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
          gloss: "tree; timber, wood, beam",
          kind: "attested",
          sense: "tree",
          refs: [3],
          children: [
            { id: "tree", form: "tree", lang: "English", gloss: "a tree", kind: "modern", sense: "tree", refs: [3] },
          ],
        },
        { id: "got-triu", form: "triu", lang: "Gothic", gloss: "tree, wood", kind: "attested", sense: "tree", refs: [4] },
        { id: "on-tre", form: "tré", lang: "Old Norse", gloss: "tree", kind: "attested", sense: "tree", refs: [4] },
      ],
    },
    {
      id: "pgmc-treuwaz",
      form: "*treuwaz / *triwwiz",
      lang: "Proto-Germanic",
      gloss: "having good faith; faithful, true",
      kind: "reconstructed",
      sense: "faith",
      note: "etymonline reconstructs *treuwaz; Wiktionary *triwwiz. Competing notations of one etymon.",
      quote: "“*triwwiz ('faithful, true') … extension of *dóru ('tree'). More at tree.” (Wiktionary)",
      refs: [5, 6],
      children: [
        {
          id: "oe-triewe",
          form: "trīewe / trēowe",
          lang: "Old English",
          gloss: "faithful, trustworthy, steady",
          kind: "attested",
          sense: "faith",
          refs: [5],
          children: [
            { id: "true", form: "true", lang: "English", gloss: "consistent with fact; faithful", kind: "modern", sense: "faith", refs: [5] },
          ],
        },
        {
          id: "oe-treowth",
          form: "trēowþ",
          lang: "Old English",
          gloss: "faith, fidelity, a pledge",
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
              gloss: "a solemn pledge (doublet of truth)",
              kind: "modern",
              sense: "faith",
              refs: [8],
              children: [
                { id: "betroth", form: "betroth", lang: "English", gloss: "to promise in marriage", kind: "modern", sense: "faith", note: "be- + Middle English treowðe 'a pledge'.", refs: [9] },
              ],
            },
          ],
        },
        { id: "trow", form: "trow", lang: "English (archaic)", gloss: "to believe, trust, suppose", kind: "modern", sense: "faith", refs: [10] },
        { id: "truce", form: "truce", lang: "English", gloss: "an agreed pause in fighting", kind: "modern", sense: "faith", note: "Plural of Old English trēow 'pledge, faith'.", refs: [22] },
        { id: "trig", form: "trig", lang: "English (dialectal)", gloss: "neat, firm, sound", kind: "modern", sense: "firm", note: "Via Old Norse tryggr 'firm, trusty'. Unrelated to trig = trigonometry.", refs: [14] },
        { id: "de-treu", form: "treu", lang: "German", gloss: "faithful, loyal", kind: "modern", sense: "faith", refs: [23, 5] },
        { id: "nl-trouw", form: "trouw", lang: "Dutch", gloss: "faithful; fidelity", kind: "modern", sense: "faith", refs: [5] },
        { id: "got-triggws", form: "triggws", lang: "Gothic", gloss: "faithful, true", kind: "attested", sense: "faith", refs: [5, 6] },
      ],
    },
    {
      id: "pgmc-trausta",
      form: "*traustą",
      lang: "Proto-Germanic",
      gloss: "confidence, help (← *traustaz 'firm, strong')",
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
              gloss: "reliance on someone's integrity",
              kind: "modern",
              sense: "faith",
              refs: [11],
              children: [
                { id: "trusty", form: "trusty", lang: "English", gloss: "dependable", kind: "modern", sense: "faith", refs: [13] },
              ],
            },
          ],
        },
        { id: "de-trost", form: "Trost", lang: "German", gloss: "comfort, consolation", kind: "modern", sense: "faith", refs: [12] },
        { id: "nl-troost", form: "troost", lang: "Dutch", gloss: "comfort", kind: "modern", sense: "faith", refs: [12] },
      ],
    },
    {
      id: "pgmc-trumaz",
      form: "*trumaz",
      lang: "Proto-Germanic",
      gloss: "firm, strong (← *drumos)",
      kind: "reconstructed",
      sense: "firm",
      quote: "“Continues Proto-Indo-European *drumos, from *deru-, *drew- ('tree').” (Wiktionary)",
      refs: [16],
      children: [
        {
          id: "oe-trum",
          form: "trum / trymman",
          lang: "Old English",
          gloss: "strong, firm; to make firm",
          kind: "attested",
          sense: "firm",
          refs: [15, 16],
          children: [
            {
              id: "trim",
              form: "trim",
              lang: "English",
              gloss: "neat, in good order; to make tidy",
              kind: "modern",
              sense: "firm",
              disputed: true,
              note: "The Old English→PIE chain is sound, but trim 'is missing in Middle English after about 1250, which makes connection uncertain' (etymonline).",
              quote: "“the word is missing in Middle English after about 1250, which makes connection uncertain.” (etymonline)",
              refs: [15],
            },
          ],
        },
      ],
    },
    {
      id: "pgmc-trugaz",
      form: "*trugaz",
      lang: "Proto-Germanic",
      gloss: "trough, wooden vessel (← *dru-ko-)",
      kind: "reconstructed",
      sense: "object",
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
          children: [
            { id: "trough", form: "trough", lang: "English", gloss: "a long open container", kind: "modern", sense: "object", refs: [17] },
          ],
        },
        { id: "de-trog", form: "Trog", lang: "German", gloss: "trough", kind: "modern", sense: "object", refs: [17] },
      ],
    },
    {
      id: "pgmc-trauja",
      form: "*traują",
      lang: "Proto-Germanic",
      gloss: "(probably) a wooden vessel",
      kind: "reconstructed",
      sense: "object",
      note: "PIE link per etymonline (*dreu-, variant of *deru-); the Wiktionary Old English page stops at Proto-Germanic.",
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
          children: [
            { id: "tray", form: "tray", lang: "English", gloss: "a flat carrying board", kind: "modern", sense: "object", refs: [19] },
          ],
        },
      ],
    },
    {
      id: "pgmc-terwa",
      form: "*terwą",
      lang: "Proto-Germanic",
      gloss: "tar — 'the pitch of (certain) trees' (← *derw-)",
      kind: "reconstructed",
      sense: "object",
      quote: "“literally ‘the pitch of (certain kinds) of trees’ … from PIE *derw-, a variant of the root *deru-.” (etymonline)",
      refs: [20, 21],
      children: [
        {
          id: "oe-teoru",
          form: "teoru",
          lang: "Old English",
          gloss: "tar, bitumen, resin",
          kind: "attested",
          sense: "object",
          refs: [20],
          children: [
            { id: "tar", form: "tar", lang: "English", gloss: "dark viscous wood/coal pitch", kind: "modern", sense: "object", refs: [20] },
          ],
        },
        { id: "de-teer", form: "Teer", lang: "German", gloss: "tar", kind: "modern", sense: "object", refs: [21] },
      ],
    },

    // ───────────── HELLENIC (Greek) ─────────────
    {
      id: "gk-drys",
      form: "δρῦς (drŷs)",
      lang: "Ancient Greek",
      gloss: "oak; tree",
      kind: "attested",
      sense: "oak",
      quote: "“From oblique case forms with *drew-, a stem of Proto-Indo-European *dóru ('tree').” (Wiktionary)",
      refs: [38],
      children: [
        {
          id: "gk-dryas",
          form: "Δρυάς (Dryás)",
          lang: "Ancient Greek",
          gloss: "wood-nymph",
          kind: "attested",
          sense: "tree",
          refs: [39],
          children: [
            { id: "dryad", form: "dryad", lang: "English", gloss: "a tree nymph", kind: "modern", sense: "tree", refs: [39] },
            { id: "hamadryad", form: "hamadryad", lang: "English", gloss: "nymph fated to die with her tree", kind: "modern", sense: "tree", note: "hama- 'together with' + dryas.", refs: [39] },
          ],
        },
      ],
    },
    {
      id: "gk-doru",
      form: "δόρυ (dóry)",
      lang: "Ancient Greek",
      gloss: "wood; spear-shaft, spear",
      kind: "attested",
      sense: "object",
      quote: "“From Proto-Hellenic *dóru, from Proto-Indo-European *dóru.” (Wiktionary)",
      refs: [40],
      children: [
        { id: "dory", form: "dory / doru", lang: "English", gloss: "the long hoplite spear", kind: "modern", sense: "object", note: "Not the flat-bottomed boat, nor the fish 'John Dory' — both unrelated.", refs: [40, 41] },
      ],
    },
    {
      id: "gk-dendron",
      form: "δένδρον (déndron)",
      lang: "Ancient Greek",
      gloss: "tree",
      kind: "attested",
      sense: "tree",
      disputed: true,
      note: "A reduplicated *der-drew-om based on *dóru, but 'this type of reduplication is highly atypical, so the formation must be regarded as uncertain' (Wiktionary).",
      quote: "“this type of reduplication is highly atypical, so the formation must be regarded as uncertain.” (Wiktionary)",
      refs: [42],
      children: [
        { id: "dendrite", form: "dendrite", lang: "English", gloss: "branching, tree-like form (incl. neuron)", kind: "modern", sense: "tree", refs: [43] },
        { id: "dendro", form: "dendro- / dendrochronology", lang: "English", gloss: "tree- (combining form); tree-ring dating", kind: "modern", sense: "tree", refs: [44] },
        { id: "rhododendron", form: "rhododendron", lang: "English", gloss: "'rose-tree' shrub", kind: "modern", sense: "tree", refs: [45] },
        { id: "philodendron", form: "philodendron", lang: "English", gloss: "'tree-loving' climbing plant", kind: "modern", sense: "tree", refs: [46] },
      ],
    },
    {
      id: "gk-drymos",
      form: "δρυμός (drymós)",
      lang: "Ancient Greek",
      gloss: "thicket, oak forest",
      kind: "attested",
      sense: "tree",
      note: "Same root as δόρυ/δρῦς; no English descendant.",
      refs: [47, 1],
    },

    // ───────────── ITALIC (Latin) ─────────────
    {
      id: "la-durus",
      form: "dūrus",
      lang: "Latin",
      gloss: "hard, tough, harsh",
      kind: "attested",
      sense: "firm",
      disputed: true,
      note: "AHD/Watkins (and etymonline) derive dūrus from *deru- 'be firm'. But de Vaan (2008) prefers PIE *duh₂-ró- 'long' (← *dweh₂- 'far, long'). The whole hard-words family below hangs on this one contested step.",
      quote: "“there are semantic problems if the change ‘long’ > ‘enduring’ is not accepted.” (de Vaan, via Wiktionary)",
      refs: [26, 27, 24, 2],
      children: [
        { id: "durable", form: "durable", lang: "English", gloss: "able to last", kind: "modern", sense: "firm", refs: [28] },
        { id: "endure", form: "endure", lang: "English", gloss: "to last; to bear", kind: "modern", sense: "firm", note: "Latin indūrāre 'make hard'.", refs: [31] },
        { id: "duration", form: "duration", lang: "English", gloss: "length of time", kind: "modern", sense: "firm", refs: [29] },
        { id: "during", form: "during", lang: "English", gloss: "throughout the time of", kind: "modern", sense: "firm", refs: [30] },
        { id: "dour", form: "dour", lang: "English", gloss: "stern, gloomy, hard", kind: "modern", sense: "firm", refs: [33] },
        { id: "duress", form: "duress", lang: "English", gloss: "coercion (Latin dūritia 'hardness')", kind: "modern", sense: "firm", refs: [34] },
        { id: "obdurate", form: "obdurate", lang: "English", gloss: "stubborn, hardened", kind: "modern", sense: "firm", refs: [35] },
        { id: "indurate", form: "indurate", lang: "English", gloss: "to harden", kind: "modern", sense: "firm", refs: [36] },
        { id: "duramen", form: "duramen", lang: "English", gloss: "heartwood", kind: "modern", sense: "object", refs: [24] },
        { id: "duramater", form: "dura mater", lang: "English", gloss: "'hard mother' — tough brain membrane", kind: "modern", sense: "firm", refs: [37] },
      ],
    },

    // ───────────── CELTIC ─────────────
    {
      id: "pc-daru",
      form: "*daru / *derwo-",
      lang: "Proto-Celtic",
      gloss: "oak (a 'tree → oak' narrowing)",
      kind: "reconstructed",
      sense: "oak",
      quote: "“From Proto-Indo-European *dóru ('tree').” (Wiktionary)",
      refs: [57, 59],
      children: [
        {
          id: "oir-dair",
          form: "daur / dair",
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
              children: [
                { id: "derry", form: "Derry", lang: "place name", gloss: "city < Daire 'oak grove'", kind: "modern", sense: "oak", refs: [60, 61] },
              ],
            },
          ],
        },
        { id: "cy-derw", form: "derw", lang: "Welsh", gloss: "oaks; oak (collective)", kind: "modern", sense: "oak", refs: [59] },
      ],
    },
    {
      id: "pc-druwits",
      form: "*druwits",
      lang: "Proto-Celtic",
      gloss: "druid — 'oak-knower' or 'firm/great knower'",
      kind: "reconstructed",
      sense: "other",
      disputed: true,
      note: "First element + *weid- 'to know'. The 'oak' (*deru-) reading is 'doubtful both on phonological and historical grounds'; since the 1960s scholars prefer *drew- 'firm, solid' → 'great sage'. Only the 'oak' gloss is contested.",
      quote: "“The connection with 'oak' is doubtful both on phonological and historical grounds.” (Wiktionary)",
      refs: [48, 49, 50],
      children: [
        { id: "druid", form: "druid", lang: "English", gloss: "Celtic priest/seer", kind: "modern", sense: "other", refs: [48, 50] },
      ],
    },

    // ───────────── INDO-IRANIAN ─────────────
    {
      id: "sa-daru",
      form: "दारु (dāru)",
      lang: "Sanskrit",
      gloss: "wood, timber",
      kind: "attested",
      sense: "tree",
      quote: "“from Proto-Indo-Iranian *dā́ru ('tree, wood'), from Proto-Indo-European *dóru.” (Wiktionary)",
      refs: [51],
      children: [
        { id: "sa-daruna", form: "दारुण (dāruṇa)", lang: "Sanskrit", gloss: "hard, harsh, cruel", kind: "attested", sense: "firm", note: "From dāru 'wood' — first the hardness of wood, then 'harsh'.", refs: [54] },
        {
          id: "sa-devadaru",
          form: "देवदारु (devadāru)",
          lang: "Sanskrit",
          gloss: "'divine tree' (deva + dāru)",
          kind: "attested",
          sense: "tree",
          refs: [55, 56],
          children: [
            { id: "deodar", form: "deodar", lang: "English", gloss: "the Himalayan cedar", kind: "modern", sense: "tree", refs: [55, 56] },
          ],
        },
      ],
    },
    { id: "sa-dru", form: "द्रु (dru)", lang: "Sanskrit", gloss: "wood; tree, branch", kind: "attested", sense: "tree", refs: [52] },
    { id: "sa-druma", form: "द्रुम (druma)", lang: "Sanskrit", gloss: "tree (← *drumós)", kind: "attested", sense: "tree", refs: [53] },

    // ───────────── BALTO-SLAVIC ─────────────
    {
      id: "psl-dervo",
      form: "*dervo",
      lang: "Proto-Slavic",
      gloss: "tree, wood",
      kind: "reconstructed",
      sense: "tree",
      quote: "“from Proto-Balto-Slavic *dérwan, from Proto-Indo-European *derw-o-m.” (Wiktionary)",
      refs: [62],
      children: [
        { id: "ru-derevo", form: "де́рево (dérevo)", lang: "Russian", gloss: "tree", kind: "modern", sense: "tree", refs: [62] },
        { id: "pl-drzewo", form: "drzewo", lang: "Polish", gloss: "tree", kind: "modern", sense: "tree", refs: [62] },
        { id: "ocs-drevo", form: "дрѣво (drěvo)", lang: "Old Church Slavonic", gloss: "tree", kind: "attested", sense: "tree", refs: [62] },
      ],
    },
    {
      id: "psl-sdorvu",
      form: "*sъdorvъ",
      lang: "Proto-Slavic",
      gloss: "healthy — 'of good wood'?",
      kind: "reconstructed",
      sense: "other",
      disputed: true,
      note: "*sъ- 'good' + *-dorv-. The popular 'made of good wood' reading links *-dorv- to *dóru 'tree'; but Wiktionary calls the second element's origin 'uncertain', and Meillet/Derksen instead derive it from *dʰer- 'to support, hold'.",
      quote: "“The exact origin of the second component *dorv- is uncertain.” (Wiktionary)",
      refs: [63],
      children: [
        { id: "ru-zdorov", form: "здоро́вый (zdoróvyj)", lang: "Russian", gloss: "healthy", kind: "modern", sense: "other", refs: [63] },
        { id: "pl-zdrowy", form: "zdrowy", lang: "Polish", gloss: "healthy", kind: "modern", sense: "other", refs: [63] },
      ],
    },
    { id: "lt-derva", form: "derva", lang: "Lithuanian", gloss: "tar; resinous wood, kindling", kind: "modern", sense: "object", note: "From Proto-Balto-Slavic *dérwa 'tree' — the Baltic cousin of Germanic tar.", refs: [64] },

    // ───────────── ANATOLIAN ─────────────
    { id: "hit-taru", form: "𒋫𒊒 (taru / tāru)", lang: "Hittite", gloss: "tree, wood", kind: "attested", sense: "tree", note: "Anatolian is the oldest attested Indo-European; these are ~4,000-year-old clay-tablet words.", refs: [1] },
    { id: "luw-taru", form: "𒋫𒀀𒊒 (tāru)", lang: "Luwian", gloss: "tree, wood", kind: "attested", sense: "tree", refs: [1] },

    // ───────────── ALBANIAN ─────────────
    {
      id: "sq-dru",
      form: "dru",
      lang: "Albanian",
      gloss: "wood, tree; firewood; timber",
      kind: "modern",
      sense: "tree",
      quote: "“from Proto-Albanian *druwa, from Proto-Indo-European *druh₂-ó-m, from *dóru.” (Wiktionary)",
      refs: [65],
    },

    // ───────────── ARMENIAN ─────────────
    {
      id: "hy-tram",
      form: "տրամ (tram)",
      lang: "Old Armenian",
      gloss: "firm, solid",
      kind: "attested",
      sense: "firm",
      note: "From *dru-rā-mo- 'firm, solid', related to *dóru — the 'firm' face of the root, cognate with Germanic *trumaz.",
      quote: "“from Proto-Indo-European *dru-rā-mo ('firm, solid') … related to *dóru ('tree').” (Wiktionary)",
      refs: [66],
    },
    { id: "hy-torg", form: "տորգ (torg)", lang: "Old Armenian", gloss: "wooden framework; fabric, net", kind: "attested", sense: "object", refs: [1] },
    { id: "hy-tarr", form: "տարր (tarr)", lang: "Old Armenian", gloss: "element, matter, substance", kind: "attested", sense: "other", refs: [1] },

    // ───────────── TOCHARIAN ─────────────
    { id: "txb-or", form: "or", lang: "Tocharian A/B", gloss: "wood", kind: "attested", sense: "tree", note: "From the Tarim Basin (western China).", refs: [1] },
    { id: "txb-arwa", form: "ārwa", lang: "Tocharian B", gloss: "firewood (plural of or)", kind: "attested", sense: "object", refs: [1] },
  ],
};
