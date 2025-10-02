# GitHub Copilot Custom Instructions for gelbhart.dev

## IMPORTANT: Documentation Policy
**DO NOT create separate documentation files** like `IMPLEMENTATION.md`, `TODO.md`, `SOUND_EFFECTS_IMPLEMENTATION.md`, etc. All documentation should be:
1. Added directly to this copilot-instructions.md file
2. Included as code comments in the relevant files
3. Discussed verbally with the developer

**Never create standalone markdown files for planning, implementation notes, or TODOs.**

## Project Overview

**gelbhart.dev** is a personal portfolio website and development showcase built with Ruby on Rails 8.0. This is a modern, full-stack web application featuring:

- **Owner**: Tomer Gelbhart - MSc Computer Science student at UCD
- **Purpose**: Portfolio website showcasing development projects, technical skills, and professional profile
- **Tech Stack**: Rails 8.0, Bootstrap 5.3, PostgreSQL, Stimulus, Hotwire/Turbo
- **Theme**: Silicon Bootstrap 5 template (located at `../Silicon`)
- **Deployment**: Render.com (see `render.yaml`)
- **Domain**: https://gelbhart.dev

## Project Architecture

### Framework & Key Technologies
- **Rails Version**: 8.0.0 (latest stable release)
- **Ruby Version**: See `.ruby-version` file
- **Database**: PostgreSQL (no models/migrations yet - schema is empty)
- **Asset Pipeline**: Sprockets with SassC for SCSS compilation
- **JavaScript**: 
  - Importmap for dependency management
  - Stimulus controllers for interactive behaviors
  - Hotwire/Turbo for SPA-like navigation
  - Bootstrap 5.3.3 via npm
- **CSS Framework**: Bootstrap 5.3 with Silicon theme customizations
- **Module Loader**: Zeitwerk for autoloading

### Application Type
This is a **static content-driven portfolio site** with:
- No user authentication or database models (yet)
- Static pages served through a single controller (`PagesController`)
- Heavy use of partials for reusable UI components
- Client-side interactivity via Stimulus controllers
- SEO-optimized with meta tags, Open Graph, and Twitter Cards

## Directory Structure

