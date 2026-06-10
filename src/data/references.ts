// Exact source links, keyed by the [Rn] id that nodes cite in their `refs`.
// Just URLs — the human-readable label is derived from the URL by sourceLink(),
// so there's nothing to keep in sync. Scholarly context (author, page, who
// disputes what) lives inline on each node as `note` / `quote` in etymology.ts.

import { TREE, type EtymNode } from "./etymology";

export const REFERENCES: Record<number, string> = {
  1: "https://en.wiktionary.org/wiki/Reconstruction:Proto-Indo-European/d%C3%B3ru",
  2: "https://www.etymonline.com/word/*deru-",
  3: "https://www.etymonline.com/word/tree",
  4: "https://en.wiktionary.org/wiki/Reconstruction:Proto-Germanic/trew%C4%85",
  5: "https://www.etymonline.com/word/true",
  6: "https://en.wiktionary.org/wiki/true",
  7: "https://www.etymonline.com/word/truth",
  8: "https://www.etymonline.com/word/troth",
  9: "https://www.etymonline.com/word/betroth",
  10: "https://www.etymonline.com/word/trow",
  11: "https://www.etymonline.com/word/trust",
  12: "https://en.wiktionary.org/wiki/Reconstruction:Proto-Germanic/traust%C4%85",
  13: "https://www.etymonline.com/word/trusty",
  14: "https://www.etymonline.com/word/trig",
  15: "https://www.etymonline.com/word/trim",
  16: "https://en.wiktionary.org/wiki/Reconstruction:Proto-Germanic/trumaz",
  17: "https://www.etymonline.com/word/trough",
  18: "https://en.wiktionary.org/wiki/Reconstruction:Proto-Germanic/trugaz",
  19: "https://www.etymonline.com/word/tray",
  20: "https://www.etymonline.com/word/tar",
  21: "https://en.wiktionary.org/wiki/Reconstruction:Proto-Germanic/terw%C4%85",
  22: "https://www.etymonline.com/word/truce",
  23: "https://en.wiktionary.org/wiki/treu",
  24: "https://www.thefreedictionary.com/_/roots.aspx?type=Indo-European&root=deru-",
  25: "https://archive.org/stream/WatkinsAmericanHeritageDictionaryOfIndoEuropeanRoots2011/Watkins%20-%20American%20Heritage%20Dictionary%20of%20Indo-European%20Roots%20(2011)_djvu.txt",
  26: "https://en.wiktionary.org/wiki/durus#Latin",
  27: "https://archive.org/details/de-vaan-michiel-etymological-dictionary-of-latin",
  28: "https://www.etymonline.com/word/durable",
  29: "https://www.etymonline.com/word/duration",
  30: "https://www.etymonline.com/word/during",
  31: "https://www.etymonline.com/word/endure",
  32: "https://www.etymonline.com/word/endurance",
  33: "https://www.etymonline.com/word/dour",
  34: "https://www.etymonline.com/word/duress",
  35: "https://www.etymonline.com/word/obdurate",
  36: "https://www.etymonline.com/word/indurate",
  37: "https://www.etymonline.com/word/dura+mater",
  38: "https://en.wiktionary.org/wiki/%CE%B4%CF%81%E1%BF%A6%CF%82",
  39: "https://www.etymonline.com/word/dryad",
  40: "https://en.wiktionary.org/wiki/%CE%B4%CF%8C%CF%81%CF%85",
  41: "https://en.wiktionary.org/wiki/dory",
  42: "https://en.wiktionary.org/wiki/%CE%B4%CE%AD%CE%BD%CE%B4%CF%81%CE%BF%CE%BD",
  43: "https://www.etymonline.com/word/dendrite",
  44: "https://www.etymonline.com/word/dendrochronology",
  45: "https://www.etymonline.com/word/rhododendron",
  46: "https://www.etymonline.com/word/philodendron",
  47: "https://en.wiktionary.org/wiki/%CE%B4%CF%81%CF%85%CE%BC%CF%8C%CF%82",
  48: "https://www.etymonline.com/word/druid",
  49: "https://en.wiktionary.org/wiki/Reconstruction:Proto-Celtic/druwits",
  50: "https://en.wiktionary.org/wiki/druid",
  51: "https://en.wiktionary.org/wiki/%E0%A4%A6%E0%A4%BE%E0%A4%B0%E0%A5%81",
  52: "https://en.wiktionary.org/wiki/%E0%A4%A6%E0%A5%8D%E0%A4%B0%E0%A5%81",
  53: "https://en.wiktionary.org/wiki/%E0%A4%A6%E0%A5%8D%E0%A4%B0%E0%A5%81%E0%A4%AE",
  54: "https://en.wiktionary.org/wiki/%E0%A4%A6%E0%A4%BE%E0%A4%B0%E0%A5%81%E0%A4%A3",
  55: "https://en.wiktionary.org/wiki/deodar",
  56: "https://en.wikipedia.org/wiki/Cedrus_deodara",
  57: "https://en.wiktionary.org/wiki/Reconstruction:Proto-Celtic/daru",
  58: "https://en.wiktionary.org/wiki/dair",
  59: "https://en.wiktionary.org/wiki/derw",
  60: "https://en.wiktionary.org/wiki/doire",
  61: "https://en.wikipedia.org/wiki/Derry/Londonderry_name_dispute",
  62: "https://en.wiktionary.org/wiki/Reconstruction:Proto-Slavic/dervo",
  63: "https://en.wiktionary.org/wiki/Reconstruction:Proto-Slavic/s%D1%8Adorv%D1%8A",
  64: "https://en.wiktionary.org/wiki/derva",
  65: "https://en.wiktionary.org/wiki/dru",
  66: "https://en.wiktionary.org/wiki/%D5%BF%D6%80%D5%A1%D5%B4",
  67: "https://archive.org/details/etymological-dictionary-of-proto-germanic",
  68: "https://archive.org/details/Orel-AHandbookOfGermanicEtymology",
  69: "https://archive.org/details/etymological-dictionary-of-greek_202306",
  70: "https://archive.org/details/EtymologicalDictionaryOfTheSlavicInheritedLexicon_201310",
  71: "https://archive.org/details/derksen-etymological-dictionary-of-the-baltic-inherited-lexicon-2015",
  72: "https://archive.org/details/etymologischesworterbuchdesaltindoarischenmayrhoferewa11992rep_25_b",
  73: "https://dsal.uchicago.edu/dictionaries/soas/",
  74: "https://archive.org/details/matasovic-etymological-dictionary-of-proto-celtic",
  75: "https://archive.org/details/HrachMartirosyanEtymologicalDictionaryOfTheArmenianInheritedLexicon",
  76: "https://archive.org/details/EtymologicalDictionaryOfTheHittiteInheritedLexicon",
  77: "https://www.win.tue.nl/~aeb/natlang/tocharian/",
  78: "https://archive.org/details/orel-a-concise-historical-grammar-of-the-albanian-language",
  79: "https://starlingdb.org/cgi-bin/etymology.cgi?single=1&basename=/data/ie/piet&text_number=+188",
  80: "https://archive.org/details/EncyclopediaOfIndoEuropeanCulture",
  81: "https://archive.org/details/NIL_2008",
  82: "https://en.wiktionary.org/wiki/%D8%AF%D8%A7%D8%B1",
  83: "https://en.wiktionary.org/wiki/%D8%AF%D8%A7%D8%B1%D9%88",
  87: "https://www.etymonline.com/word/tryst",
  88: "https://en.wiktionary.org/wiki/tryst",
  89: "https://en.wiktionary.org/wiki/treow%C3%BE",
};

