# Jet Lag Map Companion Portfolio Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Jet Lag Map Companion as featured project #1 on gelbhart.dev with a map-forward `/projects/jetlag` showcase page.

**Architecture:** Follow existing project patterns (route + `PagesController` action + ERB view + seed `Project` + sitemap + request tests). Page structure mirrors Hevy Tracker (steps, tabbed gallery, lightbox) with a map-first hero. Site chrome stays indigo arcade-terminal; Jetlag terracotta appears only inside screenshots.

**Tech Stack:** Ruby on Rails 8, Silicon/Bootstrap 5, Propshaft/Sprockets image pipeline, SCSS (`_custom.scss` `@use`), ImageMagick `convert` for WebP.

**Spec:** `docs/superpowers/specs/2026-07-24-jetlag-portfolio-design.md`

## Global Constraints

- Keep gelbhart.dev indigo→violet chrome; do not retheme page chrome to Jetlag terracotta/amber.
- Unofficial disclaimer must be visible body text (not tooltip-only).
- Four locked gallery/hero assets only — do not add `(3)` or `(4)` screenshots from Downloads.
- No live iframe/embed, no GA stats widget, no Jetlag privacy/terms pages on gelbhart.dev.
- Do not edit the Jetlag app repo or anything under `~/.cursor/`.
- Conventional commits; no Cursor/AI co-author footers.
- Prefer Silicon/Bootstrap utilities; scoped custom SCSS only for hero/gallery/card page needs.

## File map

| File | Responsibility |
|---|---|
| `app/assets/images/jetlag/*.webp` + `icon.svg` | Hero/gallery stills + card icon |
| `config/routes.rb` | `/projects/jetlag` + `/jetlag` 301 |
| `app/controllers/pages_controller.rb` | `#jetlag` action |
| `test/requests/pages_test.rb` | Request + redirect smoke |
| `db/seeds/projects.rb` | Seed Jetlag at position 1; bump others |
| `PRODUCT.md` | List Jetlag among shipped projects |
| `app/assets/stylesheets/components/pages/_jetlag.scss` | Scoped hero/card/gallery styles |
| `app/assets/stylesheets/_custom.scss` | `@use` the Jetlag partial |
| `app/views/pages/jetlag.html.erb` | Showcase page |
| `config/sitemap.rb` | Index `/projects/jetlag` |

---

### Task 1: Import screenshot and icon assets

**Files:**
- Create: `app/assets/images/jetlag/01-hero-map.webp`
- Create: `app/assets/images/jetlag/02-home.webp`
- Create: `app/assets/images/jetlag/03-join.webp`
- Create: `app/assets/images/jetlag/04-answered.webp`
- Create: `app/assets/images/jetlag/icon.svg`
- Test: (manual file presence — no automated image test in this repo)

**Interfaces:**
- Consumes: Downloads PNGs; Jetlag `public/icons/icon-512.svg`
- Produces: Asset paths `jetlag/01-hero-map.webp`, `jetlag/02-home.webp`, `jetlag/03-join.webp`, `jetlag/04-answered.webp`, `jetlag/icon.svg` for `image_tag`

- [ ] **Step 1: Create the images directory**

```bash
mkdir -p app/assets/images/jetlag
```

- [ ] **Step 2: Convert the four locked PNGs to WebP**

```bash
DL="/mnt/c/Users/gelbh/Downloads"
OUT="app/assets/images/jetlag"

convert "$DL/jetlag.gelbhart.dev_map(iPhone 12 Pro) (1).png" -quality 85 "$OUT/01-hero-map.webp"
convert "$DL/jetlag.gelbhart.dev_map(iPhone 12 Pro).png" -quality 85 "$OUT/02-home.webp"
convert "$DL/jetlag.gelbhart.dev_map(iPhone 12 Pro) (2).png" -quality 85 "$OUT/03-join.webp"
convert "$DL/jetlag.gelbhart.dev_map(iPhone 12 Pro) (5).png" -quality 85 "$OUT/04-answered.webp"
```

Expected: four `.webp` files under `app/assets/images/jetlag/`. Do **not** convert `(3)` or `(4)`.

- [ ] **Step 3: Copy the app icon**

```bash
cp /home/gelbhart/projects/personal/apps/jetlag/public/icons/icon-512.svg app/assets/images/jetlag/icon.svg
```

- [ ] **Step 4: Verify assets**