```
/home/gelbhart/gelbhart-dev/          # Rails application root
├── app/
│   ├── assets/
│   │   ├── config/
│   │   │   └── manifest.js           # Sprockets manifest
│   │   ├── images/
│   │   │   ├── logos/                # Brand logos and icons
│   │   │   └── pacman-game/          # Pac-Man game assets
│   │   │       ├── pacman/           # Pac-Man sprite images (open, closed, directions)
│   │   │       ├── ghosts/           # Ghost sprites (Blinky, Pinky, Inky, Clyde, frightened)
│   │   │       └── sounds/           # Sound effects (in images dir for asset pipeline)
│   │   │           ├── pacman_beginning.wav
│   │   │           ├── pacman_chomp.wav
│   │   │           ├── pacman_death.wav
│   │   │           ├── pacman_eatfruit.wav
│   │   │           ├── pacman_eatghost.wav
│   │   │           ├── pacman_extrapac.wav
│   │   │           └── pacman_intermission.wav
│   │   └── stylesheets/
│   │       ├── application.scss      # Main SCSS entry point
│   │       ├── critical.scss         # Critical above-the-fold CSS
│   │       ├── _custom.scss          # Custom site-wide styles (MAIN CUSTOM FILE)
│   │       └── theme/                # Silicon theme SCSS components
│   │           ├── theme.scss        # Theme entry point
│   │           ├── _variables.scss   # Theme variables
│   │           ├── _variables-dark.scss # Dark mode overrides
│   │           ├── _user-variables.scss # User variable overrides
│   │           └── components/       # Individual component styles
│   ├── controllers/
│   │   ├── application_controller.rb # Base controller (minimal)
│   │   ├── pages_controller.rb       # Main pages controller (all routes)
│   │   ├── errors_controller.rb      # Custom error pages (404, 500, etc.)
│   │   └── sitemaps_controller.rb    # Dynamic sitemap generation
│   ├── helpers/
│   │   └── application_helper.rb     # page_title() and meta_description() helpers
│   ├── javascript/
│   │   ├── application.js            # JS entry point (imports Stimulus & Bootstrap)
│   │   ├── controllers/              # Stimulus controllers directory
│   │   │   ├── index.js              # Auto-generated controller loader
│   │   │   ├── theme_controller.js   # Dark/light theme toggle
│   │   │   ├── scroll_animation_controller.js # Scroll-triggered animations
│   │   │   ├── scroll_to_top_controller.js    # Back-to-top button
│   │   │   ├── code_typer_controller.js       # Typing animation for contact page
│   │   │   ├── pacman-game_controller.js      # Interactive Pac-Man game on homepage
│   │   │   └── pacman-preview_controller.js   # Pac-Man preview hint animation
│   │   └── theme/                    # Silicon theme JavaScript
│   │       ├── theme.js              # Theme JS utilities
│   │       └── components/           # Individual JS components
│   ├── models/
│   │   └── application_record.rb     # Base model (no models defined yet)
│   ├── services/
│   │   └── sitemap_generator.rb      # Service for sitemap.xml generation
│   └── views/
│       ├── layouts/
│       │   └── application.html.erb  # Main layout with SEO meta tags
│       ├── shared/
│       │   ├── _header.html.erb      # Site navigation header
│       │   └── _footer.html.erb      # Site footer with social links
│       ├── pages/                    # All page templates
│       │   ├── home.html.erb         # Landing page with hero, projects, tech stack
│       │   ├── contact.html.erb      # Contact page with typing animation
│       │   ├── video_captioner.html.erb # Video Captioner project page
│       │   ├── robots.text.erb       # robots.txt template
│       │   └── hevy_tracker/         # Hevy Tracker project pages
│       │       ├── index.erb         # Main project page
│       │       ├── privacy.html.erb  # Privacy policy
│       │       └── terms.html.erb    # Terms of service
│       ├── errors/
│       │   └── error.html.erb        # Generic error template
│       └── pwa/
│           ├── manifest.json.erb     # PWA manifest
│           └── service-worker.js     # Service worker (minimal)
├── config/
│   ├── application.rb                # Main app config with security headers
│   ├── routes.rb                     # All application routes
│   ├── database.yml                  # PostgreSQL configuration
│   ├── importmap.rb                  # JavaScript importmap configuration
│   ├── initializers/
│   │   ├── assets.rb                 # Asset pipeline configuration
│   │   ├── content_security_policy.rb # CSP configuration
│   │   └── sitemap.rb                # Sitemap generation config
│   └── environments/                 # Environment-specific configs
├── db/
│   └── schema.rb                     # Empty schema (no migrations yet)
├── public/                           # Static assets
│   ├── favicon files                 # Various favicon formats
│   ├── site.webmanifest             # PWA manifest
│   └── sitemap.xml.gz               # Compressed sitemap
├── .github/
│   └── copilot-instructions.md      # This file
├── Gemfile                           # Ruby dependencies
├── package.json                      # Node dependencies (Bootstrap, Popper)
└── render.yaml                       # Render.com deployment config

../Silicon/                           # Silicon Bootstrap theme (separate directory)
├── assets/                           # Compiled theme assets
│   ├── css/                          # Compiled CSS
│   ├── js/                           # Compiled JS (theme.js, theme.min.js)
│   ├── img/                          # Theme images and examples
│   └── vendor/                       # Third-party libraries
├── src/                              # Source files
│   ├── scss/                         # Theme SCSS source
│   │   ├── theme.scss               # Main theme SCSS entry
│   │   ├── _variables.scss          # Theme variables
│   │   ├── _variables-dark.scss     # Dark mode variables
│   │   └── components/              # Component-specific SCSS
│   └── js/                           # Theme JavaScript source
│       ├── theme.js                 # Main theme JS entry
│       └── components/              # JS components (navbar, tooltips, etc.)
├── components/                       # HTML component examples
├── docs/                             # Theme documentation
└── *.html                            # Demo pages and examples
```

## Key Files & Their Purposes

### Controllers
- **`pages_controller.rb`**: All static page actions (home, contact, hevy_tracker, video_captioner, robots)
- **`errors_controller.rb`**: Custom error handling (404, 500, 422, 406)
- **`sitemaps_controller.rb`**: Generates and serves sitemap.xml.gz

### Views & Partials
- **`layouts/application.html.erb`**: 
  - Main layout wrapper with `<head>` containing all meta tags
  - Google Analytics integration
  - SEO optimization (Open Graph, Twitter Cards)
  - Dark mode support via `data-bs-theme="dark"`
  - Favicon links and PWA manifest
  - Structured with `<header>`, `<main>`, `<footer>`
  
- **`shared/_header.html.erb`**: 
  - Responsive navbar with centered logo
  - Theme switcher (light/dark mode)
  - Navigation links to projects and contact
  - Sticky header with glassmorphic background
  
- **`shared/_footer.html.erb`**: 
  - Social media links (GitHub, LinkedIn, Email)
  - Footer navigation
  - Copyright notice with dynamic year
  - Back-to-top button integration

### Stimulus Controllers (app/javascript/controllers/)
- **`theme_controller.js`**: 
  - Manages dark/light theme toggle
  - Persists preference to localStorage
  - Listens to system preference changes
  - Default: dark mode
  
- **`scroll_animation_controller.js`**: 
  - Implements scroll-triggered fade-in animations
  - Uses Intersection Observer API
  - Adds `.visible` class when elements enter viewport
  - Used for `.fade-in-view` elements
  
