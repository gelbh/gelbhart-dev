# Jet Lag Map Companion — Portfolio Integration Design

**Date:** 2026-07-24  
**Status:** Approved for implementation planning  
**Surface:** gelbhart.dev (Rails / Silicon / Bootstrap 5)

## Goal

Add **Jet Lag Map Companion** (`https://jetlag.gelbhart.dev`, `https://github.com/gelbh/jetlag`) as the leading featured project on gelbhart.dev: home Featured card at position 1 plus a richer `/projects/jetlag` showcase that uses Hevy-class structure with a map-first visual center.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Depth | Home card + full showcase page (richer than a thin template) |
| Approach | Hevy skeleton + map-first hero/gallery; gelbhart indigo chrome; Jetlag composition only (not a full Jetlag retheme) |
| Featured position | `1` (bump existing projects down) |
| Gallery assets | Four fresh iPhone 12 Pro captures from live app (see Assets) |
| Interactive tease / embed | Out of scope for v1 |
| Analytics widget | Out of scope for v1 |
| Mirror Jetlag privacy/terms on gelbhart.dev | Out of scope (app already hosts them) |

## Product summary

Unofficial fan companion for Jet Lag: The Game Hide + Seek. Hosts create a session and share a 4-letter code; seekers, hiders, and observers join on phones; questions, zones, and pins sync on one live map. PWA-oriented, outdoor/mobile-first.

**Disclaimer (required, visible):** Unofficial fan companion. Not affiliated with Jet Lag: The Game, Nebula, or the board game.

## Placement & wiring

- **Route:** `GET /projects/jetlag` → `pages#jetlag` (`as: :jetlag`)
- **Redirect:** `GET /jetlag` → `/projects/jetlag` (301), matching other projects
- **Controller:** `PagesController#jetlag` rendering `app/views/pages/jetlag.html.erb` (single template, NASA-style)
- **Seed `Project`:**
  - `title`: Jet Lag Map Companion
  - `subtitle`: Live Map PWA
  - `description`: Host or join synced map sessions for Jet Lag Hide + Seek — questions, zones, and pins stay live for the whole group.
  - `icon`: `projects/jetlag/icon.svg` (copied from Jetlag `public/icons/icon-512.svg`)
  - `color`: `primary`
  - `link_text`: Learn More
  - `link_url` / `route_name`: `/projects/jetlag` / `jetlag`
  - `github_url`: `https://github.com/gelbh/jetlag`
  - `badges` (home card): React, Leaflet, Firebase, PWA — page Stack section also lists Cloudflare Workers
  - `position`: `1`, `featured: true`, `published: true`
- **Reorder:** Increment existing seed positions (Hevy → 2 … Robot Motion Planning → 8)
- **Nav:** Projects dropdown picks up via existing `route_name` / seed plumbing
- **Sitemap:** Add `/projects/jetlag` with view lastmod
- **PRODUCT.md:** List Jetlag among shipped projects
- **Tests:** Request smoke for `/projects/jetlag` (and redirect if covered elsewhere)

## Page layout

**Meta / SEO**

- Title: Jet Lag Map Companion
- Meta description: Unofficial fan companion for Jet Lag Hide + Seek — host or join synced map sessions; seekers ask on the live map, hiders answer and set zones.
- Structured data: `SoftwareApplication` + FAQ + article helpers consistent with other project pages
- Primary app URL in structured data: `https://jetlag.gelbhart.dev`

**Sections (top → bottom)**

1. **Map-forward hero**  
   - Dominant visual: `01-hero-map.webp` (live map, zone split, timers, dock; no modal covering the map)  
   - Copy: name + one supporting line (“Live map sessions for Hide + Seek”)  
   - CTAs: **Open app** → `https://jetlag.gelbhart.dev`; **GitHub** → repo  
   - Ambient: gelbhart circuit field / indigo wash framing — not Jetlag terracotta chrome  
   - Responsive: map first on mobile; on `lg+`, two-column row — copy/CTAs left, phone still right (map remains the visual weight)  
   - No floating badges/stickers on the screenshot

2. **Breadcrumb** — Home → Projects → Jet Lag Map Companion

3. **How a session works** — Silicon `steps steps-sm steps-horizontal-md steps-center`  
   1. Host creates a session and shares the 4-letter code  
   2. Everyone joins as seeker, hider, or observer  
   3. Questions, zones, and pins sync live on one map  
   - Primary CTAs repeated under steps (Open app / GitHub)