```bash
ls -la app/assets/images/jetlag/
file app/assets/images/jetlag/*.webp app/assets/images/jetlag/icon.svg
```

Expected: five files; WebPs report as Web/P image data; icon as SVG.

- [ ] **Step 5: Commit**

```bash
git add app/assets/images/jetlag/
git commit -m "$(cat <<'EOF'
chore(jetlag): add portfolio hero and gallery assets

EOF
)"
```

---

### Task 2: Route, controller, and request tests (TDD)

**Files:**
- Modify: `test/requests/pages_test.rb`
- Modify: `config/routes.rb`
- Modify: `app/controllers/pages_controller.rb`
- Create: `app/views/pages/jetlag.html.erb` (minimal stub so the action renders 200 until Task 5 replaces it)

**Interfaces:**
- Consumes: none
- Produces: `jetlag_path` → `/projects/jetlag`; `PagesController#jetlag`

- [ ] **Step 1: Write the failing tests**

Append to `test/requests/pages_test.rb` (before the final `end` of the class):

```ruby
  test "GET /projects/jetlag returns jetlag page" do
    get jetlag_path
    assert_response :success
    assert_select "h1", text: /Jet Lag Map Companion/
    assert_select "a[href='https://jetlag.gelbhart.dev']"
    assert_select "a[href='https://github.com/gelbh/jetlag']"
  end

  test "GET /jetlag redirects to /projects/jetlag" do
    get "/jetlag"
    assert_redirected_to "/projects/jetlag"
    assert_response :moved_permanently
  end
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bin/rails test test/requests/pages_test.rb -n "/jetlag/"
```

Expected: FAIL — unknown route helper / routing error / missing action.

- [ ] **Step 3: Add routes**

In `config/routes.rb`, after the VS Code Torch Checkpoint Inspector block (before `get "/robots.txt"`), add:

```ruby
  # Jet Lag Map Companion
  get "projects/jetlag", to: "pages#jetlag", as: :jetlag
  get "jetlag", to: redirect("/projects/jetlag", status: 301)
```

- [ ] **Step 4: Add controller action**

In `app/controllers/pages_controller.rb`, after `vscode_torch_checkpoint_inspector`, add:

```ruby
  def jetlag
  end
```

- [ ] **Step 5: Add a minimal view stub**

Create `app/views/pages/jetlag.html.erb`:

```erb
<% content_for :title, page_title("Jet Lag Map Companion") %>
<h1>Jet Lag Map Companion</h1>
<p>
  <a href="https://jetlag.gelbhart.dev" target="_blank" rel="noopener noreferrer">Open app</a>
  <a href="https://github.com/gelbh/jetlag" target="_blank" rel="noopener noreferrer">GitHub</a>
</p>
```

(Task 5 replaces this stub with the full showcase.)

- [ ] **Step 6: Run tests to verify they pass**

```bash
bin/rails test test/requests/pages_test.rb -n "/jetlag/"
```

Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add config/routes.rb app/controllers/pages_controller.rb app/views/pages/jetlag.html.erb test/requests/pages_test.rb
git commit -m "$(cat <<'EOF'
feat(jetlag): add project route, controller, and request tests