- **`scroll_to_top_controller.js`**: 
  - Shows/hides back-to-top button based on scroll position
  - Smooth scroll to top on click
  - Appears after scrolling 300px down
  
- **`code_typer_controller.js`**: 
  - Contact page background animation
  - Types C code snippets in terminal style
  - Infinite loop through multiple code samples
  - Maintains ~25 visible lines at a time
  - Green terminal text effect

### Stylesheets
- **`app/assets/stylesheets/application.scss`**: 
  - Imports Bootstrap from node_modules
  - Imports Silicon theme components
  - Imports custom styles last
  
- **`app/assets/stylesheets/_custom.scss`**: 
  - **PRIMARY CUSTOM STYLES FILE**
  - Hero section animations (gradient background, floating code snippets, tech grid)
  - Project card hover effects
  - Technology card styles
  - Contact page glassmorphic cards
  - CTA section styling
  - Scroll animations
  - Dark mode specific overrides
  - All site-specific custom CSS lives here

### Routing (`config/routes.rb`)
```ruby
root "pages#home"                          # Homepage

# Hevy Tracker project pages
scope path: "hevy-tracker", as: :hevy_tracker do
  get "/", to: "pages#hevy_tracker"
  get "privacy", to: "pages#hevy_tracker_privacy"
  get "terms", to: "pages#hevy_tracker_terms"
  get "spreadsheet", to: redirect(...)     # External redirect
end

get "contact", to: "pages#contact"
get "video-captioner", to: "pages#video_captioner"
get "/robots.txt", to: "pages#robots"

# Error pages
match "/404", to: "errors#not_found", via: :all
match "/500", to: "errors#internal_server_error", via: :all
# ... more error routes

# Sitemap
get "/sitemap.xml.gz", to: "sitemaps#show"
```

## Pac-Man Game Feature

The homepage includes a fully interactive Pac-Man game that players can activate by pressing WASD or arrow keys. This is a **major feature** of the portfolio site.

### Game Architecture

#### Stimulus Controllers
1. **`pacman-preview_controller.js`** (Small, ~40 lines)
   - Shows animated Pac-Man hint on homepage
   - Bounces Pac-Man with mouth animation
   - Displays "Use WASD or ↑←↓→ to play" message
   - Hides when game starts

2. **`pacman-game_controller.js`** (Large, ~1500+ lines)
   - Full Pac-Man game implementation
   - Game loop with requestAnimationFrame
   - Collision detection, scoring, lives system
   - Ghost AI with pathfinding algorithms
   - Sound effects integration
   - Smooth scrolling to keep Pac-Man centered
   - Respawn system with countdown
   - Game over modal with replay functionality

#### Game Mechanics
- **Controls**: WASD or Arrow Keys to move Pac-Man
- **Objective**: Eat all dots while avoiding ghosts
- **Lives**: 3 lives (displayed as Pac-Man icons in HUD)
- **Score**: 10 points per dot, 50 points per power pellet, 200 points per ghost
- **Power Mode**: Eating power pellets makes ghosts frightened (blue) for 10 seconds
- **Wrapping**: Pac-Man and ghosts can wrap around screen edges
- **Scrolling**: Page auto-scrolls to keep Pac-Man centered vertically

#### Ghost AI Behaviors
- **Blinky (Red)**: Directly chases Pac-Man (aggressive)
- **Pinky (Pink)**: Targets 4 tiles ahead of Pac-Man (ambush)
- **Inky (Cyan)**: Uses vector between Blinky and Pac-Man (unpredictable)
- **Clyde (Orange)**: Chases when far, scatters when close (shy)
- **Scatter Mode**: Ghosts alternate between chasing and retreating to corners
- **Pathfinding**: Uses A* algorithm to navigate around boundaries
- **Edge Wrapping**: Ghosts understand and can use screen edge teleportation

#### Visual Assets
All sprites located in `app/assets/images/pacman-game/`:
- **Pac-Man**: `pacman/pacman_open.png`, `pacman_open_more.png`, `pacman_closed.png`
  - Rotated via CSS for different directions
  - Animated mouth movement during gameplay
- **Ghosts**: Each ghost has 8 directional sprites (up-1, up-2, down-1, down-2, left-1, left-2, right-1, right-2)
  - `ghosts/blinky-*.png` (red)
  - `ghosts/pinky-*.png` (pink)
  - `ghosts/inky-*.png` (cyan)
  - `ghosts/clyde-*.png` (orange)
- **Frightened Mode**: `ghosts/frightened-1.png`, `ghosts/frightened-2.png` (blue, animated)
- **Dots & Pellets**: Created dynamically via canvas rendering (not image files)

