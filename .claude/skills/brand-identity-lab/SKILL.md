---
name: brand-identity-lab
description: Methodology for building a bespoke visual identity layer — custom iconography and illustration systems, wordmark/monogram treatment, and the specific tells that separate genuinely custom brand assets from generic library icons or AI-generated illustration. Use when a project's brief calls for a distinctive visual identity beyond an off-the-shelf icon library (taste-skill and premium-design-os both correctly default to Lucide/Phosphor/Heroicons/SF Symbols/Material Symbols — this skill is for the specific, rarer case where the brief needs more than that default covers).
license: Internal — author's own project conventions, not third-party.
---

# Brand Identity Lab

`taste-skill` §9 and `native-app-design` §6 both correctly default to an
existing icon library — Lucide, Phosphor, Heroicons on web; SF Symbols,
Material Symbols on native. That default is right for the large majority of
projects: a considered *use* of an existing, professionally-drawn system
beats a hand-rolled one nine times out of ten. This skill is for the
narrower, real case where the brief genuinely calls for something an
off-the-shelf library can't provide — a distinctive brand mark, a custom
illustration language, an icon set that has to encode domain-specific
concepts no general library has drawn.

**Check first: does this actually need custom work?** A generic "make it
feel more premium/unique" ask is usually a typography, spacing, motion, or
color problem (`premium-design-os` §1 already names those as where premium
perception actually comes from) — not an illustration problem. Building a
bespoke icon system is a real, ongoing cost (every new icon has to match
the system by hand, forever); reach for it only when the brief specifically
needs distinctive visual identity, not as a default upgrade path.

## 1. The tell that separates bespoke from generic-AI illustration

This is worth naming directly, because it's the single most common way a
"custom illustration" ask goes wrong: an unbriefed illustration generation
converges on a small number of extremely recognizable patterns — smooth
gradient blobs as backgrounds, flat human figures with disproportionately
large heads and no facial detail ("Corporate Memphis," itself now a cliché
rather than distinctive), generic isometric-office scenes, a diversity-
signaling group of interchangeable figures. These read as templated
specifically *because* they're the statistically average output of "draw a
friendly illustration for a tech company" — the illustration equivalent of
the AI-purple-gradient-hero `taste-skill` already flags for layout.

**A genuinely bespoke system avoids this by being specific, not generic:**
grounded in the actual brand's real content (this project's own map used
real geographic coordinates and real seat counts rather than a decorative
blob, for exactly this reason), built on a stated, consistent geometric
rule (not "whatever looks nice per icon"), and — where it depicts people or
scenes at all — specific rather than a generic stand-in for "people/
tech/business."

## 2. Define the construction rules before drawing anything

A coherent icon/illustration system is a small number of geometric
decisions, applied consistently, not a style that's "vibed" per asset:

- **Grid** — a fixed base unit (commonly 24px or 32px for icons) with
  defined padding, corner radius, and optical alignment rules (a circle and
  a square of "the same size" need slightly different bounding boxes to
  read as equal weight — this is why hand-tuned icon systems look more
  consistent than auto-generated ones).
- **Stroke vs. fill** — pick one as the primary treatment and apply it
  system-wide; mixing stroke-only and filled icons within the same context
  reads as assembled from different sources, because it usually is.
- **Stroke weight** — one value (commonly 1.5–2px at the grid's reference
  size), scaling proportionally at other sizes rather than staying fixed
  (a fixed stroke width at a much larger display size reads as thin/
  under-weighted).
- **Corner treatment** — sharp, uniformly rounded, or mixed by a stated
  rule (e.g., "rounded on exterior corners, sharp on interior") — decide
  once, apply everywhere.
- **Perspective/dimensionality** — flat, isometric, or a single consistent
  light-source-implying treatment if any depth is used at all. Do not mix
  flat icons with isometric illustrations in the same visual system unless
  they're deliberately operating at different scales (icons vs. hero
  illustrations) with a stated reason.

Write these down as an actual token/spec document (`references/CONSTRUCTION_SPEC_TEMPLATE.md`
has a starting structure) — the same discipline `premium-design-os`
already asks for with color/type/spacing tokens, applied to the visual
identity layer.

## 3. Ground illustration in real content, not generic scenes

The highest-leverage move for making an illustration system read as bespoke
rather than templated: **base it on the project's actual data, product, or
domain, not a generic stand-in scene.** A few concrete patterns:

- A data-driven graphic (a real map, a real process diagram, a real
  organizational structure) instead of a decorative "team collaborating"
  illustration — this project's own college map is the working example: a
  real coordinate plot of real data, not a stock illustration of "education."
- A **motif extracted from the product's actual domain** (a stethoscope's
  literal shape abstracted into a repeating line pattern for a healthcare
  brand; a specific building silhouette for a real estate brand) rather
  than a generic industry cliché (a caduceus for anything medical, a
  skyline silhouette for anything real-estate — both are the illustration
  equivalent of a stock photo).
- **Custom iconography for domain-specific concepts** a general library
  genuinely doesn't have — this is the legitimate, narrow case for drawing
  new icons at all, versus icons a library already covers well (don't
  redraw "settings" or "search").

## 4. Color and the rest of the system

An illustration/icon system that doesn't derive from the same design tokens
as the rest of the UI (`premium-design-os` §2's token architecture) will
drift out of sync the first time the brand color changes. Build custom SVG
assets to read `currentColor` or CSS custom properties for anything that
should track the brand palette, rather than hard-coded hex values baked
into the SVG — the same principle this project's own icon/badge work
already follows (`fill="currentColor"` on inline SVGs, styled by the parent
element's `color`).

## 5. Wordmark and monogram

A full custom logotype/logo-design process is a separate, specialist
discipline this skill does not claim to replace — but the common, in-scope
case is a **wordmark treatment** (an existing or licensed typeface, set with
considered tracking/weight, sometimes with one custom letterform or ligature)
rather than a from-scratch pictorial logo. Keep the wordmark's accent color
wired to the same brand token the rest of the UI uses (this project's own
`Nepal`**`MBBS`**`.in` wordmark, where the highlighted segment reads
`var(--accent)` → `var(--brand)`, is the pattern — the logo and the button
color update together from one token, never drift independently) — a
hard-coded logo color that has to be manually kept in sync with a separate
brand-color token is a maintenance bug waiting to happen, not a design
choice.

## 6. Quality gate

- [ ] The construction rules (grid, stroke, corner, perspective) are
      written down somewhere, not held only in one person's/session's head
- [ ] Every custom asset checked against those rules, not approved on
      "looks right" alone
- [ ] Nothing in the system is a generic industry-cliché stand-in
      (§1/§3) where a specific, domain-grounded alternative was possible
- [ ] Color in custom SVG assets reads from the project's actual tokens
      (`currentColor` or CSS custom properties), not hard-coded values
- [ ] `premium-design-os`'s existing anti-pattern list
      (`DESIGN_ANTI_PATTERNS.md`) still applies underneath this — a
      beautifully bespoke icon system on top of a broken workflow is still
      the wrong priority