EOF
)"
```

---

### Task 3: Seed Project at position 1 + PRODUCT.md

**Files:**
- Modify: `db/seeds/projects.rb`
- Modify: `PRODUCT.md`
- Test: `bin/rails runner` position check (or `db:seed` in development)

**Interfaces:**
- Consumes: `jetlag_path` / `route_name: "jetlag"` from Task 2; icon path `projects/jetlag/icon.svg` — **wait:** assets live at `app/assets/images/jetlag/icon.svg`, so `image_tag` / project icon string must be `jetlag/icon.svg` (same pattern as torch uses `projects/vscode-torch-checkpoint-inspector/pytorch.svg` under `app/assets/images/`). Use `jetlag/icon.svg`.
- Produces: Featured card data for home via `Project.featured.published.ordered`

- [ ] **Step 1: Insert Jetlag seed and bump positions**

At the **top** of `db/seeds/projects.rb` (before Hevy Tracker), insert:

```ruby
project = Project.find_or_initialize_by(title: "Jet Lag Map Companion")
project.assign_attributes(
  subtitle: "Live Map PWA",
  description: "Host or join synced map sessions for Jet Lag Hide + Seek — questions, zones, and pins stay live for the whole group.",
  icon: "jetlag/icon.svg",
  color: "primary",
  link_text: "Learn More",
  link_url: "/projects/jetlag",
  route_name: "jetlag",
  github_url: "https://github.com/gelbh/jetlag",
  badges: [
    { text: "React", color: "primary", url: "https://react.dev/" },
    { text: "Leaflet", color: "success", url: "https://leafletjs.com/" },
    { text: "Firebase", color: "warning", url: "https://firebase.google.com/" },
    { text: "PWA", color: "info", url: "https://web.dev/progressive-web-apps/" }
  ],
  position: 1,
  published: true,
  featured: true
)
project.save!
```

Then set existing projects’ `position` values to:

| Title | position |
|---|---|
| Hevy Tracker | 2 |
| Video Captioner | 3 |
| Nim Quantum ML | 4 |
| NASA Exoplanet Explorer | 5 |
| Google Maps Converter | 6 |
| Torch Checkpoint Inspector | 7 |
| Robot Motion Planning | 8 |

- [ ] **Step 2: Update PRODUCT.md shipped-projects sentence**

In `PRODUCT.md` Users section, change the parenthetical project list to include Jetlag first:

```markdown
…browse real shipped projects (Jet Lag Map Companion, Hevy Tracker, Video Captioner, NASA Exoplanet Explorer, Nim Quantum ML, Google Maps Converter, VS Code Torch Checkpoint Inspector), and reach the actual code or a way to make contact.
```

- [ ] **Step 3: Reseed and verify order**

```bash
bin/rails db:seed
bin/rails runner 'puts Project.featured.published.ordered.pluck(:position, :title).map { |p,t| "#{p}. #{t}" }'
```

Expected first line: `1. Jet Lag Map Companion`, then Hevy at 2, … Robot at 8.

- [ ] **Step 4: Commit**

```bash
git add db/seeds/projects.rb PRODUCT.md
git commit -m "$(cat <<'EOF'
feat(jetlag): seed featured project at position 1

EOF
)"
```

---

### Task 4: Scoped Jetlag SCSS

**Files:**
- Create: `app/assets/stylesheets/components/pages/_jetlag.scss`
- Modify: `app/assets/stylesheets/_custom.scss`

**Interfaces:**
- Consumes: existing CSS variables (`--gradient-primary`, `--spacing-*`, `--z-grid`, `--transition-normal`, `--ease-smooth`, `--duration-gradient`)
- Produces: classes `.jetlag-hero`, `.jetlag-gradient-bg`, `.jetlag-card`, `.jetlag-phone-frame`, `#jetlagGalleryTabs`

- [ ] **Step 1: Create `_jetlag.scss`**

```scss
// ============================================
// JET LAG MAP COMPANION PAGE
// Custom: map-forward hero + phone gallery frames
// (Silicon/Bootstrap cover cards/steps/tabs)
// ============================================

.jetlag-hero {
  min-height: 50vh;
  display: flex;
  align-items: center;
  position: relative;
  padding-top: 6rem;
  padding-bottom: var(--spacing-xl);
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  padding-left: calc(50vw - 50%);
  padding-right: calc(50vw - 50%);

  @media (min-width: 768px) {
    min-height: 60vh;
    padding-top: 8rem;
    padding-bottom: var(--spacing-2xl);
  }
}

.jetlag-gradient-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--gradient-primary);
  background-size: 200% 200%;
  animation: gradientShift var(--duration-gradient) ease infinite;
  opacity: 0.12;
  z-index: var(--z-grid);
}

.jetlag-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  transition: all var(--transition-normal) var(--ease-smooth);
  border: 1px solid rgba(255, 255, 255, 0.1);

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 40px rgba(99, 102, 241, 0.3) !important;
    border-color: rgba(99, 102, 241, 0.3);
  }
}

.jetlag-phone-frame {
  max-width: 22rem;
  margin-inline: auto;
  border-radius: 1rem;
  overflow: hidden;
  border: 1px solid rgba(99, 102, 241, 0.25);
  box-shadow: 0 1.5rem 3rem rgba(99, 102, 241, 0.2);

  img {
    display: block;
    width: 100%;
    height: auto;
  }
}

.jetlag-hero .jetlag-phone-frame {
  max-width: 18rem;

  @media (min-width: 992px) {
    max-width: 22rem;
  }
}

#jetlagGalleryTabs {
  .nav-link {
    min-height: 44px;

    &.active {
      color: var(--bs-white) !important;
      font-weight: 600;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .jetlag-gradient-bg {
    animation: none;
  }

  .jetlag-card:hover {
    transform: none;
  }
}
```