// Map a host to a readable source name. Hosts not listed fall back to the bare
// hostname; the four query/CGI sites show the name alone (their path is noise).
const SITE: Record<string, string> = {
  "etymonline.com": "etymonline",
  "en.wiktionary.org": "Wiktionary",
  "en.wikipedia.org": "Wikipedia",
  "archive.org": "archive.org",
  "thefreedictionary.com": "American Heritage Dictionary",
  "starlingdb.org": "Pokorny, IEW",
  "dsal.uchicago.edu": "Turner, CDIAL",
  "win.tue.nl": "Adams, Tocharian B",
};
const NAME_ONLY = new Set([
  "thefreedictionary.com",
  "starlingdb.org",
  "dsal.uchicago.edu",
  "win.tue.nl",
]);

/** Derive a consistent "Source · page" link label straight from the URL. */
export function sourceLink(url: string): string {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, "");
  const site = SITE[host] ?? host;
  if (NAME_ONLY.has(host)) return site;
  const segs = u.pathname.split("/").filter(Boolean);
  // archive.org: the item id (.../details/<id> or .../stream/<id>/file) names the book
  const raw = host === "archive.org" ? segs[1] ?? "" : segs[segs.length - 1] ?? "";
  const page = decodeURIComponent(raw)
    .replace(/^Reconstruction:/, "")
    .replace(/[_+]/g, " ");
  return page ? `${site} · ${page}` : site;
}

// fail fast if a node cites an id with no URL
(function validateTreeRefs(root: EtymNode) {
  const dangling: string[] = [];
  (function walk(n: EtymNode) {
    for (const r of n.refs ?? []) if (!REFERENCES[r]) dangling.push(`${n.id} → R${r}`);
    n.children?.forEach(walk);
  })(root);
  if (dangling.length) {
    throw new Error(`[references] nodes cite undefined sources: ${dangling.join(", ")}`);
  }
})(TREE);