#### Sound Effects
All sounds located in `app/assets/images/pacman-game/sounds/` (in images dir for proper asset pipeline compilation):
- **`pacman_beginning.wav`**: Plays once at game start, game waits for it to finish before starting
- **`pacman_chomp.wav`**: Continuous loop while moving and eating dots
- **`pacman_eatghost.wav`**: Plays when eating a frightened ghost
- **`pacman_death.wav`**: Plays when Pac-Man loses a life
- **`pacman_extrapac.wav`**: Reserved for bonus life (not yet implemented)
- **`pacman_eatfruit.wav`**: Reserved for fruit collection (not yet implemented)
- **`pacman_intermission.wav`**: Reserved for level completion (not yet implemented)

**Sound System**: 
- Uses Web Audio API for precise control
- Sounds are preloaded on game initialization
- Chomp sound loops continuously during movement
- All sounds stop during countdown/respawn

#### Game States
1. **Idle**: Preview animation showing, waiting for keypress
2. **Starting**: Beginning music plays, entities frozen
3. **Playing**: Active gameplay, collision detection, scoring
4. **PowerMode**: Ghosts frightened, Pac-Man can eat them
5. **Respawning**: Countdown (3-2-1), entities reset to start positions
6. **GameOver**: Modal shown with final score and "Play Again" button

#### HUD (Heads-Up Display)
- **Position**: Fixed to viewport, moves with scroll
- **Score**: Current score display
- **Lives**: Visual Pac-Man icons (❤️ symbols currently)
- **Styling**: Semi-transparent dark background, rounded corners

#### Respawn System
- 3-second countdown (3... 2... 1...)
- Smooth scroll back to spawn location
- Entities frozen during countdown
- Pac-Man automatically moves in random direction after countdown
- Ghosts start from slightly offset positions around spawn

#### Collision Detection
- **Ghost Collision**: 
  - Normal mode: Lose life, respawn sequence
  - Power mode: Eat ghost for 200 points, ghost respawns
- **Dot Collection**: 
  - Regular dots: 10 points, removed from game
  - Power pellets: 50 points, triggers power mode
- **Boundary Detection**: 
  - Header and footer are hard boundaries
  - Left/right edges wrap around
  - Page content doesn't block movement (Pac-Man passes over it)

#### Performance Optimizations
- Dots generated in sections for better performance
- Efficient collision detection using bounding boxes
- RequestAnimationFrame for smooth 60fps gameplay
- Asset preloading to prevent lag
- Mouse scroll disabled during gameplay

#### Integration with Homepage
Located in `app/views/pages/home.html.erb`:
```erb
<!-- Pac-Man Preview Hint -->
<div data-controller="pacman-preview" class="pacman-idle-hint">
  <img class="pacman-preview" src="<%= asset_path('pacman-game/pacman/pacman_closed.png') %>" alt="Pac-Man">
  <div class="hint-text">
    Use <strong>WASD</strong> or <strong>↑←↓→</strong> to play
  </div>
</div>

<!-- Pac-Man Game -->
<div data-controller="pacman-game" 
     data-pacman-game-sprite-value="<%= asset_path('pacman-game/pacman/pacman_closed.png') %>"
     class="pacman-game-container">
  <!-- Game canvas and HUD elements created dynamically -->
</div>
```

### Styling (in `_custom.scss`)
- `.pacman-idle-hint`: Animated preview with bounce effect
- `.pacman-game-hud`: Fixed HUD positioning and styling  
- `.pacman-sprite`, `.ghost-sprite`: Positioned absolutely, smooth transitions
- `.game-modal`: Game over modal styling
- `.dot`, `.power-pellet`: Canvas-rendered collectibles

### Known Issues & Future Enhancements
- No level progression (infinite game on single level)
- No fruit bonuses yet
- No bonus life at 10,000 points
- Could add more sound effects for power mode, ghost eaten
- Could add high score persistence (localStorage)
- Could add mobile touch controls

## Silicon Theme Integration

The Silicon theme (located at `../Silicon`) is a premium Bootstrap 5 template that provides:

### What Silicon Provides
- **Comprehensive Component Library**: 40+ pre-built UI components
- **Dark Mode Support**: Built-in dark theme with CSS variables
- **JavaScript Components**: Sticky navbar, scroll animations, tooltips, carousels, galleries, etc.
- **SCSS Architecture**: Modular, customizable SCSS with Bootstrap 5 variables
- **Responsive Design**: Mobile-first approach
- **Typography**: Manrope font family (loaded via Google Fonts)
- **Icons**: Boxicons integration

### How Silicon Is Used in This Project
1. **SCSS Components**: Copied to `app/assets/stylesheets/theme/`
   - Theme variables and mixins
   - Component styles (buttons, cards, navbars, etc.)
   - Dark mode variable overrides
   
2. **JavaScript Components**: Minimal usage
   - Copied specific components to `app/javascript/theme/`
   - Using theme utilities for scroll effects, sticky navbar
   - Most interactivity handled by custom Stimulus controllers
   
3. **Assets**: 
   - Not using Silicon's compiled assets directly
   - Referencing Silicon's structure for styling patterns
   - Using Boxicons CDN (loaded in layout)
   