- [ ] **Step 2: Import in `_custom.scss`**

After the NASA `@use` line, add:

```scss
// Jet Lag Map Companion page with map-forward hero and gallery
@use "components/pages/jetlag" as *;
```

- [ ] **Step 3: Smoke-check assets compile** (if CSS builds in this env)

```bash
bin/rails assets:precompile 2>&1 | tail -20
```

Expected: no SCSS error mentioning `jetlag`. If precompile is heavy/slow in this environment, skip and rely on `bin/dev` / browser check in Task 5.

- [ ] **Step 4: Commit**

```bash
git add app/assets/stylesheets/components/pages/_jetlag.scss app/assets/stylesheets/_custom.scss
git commit -m "$(cat <<'EOF'
style(jetlag): add scoped showcase page styles

EOF
)"
```

---

### Task 5: Full showcase page

**Files:**
- Modify: `app/views/pages/jetlag.html.erb` (replace stub)
- Test: `test/requests/pages_test.rb` (already asserts h1 + links; re-run)

**Interfaces:**
- Consumes: assets from Task 1; classes from Task 4; helpers `page_title`, `meta_description`, `render_structured_data`, `software_application_structured_data`, `faq_structured_data`, `article_structured_data`, `shared/circuit_field`, `shared/breadcrumb`, `shared/tech_badge`, Silicon `steps-*`
- Produces: complete `/projects/jetlag` page matching the spec

- [ ] **Step 1: Replace `app/views/pages/jetlag.html.erb` with the full page**

Use this complete template:

