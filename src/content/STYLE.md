# Authoring style guide for `src/content/`

The narrative lives here as plain Markdown. The loader (`load.ts`) parses
frontmatter, renders the body with `marked`, and post-processes `<strong>`/`<em>`
into `<b>`/`<i>` so the existing CSS in `index.css` keeps working unchanged.

## Folder map

- `hero.md` — top of the page (kicker, h1, dek).
- `steps/NN-key.md` — one file per scrollytelling step, ordered by the `NN`
  prefix. The `key` must match the filename body. The closing chapters (Beyond
  PIE tree, Ending notes) are just steps with `focus: []` — no tree highlight,
  text-only on mobile, and they may run to several paragraphs.

## Frontmatter

```yaml
---
key: faith              # short slug, matches the filename
focus: [pgmc-treuwaz, pgmc-trausta]   # tree node IDs to highlight
title: As firm as a tree
---
```

- `focus` is validated against `TREE` in `src/data/etymology.ts` at load —
  typos throw at startup.
- `title` is plain text, no markdown. It must fit on one line in the layout
  (≈ 32 chars is a safe ceiling).
- Steps are sorted by filename, not by frontmatter order.

## Body markdown

| Style guide |  Markdown |  Renders to |
|---|---|---|
| a word cited AS a word | `**true**` | `<b>true</b>` |
| a meaning / gloss | `*firm, steadfast*` | `<i>firm, steadfast</i>` |
| PIE reconstruction | `**\*deru-**` | `<b>*deru-</b>` |
| non-Latin form + transliteration | `**δρῦς [drŷs]**` | `<b>δρῦς [drŷs]</b>` |
| em-dash | `—` (real U+2014) | `—` |
| running quotation | `"like this"` | `"like this"` |
| internal link | not yet — `focus:` frontmatter only | — |

Hard rules:

- No raw `<b>`, `<i>`, `<strong>`, `<em>` in markdown — use `**` / `*`.
- No `(parens)` around a transliteration — always `[brackets]`.
- No quote marks around glosses — italics carry the meaning load.
- Story steps are **one paragraph**; the closing `focus: []` chapters may run to
  several. The body renders in a `<div>`, so paragraph breaks are preserved.