4. **Customization Strategy**:
   - Override Silicon variables in `theme/_user-variables.scss`
   - Add custom styles in `_custom.scss` (never modify theme files directly)
   - Maintain separation between theme code and custom code

### Silicon Component Reference
When Silicon components are needed, reference the `../Silicon` directory:
- **Components**: `../Silicon/components/*.html` - HTML examples
- **SCSS**: `../Silicon/src/scss/components/_*.scss` - Component styles
- **JS**: `../Silicon/src/js/components/*.js` - Component behaviors
- **Docs**: `../Silicon/docs/` - Full documentation

## Design Patterns & Conventions

### View Patterns
- **Page Structure**: Each page starts with `content_for :title` and `meta_description` helper
- **Sections**: Wrapped in `<section>` with descriptive classes
- **Animations**: Use `.fade-in-view` class + `scroll-animation` controller
- **Cards**: `.project-card`, `.tech-card`, `.contact-glass-card` classes
- **Icons**: Boxicons classes (e.g., `bx bx-code-alt`)

### CSS Conventions
- **BEM-like naming**: `.hero-section`, `.project-card`, `.tech-badge`
- **State classes**: `.visible`, `.active`, `.navbar-stuck`
- **Theme-aware**: Use `[data-bs-theme="dark"]` selector for dark mode overrides
- **Animations**: Keyframe animations in `_custom.scss` (e.g., `@keyframes fadeInUp`)
- **Responsive**: Mobile-first, use Bootstrap breakpoints

### JavaScript Patterns
- **Stimulus conventions**: Use `data-controller`, `data-action`, `data-target` attributes
- **Controller naming**: kebab-case in HTML, camelCase in JS files
- **Targets**: Define with `static targets = ["element"]`
- **Lifecycle**: Use `connect()` for setup, `disconnect()` for cleanup

### Rails Conventions
- **Helpers**: Use `page_title()` and `meta_description()` in views
- **Assets**: Use `asset_path()` or `asset_url()` for asset URLs
- **Links**: Use `link_to` helper, never raw `<a>` tags for internal links
- **Partials**: Prefix with underscore, render with `render 'shared/header'`
- **Routes**: Use named route helpers (e.g., `hevy_tracker_path`, `contact_path`)

## Featured Pages & Components

### Home Page (`pages/home.html.erb`)
- **Hero Section**: 
  - Animated gradient background
  - Floating code snippets animation
  - Tech grid pattern
  - CTA buttons with pulse effect
  - Tech stack badges
  - Scroll indicator
  
- **Projects Section**: 
  - 3 featured project cards (Hevy Tracker, Video Captioner, Robot Motion Planning)
  - Hover animations with elevated shadows
  - Project icons with rotation effects
  - Technology badges
  - External/internal links
  
- **Technologies Section**: 
  - Categorized tech cards (Languages, Frameworks, Data/AI, Tools, IDEs)
  - Interactive hover effects
  - Icon animations
  - Organized in responsive grid
  
- **CTA Section**: 
  - Glassmorphic card design
  - Quick stats (Available From, Location, Status)
  - Action buttons (Contact, Email)

### Contact Page (`pages/contact.html.erb`)
- **Unique Features**:
  - Active C code typing animation (background)
  - Glassmorphic design elements
  - Animated gradient background (darker theme)
  
- **Contact Methods**: Email button (primary CTA)
- **Social Links**: LinkedIn, GitHub with hover animations
- Uses `code-typer` Stimulus controller for background animation

### Hevy Tracker Pages (`pages/hevy_tracker/`)
- OAuth integration documentation
- Step-by-step setup guide
- Privacy policy and Terms of Service
- External links to Google Workspace Marketplace

### Video Captioner Page
- Desktop tool download page
- Feature showcase
- Technical details about AI transcription

## SEO & Meta Tags

### Meta Tag Strategy
Every page should have:
```erb
<% content_for :title, page_title("Page Title") %>
<% meta_description "Page-specific meta description under 160 chars" %>
```

### Included Meta Tags (in layout)
- **Basic**: charset, viewport, title, description, author, language, robots, canonical
- **Open Graph**: og:type, og:url, og:title, og:description, og:image
- **Twitter Card**: twitter:card, twitter:url, twitter:title, twitter:description, twitter:image
- **Security**: CSRF meta tags, CSP meta tag
- **PWA**: favicon links, manifest link

### Default Values
- Default title: "gelbhart.dev"
- Default description: "Personal portfolio and development projects by Tomer Gelbhart..."
- Default image: Logo (`logos/logo_icon_only_transparent.png`)

## Styling & Theming

### Color Palette
- **Primary**: `#6366f1` (Indigo)
- **Secondary**: Various (defined in Silicon theme)
- **Gradient**: `linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)`
- **Dark Mode**: Deep blacks with subtle colored accents