```erb
<% content_for :title, page_title("Jet Lag Map Companion") %>
<% meta_description "Unofficial fan companion for Jet Lag Hide + Seek — host or join synced map sessions; seekers ask on the live map, hiders answer and set zones." %>
<% content_for :structured_data do %>
  <%= render_structured_data(software_application_structured_data(
    name: "Jet Lag Map Companion",
    description: "Unofficial fan companion for Jet Lag Hide + Seek. Host or join synced map sessions: seekers ask questions on the live map, hiders answer and set hiding zones.",
    url: "https://jetlag.gelbhart.dev",
    application_category: "WebApplication",
    operating_system: "Web",
    offers: {
      "price" => "0",
      "priceCurrency" => "USD"
    }
  )) %>
  <%= render_structured_data(faq_structured_data([
    {
      question: "What is Jet Lag Map Companion?",
      answer: "A live map companion for Hide + Seek sessions: seekers ask questions on the shared map; hiders answer, set hiding zones, and watch the hunt unfold in sync."
    },
    {
      question: "Is Jet Lag Map Companion official?",
      answer: "No. It is an unofficial fan companion — not affiliated with Jet Lag: The Game, Nebula, or the board game."
    },
    {
      question: "Is Jet Lag Map Companion free?",
      answer: "Yes. Open the web app at jetlag.gelbhart.dev; the source is on GitHub."
    },
    {
      question: "Does it work on phones?",
      answer: "Yes. It is built as a mobile-first PWA — add it to your home screen for a full-screen map."
    },
    {
      question: "Where is the code?",
      answer: "The source is at https://github.com/gelbh/jetlag."
    }
  ])) %>
  <% jetlag_article_data = article_structured_data(
    title: "Jet Lag Map Companion",
    url: "https://gelbhart.dev/projects/jetlag",
    description: "Unofficial fan companion for Jet Lag Hide + Seek with live synced map sessions.",
    keywords: "Jet Lag Map Companion, Jet Lag Hide and Seek, live map, PWA, Leaflet, Firebase",
    image: "logos/social/logo_social.png"
  ) %>
  <%= render_structured_data(jetlag_article_data) %>
<% end %>

<section class="position-relative jetlag-hero" data-controller="scroll-animation">
  <div class="jetlag-gradient-bg"></div>
  <%= render "shared/circuit_field", intensity: 0.85 %>
  <div class="container py-4 position-relative zindex-5">
    <div class="row align-items-center g-4 g-lg-5">
      <div class="col-12 order-1 d-lg-none fade-in-view">
        <div class="jetlag-phone-frame">
          <%= image_tag "jetlag/01-hero-map.webp",
                alt: "Jet Lag Map Companion live seeker map over Dublin with play zone and timers",
                width: 390,
                height: 844,
                loading: "eager" %>
        </div>
      </div>
      <div class="col-lg-6 order-2 order-lg-1 fade-in-view">
        <%= image_tag "jetlag/icon.svg", width: 64, height: 64, class: "mb-3", alt: "Jet Lag Map Companion", loading: "lazy" %>
        <h1 class="display-5 mb-2">Jet Lag Map Companion</h1>
        <p class="lead text-light mb-2">Live map sessions for Hide + Seek</p>
        <p class="text-light opacity-75 mb-4" style="max-width: 40rem;">
          Unofficial fan companion for Jet Lag: The Game. Host or join synced map sessions — seekers ask on the live map, hiders answer and set zones, everyone stays on the same board.
        </p>
        <div class="d-flex flex-column flex-sm-row gap-3">
          <a href="https://jetlag.gelbhart.dev" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-lg">
            <i class="bx bx-map me-2" aria-hidden="true"></i>Open app
          </a>
          <a href="https://github.com/gelbh/jetlag" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-lg">
            <i class="bx bxl-github me-2" aria-hidden="true"></i>GitHub
          </a>
        </div>
      </div>
      <div class="col-lg-6 order-lg-2 d-none d-lg-block fade-in-view delay-1">
        <div class="jetlag-phone-frame">
          <%= image_tag "jetlag/01-hero-map.webp",
                alt: "Jet Lag Map Companion live seeker map over Dublin with play zone and timers",
                width: 390,
                height: 844,
                loading: "eager" %>
        </div>
      </div>
    </div>
  </div>
</section>

<div class="container pt-4">
  <%= render "shared/breadcrumb", items: [
    { name: "Home", url: "/" },
    { name: "Projects", url: nil },
    { name: "Jet Lag Map Companion", url: nil }
  ] %>
</div>

<section class="container py-5 mt-4" data-controller="scroll-animation">
  <div class="row justify-content-center">
    <div class="col-lg-10 col-xl-9">
      <div class="card jetlag-card border-0 shadow-lg mb-4 fade-in-view delay-1">
        <div class="card-body p-4 p-lg-5">
          <div class="d-flex align-items-center mb-4">
            <div class="me-3">
              <%= render "shared/icon_circle", icon: "bx-rocket", color: "primary", size: "md" %>
            </div>
            <h2 class="h3 mb-0">How a session works</h2>
          </div>
          <div class="steps steps-sm steps-horizontal-md steps-center mb-4">
            <div class="step">
              <div class="step-number"><div class="step-number-inner">1</div></div>
              <div class="step-body">
                <h3 class="h5 mb-2">Create &amp; share</h3>
                <p class="mb-0 text-muted small">Host frames the play area and shares the 4-letter code.</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number"><div class="step-number-inner">2</div></div>
              <div class="step-body">
                <h3 class="h5 mb-2">Join a role</h3>
                <p class="mb-0 text-muted small">Everyone joins as seeker, hider, or observer on their phone.</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number"><div class="step-number-inner">3</div></div>
              <div class="step-body">
                <h3 class="h5 mb-2">Hunt in sync</h3>
                <p class="mb-0 text-muted small">Questions, zones, and pins update live on one shared map.</p>
              </div>
            </div>
          </div>
          <div class="text-center pt-3">
            <div class="d-flex flex-column flex-sm-row gap-3 justify-content-center">
              <a href="https://jetlag.gelbhart.dev" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-lg">
                <i class="bx bx-map me-2" aria-hidden="true"></i>Open app
              </a>
              <a href="https://github.com/gelbh/jetlag" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-lg">
                <i class="bx bxl-github me-2" aria-hidden="true"></i>GitHub
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="card jetlag-card border-0 shadow-lg mb-4 fade-in-view delay-2">
        <div class="card-body p-4 p-lg-5">
          <div class="d-flex align-items-center mb-4">
            <div class="me-3">
              <%= render "shared/icon_circle", icon: "bx-images", color: "primary", size: "md" %>
            </div>
            <h2 class="h3 mb-0">In the app</h2>
          </div>
          <ul class="nav nav-tabs mb-3" id="jetlagGalleryTabs" role="tablist">
            <li class="nav-item" role="presentation">
              <button class="nav-link active" id="jetlag-home-tab" data-bs-toggle="tab" data-bs-target="#jetlag-home-pane" type="button" role="tab" aria-controls="jetlag-home-pane" aria-selected="true">Home</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="jetlag-join-tab" data-bs-toggle="tab" data-bs-target="#jetlag-join-pane" type="button" role="tab" aria-controls="jetlag-join-pane" aria-selected="false">Join</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="jetlag-map-tab" data-bs-toggle="tab" data-bs-target="#jetlag-map-pane" type="button" role="tab" aria-controls="jetlag-map-pane" aria-selected="false">Live map</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="jetlag-answered-tab" data-bs-toggle="tab" data-bs-target="#jetlag-answered-pane" type="button" role="tab" aria-controls="jetlag-answered-pane" aria-selected="false">Hunt narrowed</button>
            </li>
          </ul>
          <div class="tab-content" id="jetlagGalleryTabContent">
            <div class="tab-pane fade show active" id="jetlag-home-pane" role="tabpanel" aria-labelledby="jetlag-home-tab" tabindex="0">
              <div class="gallery-item jetlag-phone-frame"
                   data-bs-toggle="modal"
                   data-bs-target="#jetlagImageModal"
                   data-image="<%= asset_path('jetlag/02-home.webp') %>"
                   data-alt="Jet Lag Map Companion home screen with active session shortcut">
                <%= image_tag "jetlag/02-home.webp",
                      alt: "Jet Lag Map Companion home screen with Create, Join, and active session DVWE",
                      class: "img-fluid",
                      loading: "lazy",
                      width: 390,
                      height: 844 %>
              </div>
              <div class="text-center mt-3">
                <h3 class="h5 mb-2">Home</h3>
                <p class="text-muted mb-0 small">Landing with create/join and a jump back into the active session.</p>
              </div>
            </div>
            <div class="tab-pane fade" id="jetlag-join-pane" role="tabpanel" aria-labelledby="jetlag-join-tab" tabindex="0">
              <div class="gallery-item jetlag-phone-frame"
                   data-bs-toggle="modal"
                   data-bs-target="#jetlagImageModal"
                   data-image="<%= asset_path('jetlag/03-join.webp') %>"
                   data-alt="Join session screen with four-letter code and role picker">
                <%= image_tag "jetlag/03-join.webp",
                      alt: "Join game screen with session code entry and seeker, hider, observer roles",
                      class: "img-fluid",
                      loading: "lazy",
                      width: 390,
                      height: 844 %>
              </div>
              <div class="text-center mt-3">
                <h3 class="h5 mb-2">Join</h3>
                <p class="text-muted mb-0 small">Enter the four-letter code and pick seeker, hider, or observer.</p>
              </div>
            </div>
            <div class="tab-pane fade" id="jetlag-map-pane" role="tabpanel" aria-labelledby="jetlag-map-tab" tabindex="0">
              <div class="gallery-item jetlag-phone-frame"
                   data-bs-toggle="modal"
                   data-bs-target="#jetlagImageModal"
                   data-image="<%= asset_path('jetlag/01-hero-map.webp') %>"
                   data-alt="Live map mid-session with zone and timers">
                <%= image_tag "jetlag/01-hero-map.webp",
                      alt: "Live seeker map with play zone, location, and hiding timer",
                      class: "img-fluid",
                      loading: "lazy",
                      width: 390,
                      height: 844 %>
              </div>
              <div class="text-center mt-3">
                <h3 class="h5 mb-2">Live map</h3>
                <p class="text-muted mb-0 small">Mid-session map with zone state, HUD timers, and the tool dock.</p>
              </div>
            </div>
            <div class="tab-pane fade" id="jetlag-answered-pane" role="tabpanel" aria-labelledby="jetlag-answered-tab" tabindex="0">
              <div class="gallery-item jetlag-phone-frame"
                   data-bs-toggle="modal"
                   data-bs-target="#jetlagImageModal"
                   data-image="<%= asset_path('jetlag/04-answered.webp') %>"
                   data-alt="Game sheet showing answered Measure and Radar questions">
                <%= image_tag "jetlag/04-answered.webp",
                      alt: "Answered Measure and Radar questions narrowing the hunt on the map",
                      class: "img-fluid",
                      loading: "lazy",
                      width: 390,
                      height: 844 %>
              </div>
              <div class="text-center mt-3">
                <h3 class="h5 mb-2">Hunt narrowed</h3>
                <p class="text-muted mb-0 small">Measure and Radar answers sync so the group sees the same board.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card jetlag-card border-0 shadow mb-4 fade-in-view delay-3">
        <div class="card-body p-4">
          <h2 class="h4 mb-3">Tech stack</h2>
          <div class="d-flex flex-wrap gap-2">
            <%= render "shared/tech_badge", text: "React", color: "primary", url: "https://react.dev/", extra_classes: "px-3 py-2" %>
            <%= render "shared/tech_badge", text: "Leaflet", color: "success", url: "https://leafletjs.com/", extra_classes: "px-3 py-2" %>
            <%= render "shared/tech_badge", text: "Firebase", color: "warning", url: "https://firebase.google.com/", extra_classes: "px-3 py-2" %>
            <%= render "shared/tech_badge", text: "Cloudflare Workers", color: "info", url: "https://workers.cloudflare.com/", extra_classes: "px-3 py-2" %>
            <%= render "shared/tech_badge", text: "PWA", color: "secondary", url: "https://web.dev/progressive-web-apps/", extra_classes: "px-3 py-2" %>
          </div>
        </div>
      </div>

      <div class="card jetlag-card border-0 shadow mb-4 fade-in-view delay-4">
        <div class="card-body p-4">
          <h2 class="h4 mb-3">FAQ</h2>
          <div class="accordion accordion-flush" id="jetlagFaq">
            <div class="accordion-item bg-transparent border-secondary border-opacity-25">
              <h3 class="accordion-header" id="jetlagFaqHeadingOne">
                <button class="accordion-button collapsed bg-transparent text-light" type="button" data-bs-toggle="collapse" data-bs-target="#jetlagFaqOne" aria-expanded="false" aria-controls="jetlagFaqOne">
                  What is Jet Lag Map Companion?
                </button>
              </h3>
              <div id="jetlagFaqOne" class="accordion-collapse collapse" aria-labelledby="jetlagFaqHeadingOne" data-bs-parent="#jetlagFaq">
                <div class="accordion-body text-light opacity-75">
                  A live map companion for Hide + Seek sessions: seekers ask questions on the shared map; hiders answer, set hiding zones, and watch the hunt unfold in sync.
                </div>
              </div>
            </div>
            <div class="accordion-item bg-transparent border-secondary border-opacity-25">
              <h3 class="accordion-header" id="jetlagFaqHeadingTwo">
                <button class="accordion-button collapsed bg-transparent text-light" type="button" data-bs-toggle="collapse" data-bs-target="#jetlagFaqTwo" aria-expanded="false" aria-controls="jetlagFaqTwo">
                  Is it official?
                </button>
              </h3>
              <div id="jetlagFaqTwo" class="accordion-collapse collapse" aria-labelledby="jetlagFaqHeadingTwo" data-bs-parent="#jetlagFaq">
                <div class="accordion-body text-light opacity-75">
                  No. Unofficial fan companion — not affiliated with Jet Lag: The Game, Nebula, or the board game.
                </div>
              </div>
            </div>
            <div class="accordion-item bg-transparent border-secondary border-opacity-25">
              <h3 class="accordion-header" id="jetlagFaqHeadingThree">
                <button class="accordion-button collapsed bg-transparent text-light" type="button" data-bs-toggle="collapse" data-bs-target="#jetlagFaqThree" aria-expanded="false" aria-controls="jetlagFaqThree">
                  Is it free? Does it work on phones?
                </button>
              </h3>
              <div id="jetlagFaqThree" class="accordion-collapse collapse" aria-labelledby="jetlagFaqHeadingThree" data-bs-parent="#jetlagFaq">
                <div class="accordion-body text-light opacity-75">
                  Yes and yes. Use the web app at jetlag.gelbhart.dev; it is a mobile-first PWA. Source: github.com/gelbh/jetlag.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card jetlag-card border-0 shadow mb-4 fade-in-view delay-5">
        <div class="card-body p-4">
          <p class="mb-0 text-muted small">
            <i class="bx bx-info-circle me-1" aria-hidden="true"></i>
            Unofficial fan companion. Not affiliated with Jet Lag: The Game, Nebula, or the board game.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

<div class="modal fade" id="jetlagImageModal" tabindex="-1" aria-labelledby="jetlagImageModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-lg">
    <div class="modal-content bg-dark border-0">
      <div class="modal-header border-secondary border-opacity-25">
        <h2 class="modal-title h5 text-white" id="jetlagImageModalLabel">Screenshot</h2>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body text-center p-0">
        <img src="" alt="" class="img-fluid" id="jetlagModalImage">
      </div>
    </div>
  </div>
</div>

<script>
  document.addEventListener('DOMContentLoaded', function () {
    const imageModal = document.getElementById('jetlagImageModal');
    if (!imageModal) return;
    imageModal.addEventListener('show.bs.modal', function (event) {
      const trigger = event.relatedTarget;
      if (!trigger) return;
      const img = document.getElementById('jetlagModalImage');
      const title = imageModal.querySelector('.modal-title');
      img.src = trigger.getAttribute('data-image') || '';
      img.alt = trigger.getAttribute('data-alt') || '';
      if (title) title.textContent = trigger.getAttribute('data-alt') || 'Screenshot';
    });
  });
</script>
```

