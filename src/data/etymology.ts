// The etymological tree of PIE *deru- / *dóru-.
//
// Topology (strict tree, bottom-up in the view — root is the soil, modern
// words are the canopy):
//   root  →  branch (language family)  →  reconstructed proto-forms  →
//   attested ancient words  →  modern words / English borrowings
//
// Every claim is sourced via `refs` (see src/data/references.ts and
// /references.md). `disputed: true` on a node means the link FROM ITS PARENT
// is contested — those edges render dashed with a "?" and can be toggled off.

export type NodeKind =
  | "root" // PIE root
  | "branch" // language-family grouping node (the trunk splits)
  | "reconstructed" // starred proto-forms (*trewą, *daru …)
  | "attested" // attested historical words (Old English trēow, Greek δρῦς …)
  | "modern"; // living words & English borrowings (tree, druid, deodar …)

export type BranchId =
  | "germanic"
  | "hellenic"
  | "italic"
  | "celtic"
  | "indo-iranian"
  | "balto-slavic"
  | "anatolian"
  | "albanian"
  | "armenian"
  | "tocharian";

export interface BranchMeta {
  id: BranchId;
  name: string;
  color: string;
}

// Colour per branch — a warm-to-cool wheel so siblings stay distinguishable.
export const BRANCHES: Record<BranchId, BranchMeta> = {
  germanic: { id: "germanic", name: "Germanic", color: "#c0563b" },
  hellenic: { id: "hellenic", name: "Hellenic (Greek)", color: "#d98a29" },
  italic: { id: "italic", name: "Italic (Latin)", color: "#c9a227" },
  celtic: { id: "celtic", name: "Celtic", color: "#5e9c4f" },
  "indo-iranian": { id: "indo-iranian", name: "Indo-Iranian", color: "#3f9e8c" },
  "balto-slavic": { id: "balto-slavic", name: "Balto-Slavic", color: "#3f7fae" },
  anatolian: { id: "anatolian", name: "Anatolian", color: "#6a6fbd" },
  albanian: { id: "albanian", name: "Albanian", color: "#9163b6" },
  armenian: { id: "armenian", name: "Armenian", color: "#b25779" },
  tocharian: { id: "tocharian", name: "Tocharian", color: "#8a7b66" },
};