### Typography
- **Font Family**: Manrope (400, 500, 600, 700, 800 weights)
- **Source**: Google Fonts
- **Headings**: Bold weights (700-800)
- **Body**: 400-500 weights
- **Code**: 'Courier New', monospace

### Dark Mode Implementation
- Uses Bootstrap 5.3's built-in dark mode via `data-bs-theme` attribute
- Toggle managed by `theme_controller.js`
- Persisted to localStorage
- Default: dark mode
- CSS overrides in `[data-bs-theme="dark"]` selectors

### Animation Principles
- **Smooth transitions**: `cubic-bezier(0.4, 0, 0.2, 1)` for modern feel
- **Hover effects**: Translate, scale, shadow changes
- **Scroll animations**: Fade-in with slide-up effect
- **Performance**: Use `transform` and `opacity` (GPU accelerated)

## Development Workflow

### Asset Compilation
- **SCSS**: Compiled by Sprockets with SassC
- **JavaScript**: Bundled via importmap
- **Bootstrap**: Imported from node_modules
- **Precompilation**: `rails assets:precompile` for production

### Adding New Pages
1. Add route in `config/routes.rb`
2. Add action to `PagesController` (if needed)
3. Create view file in `app/views/pages/`
4. Add SEO meta tags with `content_for` and `meta_description`
5. Use existing component classes from `_custom.scss`
6. Add navigation links to header/footer if needed

### Adding New Stimulus Controllers
1. Create file in `app/javascript/controllers/` (e.g., `example_controller.js`)
2. Export controller extending `Controller` from Stimulus
3. Define targets, values, classes as needed
4. Implement lifecycle methods (`connect()`, `disconnect()`)
5. Add `data-controller="example"` to HTML element
6. Add actions with `data-action="click->example#method"`
7. Test in browser

### Customizing Styles
1. **Theme variables**: Edit `app/assets/stylesheets/theme/_user-variables.scss`
2. **Custom styles**: Add to `app/assets/stylesheets/_custom.scss`
3. **Component overrides**: Use more specific selectors in `_custom.scss`
4. **Dark mode**: Add `[data-bs-theme="dark"]` selector variants
5. **Never modify**: Files in `theme/` directory directly (maintain upgrade path)

### Silicon Theme Updates
If updating Silicon theme components:
1. Compare current `../Silicon` with new version
2. Copy updated SCSS files to `app/assets/stylesheets/theme/`
3. Test for breaking changes
4. Update custom overrides if needed
5. Document changes in git commit

## Common Tasks & Code Patterns

### Adding a New Project Card
```erb
<div class="col-lg-4 col-md-6 fade-in-view delay-1">
  <article class="card project-card border-0 shadow-sm h-100">
    <div class="card-body p-4">
      <div class="d-flex align-items-center mb-3">
        <div class="flex-shrink-0">
          <div class="project-icon bg-primary bg-opacity-10 rounded-3 p-3">
            <i class="bx bx-icon-name fs-1 text-primary"></i>
          </div>
        </div>
        <div class="flex-grow-1 ms-3">
          <h3 class="h5 mb-0">Project Name</h3>
          <span class="fs-sm text-muted">Technology</span>
        </div>
      </div>
      <p class="card-text mb-4">
        Project description goes here.
      </p>
      <div class="d-flex gap-2 mb-3 flex-wrap">
        <span class="badge project-badge bg-primary bg-opacity-10 text-primary">Tech</span>
      </div>
      <%= link_to project_path, class: "btn btn-outline-primary stretched-link project-btn" do %>
        Learn More <i class="bx bx-right-arrow-alt fs-5 ms-2 arrow-icon"></i>
      <% end %>
    </div>
  </article>
</div>
```

### Adding a New Animated Section
```erb
<section class="container py-5" data-controller="scroll-animation">
  <h2 class="h1 text-center mb-5 fade-in-view">Section Title</h2>
  
  <div class="row g-4">
    <div class="col-lg-4 fade-in-view delay-1">
      <!-- Content -->
    </div>
    <div class="col-lg-4 fade-in-view delay-2">
      <!-- Content -->
    </div>
    <div class="col-lg-4 fade-in-view delay-3">
      <!-- Content -->
    </div>
  </div>
</section>
```

### Creating a Custom Animation
```scss
// In _custom.scss

// Define the animation
@keyframes myAnimation {
  0% {
    opacity: 0;
    transform: translateX(-20px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

// Apply to element
.my-animated-element {
  animation: myAnimation 0.6s ease forwards;
  
  // Dark mode variant if needed
  [data-bs-theme="dark"] & {
    // Dark mode specific styles
  }
}
```

### Adding a New Route
```ruby
# In config/routes.rb

# Simple route
get "new-page", to: "pages#new_page"

# Scoped routes (for related pages)
scope path: "project-name", as: :project do
  get "/", to: "pages#project_index"
  get "details", to: "pages#project_details"
end
```