Note: Hevy’s `.gallery-item` hover lives in `_hevy-tracker.scss`. If zoom-in cursor is missing on Jetlag gallery until Hevy CSS loads globally, either rely on that existing `.gallery-item` rule (already global in the Hevy partial) or duplicate a one-line `cursor: zoom-in` under `.jetlag-phone-frame.gallery-item` in `_jetlag.scss`. Prefer the one-line addition in `_jetlag.scss` if Hevy styles are not guaranteed on this page:

```scss
.jetlag-phone-frame.gallery-item {
  cursor: zoom-in;
}
```

- [ ] **Step 2: Re-run request tests**

```bash
bin/rails test test/requests/pages_test.rb -n "/jetlag/"
```

Expected: PASS.

- [ ] **Step 3: Manual browser check**

Open `/projects/jetlag` and `/`:

- Hero map + CTAs readable on mobile and desktop
- Steps horizontal from `md` up
- Gallery tabs + lightbox
- Disclaimer visible
- Home Featured card #1 is Jetlag with SVG icon
- Projects nav includes Jetlag

- [ ] **Step 4: Commit**

```bash
git add app/views/pages/jetlag.html.erb app/assets/stylesheets/components/pages/_jetlag.scss
git commit -m "$(cat <<'EOF'
feat(jetlag): build map-forward project showcase page

EOF
)"
```

