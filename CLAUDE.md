# gelbhart.dev - AI Assistant Instructions

## Documentation Policy
**DO NOT create separate documentation files.** Add documentation to this file, code comments, or discuss with developer.

## Project Overview
Portfolio website by Tomer Gelbhart (MSc CS student, UCD). Rails 8.0, Bootstrap 5.3, PostgreSQL, Stimulus. Silicon theme at `../Silicon`. Deployed on Render.com.

**Tech Stack**: Rails 8.0, Sprockets+SassC, Importmap, Stimulus, Hotwire/Turbo, Bootstrap 5.3.3
**Type**: Static portfolio site - no auth/models, single PagesController, SEO-optimized

## Key Directories
- `app/assets/images/pacman-game/` - Pac-Man sprites, ghosts, sounds (in images/ for asset pipeline)
- `app/assets/stylesheets/_custom.scss` - **PRIMARY CUSTOM STYLES FILE**
- `app/controllers/pages_controller.rb` - All static pages
- `app/javascript/controllers/` - Stimulus controllers (theme, scroll-animation, code-typer, pacman-game, pacman-preview)
- `app/views/pages/` - Page templates (home, contact, video_captioner, hevy_tracker/)
- `../Silicon/` - Bootstrap 5 theme reference (SCSS copied to app/assets/stylesheets/theme/)

## Key Stimulus Controllers
- **theme** - Dark/light toggle (localStorage, default dark)
- **scroll-animation** - Fade-in on scroll (Intersection Observer, `.fade-in-view`)
- **scroll-to-top** - Back-to-top button (shows after 300px)
- **code-typer** - Contact page C code typing animation
- **pacman-game** - Full game (~2000 lines)
- **pacman-preview** - Homepage hint animation

## Routes
- Root: `pages#home`
- `/hevy-tracker` - Main, privacy, terms pages
- `/contact`, `/video-captioner`
- Error handlers, sitemap.xml.gz

## Pac-Man Game (Desktop Only)
Interactive game on homepage - WASD/arrows to play. Desktop only (`d-none d-lg-block`).

### Core Features
- **Mechanics**: 3 lives, scoring (dots: 10pts, power pellets: 50pts, ghosts: 200pts), edge wrapping, auto-scroll
- **Section Progression**: Unlock sections with keys (Projects: 300pts, Tech: 600pts, Contact: 1000pts). Glass barriers block locked sections.
- **Ghost AI**: Blinky (chase), Pinky (ambush 4 tiles ahead), Inky (vector-based), Clyde (shy). A* pathfinding, scatter mode.
- **Sounds** (Web Audio API, preloaded): beginning, chomp (loop), eatghost, death (in `app/assets/images/pacman-game/sounds/`)
- **States**: Idle → Starting → Playing → PowerMode/Respawning → GameOver
- **Performance**: requestAnimationFrame, bounding box collisions, persistent dot tracking (collectedDotPositions Set)

### Assets
- Sprites: `app/assets/images/pacman-game/` (pacman/, ghosts/, items/key.png)
- Dots/pellets: Canvas-rendered (3 power pellets/section, 200px spacing)

### Implementation
- Controllers: `pacman-preview_controller.js` (~40 lines), `pacman-game_controller.js` (~2000 lines)
- Always use `asset_path()` in ERB for sprite URLs
- Sounds must be preloaded in `connect()`
- Keep ghosts' unique AI behaviors intact

## Silicon Theme Integration
Premium Bootstrap 5 template at `../Silicon`. SCSS copied to `app/assets/stylesheets/theme/`. Minimal JS usage (custom Stimulus preferred). Boxicons CDN, Manrope font (Google Fonts).

**Customization**: Override in `theme/_user-variables.scss`, add to `_custom.scss` (NEVER modify theme files).
**Reference**: `../Silicon/components/*.html`, `/src/scss/components/`, `/src/js/components/`, `/docs/`

## Conventions
**Views**: Start with `content_for :title, page_title("X")` + `meta_description "..."`
**CSS**: BEM-like naming, `[data-bs-theme="dark"]` for dark mode, mobile-first Bootstrap breakpoints
**JS**: Stimulus - kebab-case HTML, camelCase files, `static targets`, `connect()`/`disconnect()`
**Rails**: Use helpers (`page_title()`, `meta_description()`, `asset_path()`, `link_to`), named routes