## Performance Optimization

### Current Optimizations
- **Asset preloading**: Logo and critical fonts
- **CDN usage**: Google Fonts, Boxicons
- **Lazy loading**: Images with `loading="lazy"`
- **Async decoding**: Images with `decoding="async"`
- **Compression**: Gzip for sitemap
- **Caching**: Expires headers on robots.txt
- **Turbo**: SPA-like navigation without full page reloads
- **Critical CSS**: Separate critical.scss for above-the-fold content

### Best Practices
- Keep animations GPU-accelerated (`transform`, `opacity`)
- Minimize JavaScript bundle size (use importmap selectively)
- Optimize images before upload
- Use CSS animations over JavaScript when possible
- Leverage browser caching with proper headers

## Security Considerations

### Implemented Security
- **CSP**: Content Security Policy configured
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy
- **CSRF Protection**: Rails CSRF tokens on all forms
- **CORS**: Configured with rack-cors gem
- **External Links**: `rel="noopener"` on all `target="_blank"` links
- **Input Sanitization**: Rails built-in protections

### Security Headers (from `config/application.rb`)
```ruby
config.action_dispatch.default_headers.merge!(
  "X-Frame-Options" => "DENY",
  "X-Content-Type-Options" => "nosniff",
  "X-XSS-Protection" => "1; mode=block",
  "Referrer-Policy" => "strict-origin-when-cross-origin"
)
```

## Testing & Quality

### Current Setup
- **Test Framework**: Rails built-in Minitest
- **System Tests**: Capybara + Selenium WebDriver
- **Linting**: RuboCop with Rails Omakase configuration
- **Security Scanning**: Brakeman for security vulnerabilities

### Running Tests
```bash
# Run all tests
rails test

# Run system tests
rails test:system

# Run RuboCop
rubocop

# Run Brakeman security scan
brakeman
```

## Deployment

### Platform
- **Host**: Render.com
- **Config**: `render.yaml` in project root
- **Database**: PostgreSQL on Render
- **Environment**: Production

### Build Process
1. Bundle install
2. Yarn install
3. Asset precompilation
4. Database migration (if needed)

### Environment Variables
Check Render dashboard for configured environment variables.

## External Dependencies

### Ruby Gems (from Gemfile)
- `rails` (~> 8.0.0) - Framework
- `sprockets-rails` - Asset pipeline
- `sassc-rails` - SCSS compilation
- `bootstrap` (~> 5.3.0) - CSS framework
- `terser` - JavaScript minification
- `pg` - PostgreSQL adapter
- `puma` - Web server
- `importmap-rails` - JavaScript imports
- `turbo-rails` - Hotwire Turbo
- `stimulus-rails` - Hotwire Stimulus
- `jbuilder` - JSON builder
- `rack-cors` - CORS middleware
- `mini_racer` - V8 JavaScript engine

### NPM Packages (from package.json)
- `@popperjs/core` (^2.11.8) - Tooltip/popover positioning
- `bootstrap` (^5.3.3) - Bootstrap framework

### CDN Dependencies
- **Google Fonts**: Manrope font family
- **Boxicons**: Icon library (https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css)
- **Google Analytics**: Tag Manager for analytics

## Troubleshooting Common Issues

### Assets Not Loading
1. Check `config/initializers/assets.rb` for precompile paths
2. Verify asset path with `asset_path()` or `asset_url()` helpers
3. Run `rails assets:clobber` then `rails assets:precompile`
4. Check browser console for 404 errors

### Dark Mode Not Working
1. Verify `theme_controller.js` is loaded
2. Check `data-controller="theme"` on element with checkbox
3. Inspect localStorage for "theme" key
4. Verify Bootstrap dark mode CSS is loaded

### Stimulus Controller Not Connecting
1. Check controller filename matches convention (kebab-case)
2. Verify `data-controller` attribute matches controller name
3. Check browser console for JavaScript errors
4. Ensure Stimulus is imported in `application.js`

### Scroll Animations Not Triggering
1. Verify `scroll-animation` controller is attached to parent
2. Check elements have `.fade-in-view` class
3. Inspect if Intersection Observer is supported
4. Check scroll position and viewport threshold

## Contact & Projects Information

### Featured Projects
1. **Hevy Tracker** - Google Apps Script integration for Hevy fitness app
   - OAuth 2.0 authentication
   - Google Sheets™ integration
   - Available on Google Workspace Marketplace
   
2. **Video Captioner** - AI-powered video caption generator
   - Whisper AI transcription
   - Python desktop application
   - YouTube and local file support
   - 15+ language support
   
3. **Robot Motion Planning** - MATLAB genetic algorithm implementation
   - Path optimization
   - Interactive UI
   - Real-time visualization