---

### Task 6: Sitemap entry

**Files:**
- Modify: `config/sitemap.rb`

**Interfaces:**
- Consumes: view path `pages/jetlag.html.erb`
- Produces: `/projects/jetlag` in generated sitemap

- [ ] **Step 1: Add sitemap entry**

In `config/sitemap.rb`, after the Google Maps Converter block (end of project pages), add:

```ruby
  jetlag_lastmod = get_view_lastmod("pages/jetlag.html.erb")
  add "/projects/jetlag", lastmod: jetlag_lastmod
```

- [ ] **Step 2: Regenerate sitemap if the project’s usual workflow does**

```bash
bin/rails sitemap:refresh:no_ping
```

Expected: `public/sitemap.xml` (or gzipped variant per project config) includes `/projects/jetlag`. If the rake task name differs, use whatever this repo already documents; do not invent a new sitemap pipeline.

- [ ] **Step 3: Commit**

```bash
git add config/sitemap.rb public/sitemap.xml public/sitemap.xml.gz 2>/dev/null || git add config/sitemap.rb
git commit -m "$(cat <<'EOF'
chore(jetlag): include project page in sitemap

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|---|---|
| Route + 301 redirect | Task 2 |
| Controller + showcase page | Tasks 2, 5 |
| Seed position 1 + reorder | Task 3 |
| Nav via `route_name` | Task 3 (automatic) |
| Sitemap | Task 6 |
| PRODUCT.md | Task 3 |
| Four WebP assets + icon | Task 1 |
| Map-forward hero, steps, gallery, stack, FAQ, disclaimer | Task 5 |
| Scoped SCSS + reduced motion | Task 4 |
| Request tests | Task 2 |
| No iframe / GA / legal mirrors / Jetlag retheme | Global Constraints |

No placeholders left. Icon path locked to `jetlag/icon.svg`. Out-of-scope items are deliberate product cuts (not investigation drops) — no backlog required.