## Page Features
**Home**: Hero (animated gradient, floating code, tech grid), Projects (3 cards w/ hover), Tech cards, CTA section (glassmorphic)
**Contact**: C code typing background (`code-typer` controller), glassmorphic design, social links
**Hevy Tracker**: OAuth docs, setup guide, privacy/terms, Google Marketplace links
**Video Captioner**: Download page, AI transcription features

## SEO & Styling
**Meta tags**: Basic, Open Graph, Twitter Card, CSP, PWA. Defaults: "gelbhart.dev", logo image.
**Colors**: Primary `#6366f1`, gradient `135deg, #667eea → #764ba2 → #f093fb`
**Typography**: Manrope (Google Fonts, 400-800), Courier New for code
**Dark Mode**: Bootstrap 5.3 `data-bs-theme`, `theme_controller.js`, localStorage, default dark
**Animations**: `cubic-bezier(0.4, 0, 0.2, 1)`, GPU-accelerated (`transform`, `opacity`)

## Workflow
**Assets**: SCSS (Sprockets+SassC), JS (importmap), Bootstrap (node_modules), production: `rails assets:precompile`
**New Pages**: Route → PagesController action → view → SEO meta tags → use `_custom.scss` classes → update nav
**New Stimulus**: Create in `controllers/`, extend `Controller`, define targets/values, `connect()`/`disconnect()`, add `data-controller`
**Styles**: Override in `_user-variables.scss`, custom in `_custom.scss`, NEVER modify `theme/` files
**Silicon Updates**: Compare, copy SCSS to `theme/`, test, update overrides, commit

## Performance & Security
**Optimizations**: Asset preloading, CDN (Google Fonts, Boxicons), lazy loading, Gzip, Turbo, critical CSS
**Security**: CSP, headers (X-Frame-Options DENY, nosniff, XSS, Referrer), CSRF, rack-cors, `rel="noopener"`

## Testing & Deployment
**Tests**: Minitest, Capybara+Selenium, RuboCop, Brakeman
**Deploy**: Render.com, PostgreSQL, `render.yaml`, build: bundle → yarn → assets → migrate

## Dependencies
**Gems**: rails 8.0, sprockets-rails, sassc-rails, bootstrap 5.3, terser, pg, puma, importmap, turbo, stimulus, rack-cors
**NPM**: @popperjs/core 2.11.8, bootstrap 5.3.3
**CDN**: Google Fonts (Manrope), Boxicons, Google Analytics

## Owner & Projects
**Tomer Gelbhart** - MSc CS @ UCD, Dublin. Available May 2026. tomer@gelbhart.dev | github.com/gelbh | linkedin.com/in/tomer-gelbhart

**Projects**:
1. Hevy Tracker - Google Apps Script, OAuth 2.0, Sheets integration, Workspace Marketplace
2. Video Captioner - Whisper AI, Python desktop, YouTube/local files, 15+ languages
3. Robot Motion Planning - MATLAB genetic algorithm, path optimization

## Code Style
**Ruby**: RuboCop Omakase, 2-space, double quotes, Ruby 3.x
**JS**: ES6+, 2-space, Stimulus conventions, no jQuery
**HTML/ERB**: Semantic HTML5, ERB helpers, data attributes
**CSS/SCSS**: BEM-like, mobile-first, Bootstrap utilities, low specificity

## Commands
```bash
rails server/console/routes/db:migrate/assets:precompile
rails test/test:system && rubocop && brakeman
rails assets:clobber && rails tmp:clear
```

## AI Assistant Guidelines
**Editing**: Preserve patterns, maintain dark mode, keep SEO, use Stimulus, check Silicon first, test responsive, GPU animations, accessibility
**New Features**: Check `_custom.scss`/Silicon → view pattern (content_for + meta_description) → add route → use helpers → Stimulus controller → update THIS file (NO separate docs)
**Pac-Man**: Use `asset_path()`, preload sounds in `connect()`, requestAnimationFrame, don't break ghost AI, keep vertical scrolling
**Silicon**: SCSS copied to `theme/`, NEVER modify theme files, use `_custom.scss` for overrides