### Owner Information
- **Name**: Tomer Gelbhart
- **Education**: MSc Computer Science student at UCD (University College Dublin)
- **Location**: Dublin, Ireland
- **Availability**: May 2026 (for internships)
- **Focus**: Full-stack development, back-end strengthening
- **Email**: tomer@gelbhart.dev
- **GitHub**: https://github.com/gelbh
- **LinkedIn**: https://linkedin.com/in/tomer-gelbhart

## Code Style Guidelines

### Ruby Style
- Follow RuboCop Rails Omakase configuration
- Use 2-space indentation
- Prefer double quotes for strings
- Use Ruby 3.x syntax features
- Keep methods small and focused

### JavaScript Style
- Use ES6+ features (arrow functions, const/let, template literals)
- 2-space indentation
- Semicolons optional but consistent
- Use Stimulus conventions for DOM interaction
- Avoid jQuery

### HTML/ERB Style
- Use semantic HTML5 elements
- Prefer ERB helpers over raw HTML for links and assets
- Keep views clean (logic in helpers/controllers)
- Use data attributes for JavaScript hooks
- Maintain consistent indentation

### CSS/SCSS Style
- Use BEM-like naming for custom classes
- Group related styles together
- Comment section dividers
- Mobile-first responsive design
- Leverage Bootstrap utilities when possible
- Keep specificity low

## Future Enhancements & TODOs

Based on current structure, potential future additions:
- **Blog System**: Add posts model/controller for technical blog
- **Admin Interface**: For managing content
- **Contact Form**: Backend submission (currently just email link)
- **Project Filtering**: JavaScript-based project category filtering
- **Analytics Dashboard**: Visualize Google Analytics data
- **API Endpoints**: JSON API for projects/skills data
- **Newsletter**: Email subscription integration
- **Search**: Site-wide search functionality

## Quick Reference Commands

```bash
# Development
rails server                    # Start development server
rails console                   # Open Rails console
rails routes                    # List all routes
rails db:migrate               # Run migrations
rails assets:precompile        # Compile assets

# Testing & Quality
rails test                     # Run all tests
rails test:system             # Run system tests
rubocop                        # Run Ruby linter
rubocop -a                     # Auto-fix linting issues
brakeman                       # Security scan

# Asset Management
rails assets:clobber          # Clear compiled assets
rails tmp:clear               # Clear tmp files

# Debugging
rails dbconsole               # Open database console
tail -f log/development.log   # Follow development logs
```

## Important Notes for GitHub Copilot

### When Editing Code
1. **Preserve Existing Patterns**: Follow established naming conventions and file organization
2. **Maintain Dark Mode Support**: Always add dark mode variants for new styles
3. **Keep SEO Intact**: Ensure meta tags are present on all new pages
4. **Use Stimulus**: Prefer Stimulus controllers over inline JavaScript
5. **Reference Silicon**: Check Silicon theme for existing components before creating new ones
6. **Test Responsive**: Always consider mobile, tablet, and desktop layouts
7. **Animation Performance**: Use GPU-accelerated properties
8. **Accessibility**: Include aria-labels, alt text, semantic HTML

### When Creating New Features
1. **Check existing components** in `_custom.scss` and Silicon theme first
2. **Follow the view pattern**: content_for + meta_description + sections
3. **Add route** to `config/routes.rb` and update navigation if needed
4. **Use helpers**: `page_title()`, `meta_description()`, `asset_path()`, `link_to()`
5. **Create Stimulus controller** for complex interactions
6. **Update this file** if adding significant new patterns or conventions
7. **DO NOT create separate documentation files** - update this file instead

### Pac-Man Game Maintenance
When working on the Pac-Man game:
- **Main controller**: `app/javascript/controllers/pacman-game_controller.js` (~1500 lines)
- **Asset paths**: Always use `asset_path()` helper in ERB, gets compiled to correct hashed paths
- **Sound loading**: Sounds must be preloaded in `connect()` method before use
- **Performance**: Use requestAnimationFrame for game loop, never setTimeout/setInterval
- **Ghost AI**: Each ghost has unique behavior - don't break their personalities
- **Collision detection**: Already optimized - don't add unnecessary checks
- **Scrolling**: Keep Pac-Man centered vertically - this is a key feature
- **Respawn**: Must include countdown and smooth scroll back to spawn point

### Silicon Theme Relationship
- The Rails app **references** Silicon but doesn't directly include compiled Silicon assets
- Silicon SCSS components are **copied** to `app/assets/stylesheets/theme/`
- **Never modify** theme files directly - always use `_custom.scss` for overrides
- Use `../Silicon` as a **reference** and **component library** for inspiration

---

**Last Updated**: October 2024
**Maintainer**: Tomer Gelbhart  
**Version**: 2.0.0 (Added Pac-Man Game Feature)
**Major Features**: 
- Full Pac-Man game implementation on homepage
- 4 ghosts with unique AI behaviors  
- Sound effects integration
- Smooth scrolling gameplay
- Power pellets and ghost eating
- Lives and scoring system
