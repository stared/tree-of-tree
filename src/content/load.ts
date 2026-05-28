// Loads all .md content via Vite's eager glob, parses frontmatter with a
// minimal hand-rolled YAML subset (string / short-string / string-array only),
// renders body markdown with `marked`, and post-processes <strong>/<em> to
// <b>/<i> so existing CSS selectors keep working.

import { marked } from "marked";
import {
  validateStep,
  type Colophon,
  type Hero,
  type Step,
} from "./schema";

// ─── frontmatter (intentionally tiny — we only use strings + one array) ───

interface Parsed {
  data: Record<string, string | string[]>;
  body: string;
}

function parseFrontmatter(raw: string, origin: string): Parsed {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) throw new Error(`[content] ${origin}: missing frontmatter`);
  const data: Record<string, string | string[]> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colon = trimmed.indexOf(":");
    if (colon === -1) {
      throw new Error(`[content] ${origin}: bad frontmatter line: ${line}`);
    }
    const key = trimmed.slice(0, colon).trim();
    let val = trimmed.slice(colon + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    const arr = /^\[(.*)\]$/.exec(val);
    if (arr) {
      data[key] = arr[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      data[key] = val;
    }
  }
  return { data, body: m[2] };
}

// ─── markdown → html, with the <strong>/<em> → <b>/<i> rewrite ───

function replaceTags(html: string): string {
  return html
    .replace(/<strong>/g, "<b>")
    .replace(/<\/strong>/g, "</b>")
    .replace(/<em>/g, "<i>")
    .replace(/<\/em>/g, "</i>");
}

function renderBlock(md: string): string {
  return replaceTags(marked.parse(md.trim(), { async: false }) as string);
}

function renderInline(md: string): string {
  return replaceTags(marked.parseInline(md.trim(), { async: false }) as string);
}

/** strip a single outer `<p>...</p>` (steps and hero dek are single-paragraph) */
function stripOuterP(html: string): string {
  const m = /^<p>([\s\S]*)<\/p>\s*$/.exec(html.trim());
  return m ? m[1] : html;
}

/** tag the LAST `<p>` as the byline (colophon convention) */
function classLastP(html: string, cls: string): string {
  const idx = html.lastIndexOf("<p>");
  return idx === -1
    ? html
    : html.slice(0, idx) + `<p class="${cls}">` + html.slice(idx + 3);
}

// ─── glob-load each kind ───

function singleRaw(
  modules: Record<string, string>,
  expected: string,
): string {
  const entries = Object.entries(modules);
  if (entries.length !== 1) {
    throw new Error(`[content] expected exactly one ${expected}`);
  }
  return entries[0][1];
}

const stepModules = import.meta.glob("./steps/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const heroModules = import.meta.glob("./hero.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const colophonModules = import.meta.glob("./colophon.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const STEPS: Step[] = Object.entries(stepModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, raw]) => {
    const { data, body } = parseFrontmatter(raw, path);
    const step: Step = {
      key: String(data.key ?? ""),
      focus: Array.isArray(data.focus) ? data.focus : [],
      title: String(data.title ?? ""),
      bodyHtml: stripOuterP(renderBlock(body)),
    };
    validateStep(step, path);
    return step;
  });

const heroRaw = parseFrontmatter(singleRaw(heroModules, "hero.md"), "hero.md");
export const HERO: Hero = {
  kicker: String(heroRaw.data.kicker ?? ""),
  titleHtml: renderInline(String(heroRaw.data.title ?? "")),
  bodyHtml: stripOuterP(renderBlock(heroRaw.body)),
};

const colophonRaw = parseFrontmatter(
  singleRaw(colophonModules, "colophon.md"),
  "colophon.md",
);
export const COLOPHON: Colophon = {
  title: String(colophonRaw.data.title ?? ""),
  bodyHtml: classLastP(renderBlock(colophonRaw.body), "byline"),
};