export interface EtymNode {
  id: string;
  form: string; // the word or reconstruction (asterisk kept for proto-forms)
  lang: string; // language / stage
  gloss: string; // short meaning
  kind: NodeKind;
  branch?: BranchId; // set on branch nodes; descendants inherit it for colour
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
    "One root, two faces: an adjective-like sense 'firm, solid' and a noun 'tree, wood'. " +
    "etymonline labels it *deru- 'be firm, solid, steadfast'; Wiktionary headwords the noun *dóru 'tree'. " +
    "Both senses fan out below — which is why 'tree' and 'true' are relatives.",
  quote:
    "“to be firm, solid, steadfast … with specialized senses ‘wood,’ ‘tree.’” (etymonline)",
  refs: [1, 2, 24],
  children: [
    // ───────────────────────────── GERMANIC ─────────────────────────────
    {
      id: "germanic",
      form: "Germanic",
      lang: "branch",
      gloss: "Proto-Germanic and its daughters (English, German, Norse…)",
      kind: "branch",
      branch: "germanic",
      children: [
        {
          id: "pgmc-trewa",
          form: "*trewą",
          lang: "Proto-Germanic",
          gloss: "tree, wood",
          kind: "reconstructed",
          quote: "“from PIE *drew-o-, suffixed variant form of root *deru-.” (etymonline)",
          refs: [3, 4],
          children: [
            {
              id: "oe-treow",
              form: "trēow",
              lang: "Old English",
              gloss: "tree; timber, wood, beam",
              kind: "attested",
              refs: [3],
              children: [
                {
                  id: "tree",
                  form: "tree",
                  lang: "English",
                  gloss: "a tree",
                  kind: "modern",
                  refs: [3],
                },
              ],
            },
            { id: "got-triu", form: "triu", lang: "Gothic", gloss: "tree, wood", kind: "attested", refs: [4] },
            { id: "on-tre", form: "tré", lang: "Old Norse", gloss: "tree", kind: "attested", refs: [4] },
          ],
        },
        {
          id: "pgmc-treuwaz",
          form: "*treuwaz / *triwwiz",
          lang: "Proto-Germanic",
          gloss: "having good faith; faithful, true",
          kind: "reconstructed",
          note:
            "etymonline reconstructs *treuwaz; Wiktionary *triwwiz (Gothic triggws implies a geminate *triggwaz). Competing notations of one etymon.",
          quote: "“*triwwiz ('faithful, true') … extension of *dóru ('tree'). More at tree.” (Wiktionary)",
          refs: [5, 6],
          children: [
            {
              id: "oe-triewe",
              form: "trīewe / trēowe",
              lang: "Old English",
              gloss: "faithful, trustworthy, steady",
              kind: "attested",
              refs: [5],
              children: [
                { id: "true", form: "true", lang: "English", gloss: "consistent with fact; faithful", kind: "modern", refs: [5] },
              ],
            },
            {
              id: "oe-treowth",
              form: "trēowþ",
              lang: "Old English",
              gloss: "faith, fidelity, a pledge",
              kind: "attested",
              quote: "“shares roots with troth, truce, trust, and tree.” (etymonline)",
              refs: [7],
              children: [
                { id: "truth", form: "truth", lang: "English", gloss: "what is true; veracity", kind: "modern", refs: [7] },
                {
                  id: "troth",
                  form: "troth",
                  lang: "English",
                  gloss: "a solemn pledge (doublet of truth)",
                  kind: "modern",
                  refs: [8],
                  children: [
                    { id: "betroth", form: "betroth", lang: "English", gloss: "to promise in marriage", kind: "modern", note: "be- + Middle English treowðe 'a pledge'.", refs: [9] },
                  ],
                },
              ],
            },
            { id: "trow", form: "trow", lang: "English (archaic)", gloss: "to believe, trust, suppose", kind: "modern", refs: [10] },
            { id: "truce", form: "truce", lang: "English", gloss: "an agreed pause in fighting", kind: "modern", note: "Plural of Old English trēow 'pledge, faith'.", refs: [22] },
            { id: "trig", form: "trig", lang: "English (dialectal)", gloss: "neat, trim; firm, sound", kind: "modern", note: "Via Old Norse tryggr 'firm, trusty'. Unrelated to trig = trigonometry.", refs: [14] },
            { id: "de-treu", form: "treu", lang: "German", gloss: "faithful, loyal", kind: "modern", refs: [23, 5] },
            { id: "nl-trouw", form: "trouw", lang: "Dutch", gloss: "faithful; fidelity", kind: "modern", refs: [5] },
            { id: "got-triggws", form: "triggws", lang: "Gothic", gloss: "faithful, true", kind: "attested", refs: [5, 6] },
          ],
        },
        {
          id: "pgmc-trausta",
          form: "*traustą",
          lang: "Proto-Germanic",
          gloss: "confidence, help (from *traustaz 'firm, strong')",
          kind: "reconstructed",
          quote: "“*traustą … From *traustaz ('firm, strong').” (Wiktionary)",
          refs: [11, 12],
          children: [
            {
              id: "on-traust",
              form: "traust",
              lang: "Old Norse",
              gloss: "help, confidence, protection",
              kind: "attested",
              refs: [11],
              children: [
                {
                  id: "trust",
                  form: "trust",
                  lang: "English",
                  gloss: "reliance on someone's integrity",
                  kind: "modern",
                  refs: [11],
                  children: [
                    { id: "trusty", form: "trusty", lang: "English", gloss: "dependable", kind: "modern", refs: [13] },
                  ],
                },
              ],
            },
            { id: "de-trost", form: "Trost", lang: "German", gloss: "comfort, consolation", kind: "modern", refs: [12] },
            { id: "nl-troost", form: "troost", lang: "Dutch", gloss: "comfort", kind: "modern", refs: [12] },
          ],
        },
        {
          id: "pgmc-trumaz",
          form: "*trumaz",
          lang: "Proto-Germanic",
          gloss: "firm, strong (← *drumos)",
          kind: "reconstructed",
          quote: "“Continues Proto-Indo-European *drumos, from *deru-, *drew- ('tree').” (Wiktionary)",
          refs: [16],
          children: [
            {
              id: "oe-trum",
              form: "trum / trymman",
              lang: "Old English",
              gloss: "strong, firm; to make firm",
              kind: "attested",
              refs: [15, 16],
              children: [
                {
                  id: "trim",
                  form: "trim",
                  lang: "English",
                  gloss: "neat, in good order; to make tidy",
                  kind: "modern",
                  disputed: true,
                  note:
                    "The Old English→PIE chain is sound, but trim 'is missing in Middle English after about 1250, which makes connection uncertain' (etymonline).",
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
          quote: "“*drukós ('trough, vessel'), derived from *dóru ('tree, wood').” (Wiktionary)",
          refs: [17, 18],
          children: [
            {
              id: "oe-trog",
              form: "trog",
              lang: "Old English",
              gloss: "shallow wooden vessel",
              kind: "attested",
              refs: [17],
              children: [
                { id: "trough", form: "trough", lang: "English", gloss: "a long open container", kind: "modern", refs: [17] },
              ],
            },
            { id: "de-trog", form: "Trog", lang: "German", gloss: "trough", kind: "modern", refs: [17] },
          ],
        },
        {
          id: "pgmc-trauja",
          form: "*traują",
          lang: "Proto-Germanic",
          gloss: "(probably) a wooden vessel",
          kind: "reconstructed",
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
              refs: [19],
              children: [
                { id: "tray", form: "tray", lang: "English", gloss: "a flat carrying board", kind: "modern", refs: [19] },
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
          quote: "“literally ‘the pitch of (certain kinds) of trees’ … from PIE *derw-, a variant of the root *deru-.” (etymonline)",
          refs: [20, 21],
          children: [
            {
              id: "oe-teoru",
              form: "teoru",
              lang: "Old English",
              gloss: "tar, bitumen, resin",
              kind: "attested",
              refs: [20],
              children: [
                { id: "tar", form: "tar", lang: "English", gloss: "dark viscous wood/coal pitch", kind: "modern", refs: [20] },
              ],
            },
            { id: "de-teer", form: "Teer", lang: "German", gloss: "tar", kind: "modern", refs: [21] },
          ],
        },
      ],
    },

    // ───────────────────────────── HELLENIC ─────────────────────────────
    {
      id: "hellenic",
      form: "Hellenic",
      lang: "branch",
      gloss: "Ancient Greek",
      kind: "branch",
      branch: "hellenic",
      children: [
        {
          id: "gk-drys",
          form: "δρῦς (drŷs)",
          lang: "Ancient Greek",
          gloss: "oak; tree",
          kind: "attested",
          quote: "“From oblique case forms with *drew-, a stem of Proto-Indo-European *dóru ('tree').” (Wiktionary)",
          refs: [38],
          children: [
            {
              id: "gk-dryas",
              form: "Δρυάς (Dryás)",
              lang: "Ancient Greek",
              gloss: "wood-nymph",
              kind: "attested",
              refs: [39],
              children: [
                { id: "dryad", form: "dryad", lang: "English", gloss: "a tree nymph", kind: "modern", refs: [39] },
                { id: "hamadryad", form: "hamadryad", lang: "English", gloss: "nymph fated to die with her tree", kind: "modern", note: "hama- 'together with' + dryas.", refs: [39] },
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
          quote: "“From Proto-Hellenic *dóru, from Proto-Indo-European *dóru.” (Wiktionary)",
          refs: [40],
          children: [
            { id: "dory", form: "dory / doru", lang: "English", gloss: "the long hoplite spear", kind: "modern", note: "Not the flat-bottomed boat, nor the fish 'John Dory' — both unrelated.", refs: [40, 41] },
          ],
        },
        {
          id: "gk-dendron",
          form: "δένδρον (déndron)",
          lang: "Ancient Greek",
          gloss: "tree",
          kind: "attested",
          disputed: true,
          note:
            "A reduplicated *der-drew-om based on *dóru, but 'this type of reduplication is highly atypical, so the formation must be regarded as uncertain' (Wiktionary).",
          quote: "“this type of reduplication is highly atypical, so the formation must be regarded as uncertain.” (Wiktionary)",
          refs: [42],
          children: [
            { id: "dendrite", form: "dendrite", lang: "English", gloss: "branching, tree-like form (incl. neuron)", kind: "modern", refs: [43] },
            { id: "dendro", form: "dendro- / dendrochronology", lang: "English", gloss: "tree- (combining form); tree-ring dating", kind: "modern", refs: [44] },
            { id: "rhododendron", form: "rhododendron", lang: "English", gloss: "'rose-tree' shrub (rhodon + dendron)", kind: "modern", refs: [45] },
            { id: "philodendron", form: "philodendron", lang: "English", gloss: "'tree-loving' climbing plant (philo- + dendron)", kind: "modern", refs: [46] },
          ],
        },
        {
          id: "gk-drymos",
          form: "δρυμός (drymós)",
          lang: "Ancient Greek",
          gloss: "thicket, oak forest",
          kind: "attested",
          note: "Same root as δόρυ/δρῦς; no English descendant.",
          refs: [47, 1],
        },
      ],
    },

    // ────────────────────────────── ITALIC ──────────────────────────────
    {
      id: "italic",
      form: "Italic (Latin)",
      lang: "branch",
      gloss: "Latin dūrus 'hard' and its family",
      kind: "branch",
      branch: "italic",
      children: [
        {
          id: "la-durus",
          form: "dūrus",
          lang: "Latin",
          gloss: "hard, tough, harsh",
          kind: "attested",
          disputed: true,
          note:
            "AHD/Watkins (and etymonline) derive dūrus from *deru- 'be firm'. But de Vaan (2008) prefers PIE *duh₂-ró- 'long' (← *dweh₂- 'far, long'), demoting *deru- to an alternative. The whole hard-words family below hangs on this one contested step.",
          quote: "“there are semantic problems if the change ‘long’ > ‘enduring’ is not accepted.” (de Vaan, via Wiktionary)",
          refs: [26, 27, 24, 2],
          children: [
            { id: "durable", form: "durable", lang: "English", gloss: "able to last", kind: "modern", refs: [28] },
            { id: "endure", form: "endure", lang: "English", gloss: "to last; to bear", kind: "modern", note: "Latin indūrāre 'make hard'.", refs: [31] },
            { id: "duration", form: "duration", lang: "English", gloss: "length of time", kind: "modern", refs: [29] },
            { id: "during", form: "during", lang: "English", gloss: "throughout the time of", kind: "modern", refs: [30] },
            { id: "dour", form: "dour", lang: "English", gloss: "stern, gloomy, hard", kind: "modern", refs: [33] },
            { id: "duress", form: "duress", lang: "English", gloss: "coercion (Latin dūritia 'hardness')", kind: "modern", refs: [34] },
            { id: "obdurate", form: "obdurate", lang: "English", gloss: "stubborn, hardened", kind: "modern", refs: [35] },
            { id: "indurate", form: "indurate", lang: "English", gloss: "to harden", kind: "modern", refs: [36] },
            { id: "duramen", form: "duramen", lang: "English", gloss: "heartwood", kind: "modern", refs: [24] },
            { id: "duramater", form: "dura mater", lang: "English", gloss: "'hard mother' — tough brain membrane", kind: "modern", refs: [37] },
          ],
        },
      ],
    },

    // ────────────────────────────── CELTIC ──────────────────────────────
    {
      id: "celtic",
      form: "Celtic",
      lang: "branch",
      gloss: "Proto-Celtic and its daughters",
      kind: "branch",
      branch: "celtic",
      children: [
        {
          id: "pc-daru",
          form: "*daru / *derwo-",
          lang: "Proto-Celtic",
          gloss: "oak (a 'tree → oak' narrowing)",
          kind: "reconstructed",
          quote: "“From Proto-Indo-European *dóru ('tree').” (Wiktionary)",
          refs: [57, 59],
          children: [
            {
              id: "oir-dair",
              form: "daur / dair",
              lang: "Old Irish",
              gloss: "oak",
              kind: "attested",
              refs: [58],
              children: [
                {
                  id: "doire",
                  form: "doire",
                  lang: "Irish",
                  gloss: "oak grove",
                  kind: "modern",
                  refs: [60],
                  children: [
                    { id: "derry", form: "Derry", lang: "place name", gloss: "city < Daire 'oak grove'", kind: "modern", refs: [60, 61] },
                  ],
                },
              ],
            },
            { id: "cy-derw", form: "derw", lang: "Welsh", gloss: "oaks; oak (collective)", kind: "modern", refs: [59] },
          ],
        },
        {
          id: "pc-druwits",
          form: "*druwits",
          lang: "Proto-Celtic",
          gloss: "druid — 'oak-knower' or 'firm/great knower'",
          kind: "reconstructed",
          disputed: true,
          note:
            "First element + *weid- 'to know'. The 'oak' (*deru-) reading is 'doubtful both on phonological and historical grounds'; since the 1960s scholars prefer *drew- 'firm, solid' → 'great sage'. Either way the first element sits in the *deru-/*drew- complex; only the 'oak' gloss is contested.",
          quote: "“The connection with 'oak' is doubtful both on phonological and historical grounds.” (Wiktionary)",
          refs: [48, 49, 50],
          children: [
            { id: "druid", form: "druid", lang: "English", gloss: "Celtic priest/seer", kind: "modern", refs: [48, 50] },
          ],
        },
      ],
    },

    // ─────────────────────────── INDO-IRANIAN ───────────────────────────
    {
      id: "indo-iranian",
      form: "Indo-Iranian",
      lang: "branch",
      gloss: "Sanskrit, Avestan, Persian…",
      kind: "branch",
      branch: "indo-iranian",
      children: [
        {
          id: "sa-daru",
          form: "दारु (dāru)",
          lang: "Sanskrit",
          gloss: "wood, timber",
          kind: "attested",
          quote: "“from Proto-Indo-Iranian *dā́ru ('tree, wood'), from Proto-Indo-European *dóru.” (Wiktionary)",
          refs: [51],
          children: [
            { id: "sa-daruna", form: "दारुण (dāruṇa)", lang: "Sanskrit", gloss: "hard, harsh, cruel", kind: "attested", note: "From dāru 'wood' — first the hardness of wood, then 'harsh'.", refs: [54] },
            {
              id: "sa-devadaru",
              form: "देवदारु (devadāru)",
              lang: "Sanskrit",
              gloss: "'divine tree' (deva + dāru)",
              kind: "attested",
              refs: [55, 56],
              children: [
                { id: "deodar", form: "deodar", lang: "English", gloss: "the Himalayan cedar", kind: "modern", refs: [55, 56] },
              ],
            },
          ],
        },
        { id: "sa-dru", form: "द्रु (dru)", lang: "Sanskrit", gloss: "wood; tree, branch", kind: "attested", refs: [52] },
        { id: "sa-druma", form: "द्रुम (druma)", lang: "Sanskrit", gloss: "tree (← *drumós)", kind: "attested", refs: [53] },
      ],
    },

    // ─────────────────────────── BALTO-SLAVIC ───────────────────────────
    {
      id: "balto-slavic",
      form: "Balto-Slavic",
      lang: "branch",
      gloss: "Slavic and Baltic",
      kind: "branch",
      branch: "balto-slavic",
      children: [
        {
          id: "psl-dervo",
          form: "*dervo",
          lang: "Proto-Slavic",
          gloss: "tree, wood",
          kind: "reconstructed",
          quote: "“from Proto-Balto-Slavic *dérwan, from Proto-Indo-European *derw-o-m.” (Wiktionary)",
          refs: [62],
          children: [
            { id: "ru-derevo", form: "де́рево (dérevo)", lang: "Russian", gloss: "tree", kind: "modern", refs: [62] },
            { id: "pl-drzewo", form: "drzewo", lang: "Polish", gloss: "tree", kind: "modern", refs: [62] },
            { id: "ocs-drevo", form: "дрѣво (drěvo)", lang: "Old Church Slavonic", gloss: "tree", kind: "attested", refs: [62] },
          ],
        },
        {
          id: "psl-sdorvu",
          form: "*sъdorvъ",
          lang: "Proto-Slavic",
          gloss: "healthy — 'of good wood'?",
          kind: "reconstructed",
          disputed: true,
          note:
            "*sъ- 'good' + *-dorv-. The popular 'made of good/sound wood' reading links *-dorv- to *dóru 'tree'; but Wiktionary calls the second element's origin 'uncertain', and Meillet/Derksen instead derive it from *dʰer- 'to support, hold'.",
          quote: "“The exact origin of the second component *dorv- is uncertain.” (Wiktionary)",
          refs: [63],
          children: [
            { id: "ru-zdorov", form: "здоро́вый (zdoróvyj)", lang: "Russian", gloss: "healthy", kind: "modern", refs: [63] },
            { id: "pl-zdrowy", form: "zdrowy", lang: "Polish", gloss: "healthy", kind: "modern", refs: [63] },
          ],
        },
        { id: "lt-derva", form: "derva", lang: "Lithuanian", gloss: "tar; resinous wood, kindling", kind: "modern", note: "From Proto-Balto-Slavic *dérwa 'tree' — the Baltic cousin of Germanic tar.", refs: [64] },
      ],
    },

    // ───────────────────────────── ANATOLIAN ────────────────────────────
    {
      id: "anatolian",
      form: "Anatolian",
      lang: "branch",
      gloss: "Hittite, Luwian (the oldest attested IE)",
      kind: "branch",
      branch: "anatolian",
      children: [
        { id: "hit-taru", form: "𒋫𒊒 (taru / tāru)", lang: "Hittite", gloss: "tree, wood", kind: "attested", refs: [1] },
        { id: "luw-taru", form: "𒋫𒀀𒊒 (tāru)", lang: "Luwian", gloss: "tree, wood", kind: "attested", refs: [1] },
      ],
    },

    // ───────────────────────────── ALBANIAN ─────────────────────────────
    {
      id: "albanian",
      form: "Albanian",
      lang: "branch",
      gloss: "Albanian",
      kind: "branch",
      branch: "albanian",
      children: [
        {
          id: "sq-dru",
          form: "dru",
          lang: "Albanian",
          gloss: "wood, tree; firewood; timber",
          kind: "modern",
          quote: "“from Proto-Albanian *druwa, from Proto-Indo-European *druh₂-ó-m, from *dóru.” (Wiktionary)",
          refs: [65],
        },
      ],
    },

    // ───────────────────────────── ARMENIAN ─────────────────────────────
    {
      id: "armenian",
      form: "Armenian",
      lang: "branch",
      gloss: "Old Armenian",
      kind: "branch",
      branch: "armenian",
      children: [
        {
          id: "hy-tram",
          form: "տրամ (tram)",
          lang: "Old Armenian",
          gloss: "firm, solid",
          kind: "attested",
          note: "From *dru-rā-mo- 'firm, solid', related to *dóru — the 'firm' face of the root, cognate with Germanic *trumaz.",
          quote: "“from Proto-Indo-European *dru-rā-mo ('firm, solid') … related to *dóru ('tree').” (Wiktionary)",
          refs: [66],
        },
        { id: "hy-torg", form: "տորգ (torg)", lang: "Old Armenian", gloss: "wooden framework; fabric, net", kind: "attested", refs: [1] },
        { id: "hy-tarr", form: "տարր (tarr)", lang: "Old Armenian", gloss: "element, matter, substance", kind: "attested", refs: [1] },
      ],
    },

    // ──────────────────────────── TOCHARIAN ─────────────────────────────
    {
      id: "tocharian",
      form: "Tocharian",
      lang: "branch",
      gloss: "Tocharian A & B (Tarim Basin)",
      kind: "branch",
      branch: "tocharian",
      children: [
        { id: "txb-or", form: "or", lang: "Tocharian A/B", gloss: "wood", kind: "attested", refs: [1] },
        { id: "txb-arwa", form: "ārwa", lang: "Tocharian B", gloss: "firewood (plural of or)", kind: "attested", refs: [1] },
      ],
    },
  ],
};