4. **Gallery** — Hevy-style tabs + lightbox  
   | Tab | Asset | Caption intent |
   |---|---|---|
   | Home | `02-home.webp` | Landing + active session scent |
   | Join | `03-join.webp` | 4-letter code + role pick |
   | Live map | `01-hero-map.webp` | Mid-session map / zone / timers |
   | Hunt narrowed | `04-answered.webp` | Measure + Radar answered |

5. **Stack** — tech badges with accurate links: React, Leaflet, Firebase, Cloudflare Workers, PWA (Vite)

6. **FAQ** (also in FAQ structured data)  
   - **What is Jet Lag Map Companion?** A live map companion for Hide + Seek sessions: seekers ask questions on the shared map; hiders answer, set hiding zones, and watch the hunt unfold in sync.  
   - **Is it official?** No. Unofficial fan companion — not affiliated with Jet Lag: The Game, Nebula, or the board game.  
   - **Is it free?** Yes. Open the web app at jetlag.gelbhart.dev; source is on GitHub.  
   - **Does it work on phones?** Yes. Built as a mobile-first PWA — add to home screen for a full-screen map.  
   - **Where is the code?** `https://github.com/gelbh/jetlag`

7. **Disclaimer strip** — always visible prose (not tooltip-only)

## Assets

**Source:** `/mnt/c/Users/gelbh/Downloads/` (iPhone 12 Pro, `1170×2532`)

| Keep as | Source file | Role |
|---|---|---|
| `01-hero-map` | `jetlag.gelbhart.dev_map(iPhone 12 Pro) (1).png` | Hero + Live map gallery tab |
| `02-home` | `jetlag.gelbhart.dev_map(iPhone 12 Pro).png` | Home gallery tab |
| `03-join` | `jetlag.gelbhart.dev_map(iPhone 12 Pro) (2).png` | Join gallery tab |
| `04-answered` | `jetlag.gelbhart.dev_map(iPhone 12 Pro) (5).png` | Hunt narrowed tab |

**Drop:** `(3).png` (thermometer timeout error), `(4).png` (radar answer sheet — redundant with answered state).

**Pipeline:** Copy into `app/assets/images/jetlag/`, convert to `.webp` (match Hevy). Copy app icon SVG from Jetlag `public/icons/` into site images. Meaningful `alt` text per still.

## Visual system & CSS

- **Site chrome:** Existing arcade-terminal tokens (surface `#0b0f19`, indigo→violet, Manrope). Jetlag terracotta/amber only inside screenshots.
- **Custom SCSS:** Scoped `app/assets/stylesheets/components/pages/_jetlag.scss`, `@use` from `_custom.scss` (same pattern as Hevy/NASA).
- **Motion:** Existing fade-in-view OK; pair with `prefers-reduced-motion` (fade/instant only). Content must not depend on animation to appear.
- **Contrast:** Body and CTA text ≥ WCAG AA (AAA where feasible) on dark surface; hero text must remain readable over/ beside the map still.
- **Touch:** ≥44px targets on tabs and buttons.

## Error handling / edge cases

- External app/GitHub links: `target="_blank"` + `rel="noopener noreferrer"`.
- Missing image: use normal Rails asset pipeline behavior; do not ship broken paths.
- Seeds: `find_or_initialize_by(title: …)` so replant/update is idempotent; position bumps applied in the same seed file.

## Testing

- Request test: `GET /projects/jetlag` → 200; optional redirect test for `/jetlag`.
- Seed/model coverage only if existing project seed tests require position uniqueness updates.
- Manual: home card order, nav dropdown entry, gallery lightbox, mobile hero stack, reduced-motion spot check.

## Out of scope

- Live map iframe / playable demo on the portfolio page  
- Hevy-style GA stats block  
- Hosting Jetlag legal pages on gelbhart.dev  
- Retheming gelbhart.dev chrome to Jetlag’s broadcast-HUD palette  
- Additional screenshot capture beyond the four locked assets

## Implementation notes (for planning)

Touch-set expected in-repo:

- `config/routes.rb`, `config/sitemap.rb`
- `app/controllers/pages_controller.rb`
- `app/views/pages/jetlag.html.erb` (new)
- `db/seeds/projects.rb` (insert + reorder)
- `app/assets/images/jetlag/*` (new)
- `app/assets/stylesheets/components/pages/_jetlag.scss` + `_custom.scss` import
- `PRODUCT.md`
- `test/requests/pages_test.rb` (and factories only if needed)

No edits under `~/.cursor/` or the Jetlag app repo for this feature.
