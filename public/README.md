# Public Folder Organization

This directory contains static files served directly by the web server. Files in this directory are accessible at the root URL path (e.g., `/robots.txt`, `/favicon.ico`).

## Folder Structure

```
public/
├── icons/                    # Organized icon files
│   ├── android/             # Android app icons
│   │   ├── android-icon-192x192.png
│   │   └── android-icon-512x512.png
│   ├── ms/                  # Microsoft tile icons
│   │   ├── ms-icon-70x70.png
│   │   ├── ms-icon-144x144.png
│   │   ├── ms-icon-150x150.png
│   │   └── ms-icon-310x310.png
│   ├── favicons/            # Additional favicon variants
│   │   ├── favicon-16x16.png
│   │   ├── favicon-32x32.png
│   │   ├── favicon-96x96.png
│   │   └── favicon.svg
│   ├── icon.png
│   └── icon.svg
├── assets/                  # Compiled Rails assets (managed by Rails)
├── downloads/               # Downloadable files
│   └── video_captioner_*.py
├── *.html                   # Error pages (must be at root)
├── favicon.ico              # Primary favicon (must be at root)
├── apple-touch-icon.png     # Apple touch icon (must be at root)
├── robots.txt               # Robots file (must be at root)
├── sitemap.xml              # Sitemap (must be at root)
├── sitemap.xml.gz           # Compressed sitemap (must be at root)
├── site.webmanifest         # Web app manifest (must be at root)
└── browserconfig.xml        # Microsoft browser config (must be at root)
```

## Files That Must Stay at Root

These files must remain at the root of the `public/` directory due to web standards and browser expectations:

- **`favicon.ico`** - Browsers automatically look for this file at the root (`/favicon.ico`)
- **`robots.txt`** - Search engine crawlers expect this at the root (`/robots.txt`)
- **`sitemap.xml`** / **`sitemap.xml.gz`** - Sitemaps are expected at the root
- **Error pages** (`400.html`, `404.html`, `422.html`, `500.html`, `406-unsupported-browser.html`) - Web servers serve these directly from root as fallbacks when Rails cannot boot
- **`browserconfig.xml`** - Referenced as `/browserconfig.xml` in the application layout
- **`site.webmanifest`** - Referenced from root in the application layout
- **`apple-touch-icon.png`** - Apple devices look for this at root (though it can be moved if references are updated)

## Error Pages System

This application uses a **dual error page system**:

### 1. Static HTML Fallbacks (`public/*.html`)
- **Purpose**: Served directly by the web server when Rails cannot boot (database errors, critical exceptions, etc.)
- **Location**: Root of `public/` directory
- **When used**: Last resort fallback when the Rails application is completely unavailable
- **Files**: `400.html`, `404.html`, `422.html`, `500.html`, `406-unsupported-browser.html`

### 2. Dynamic Rails Error Pages (`app/views/errors/`)
- **Purpose**: Custom error pages that use the application layout and styling
- **Location**: `app/views/errors/error.html.erb`
- **Controller**: `app/controllers/errors_controller.rb`
- **Routes**: Configured in `config/routes.rb` (lines 38-41)
- **Configuration**: `config.exceptions_app = self.routes` in `config/application.rb`
- **When used**: When Rails is running and can handle the error through the exceptions_app

The static pages serve as a safety net, while the dynamic pages provide a better user experience with your application's branding and layout when Rails is operational.

## Icon Organization

Icons have been organized into subdirectories for better maintainability:

- **`icons/android/`** - Android app icons referenced in `site.webmanifest`
- **`icons/ms/`** - Microsoft tile icons referenced in `browserconfig.xml`
- **`icons/favicons/`** - Additional favicon variants referenced in `app/views/layouts/application.html.erb`
- **`icons/`** - General icon files (`icon.png`, `icon.svg`)

All icon references have been updated in:
- `app/views/layouts/application.html.erb`
- `public/site.webmanifest`
- `public/browserconfig.xml`

## Adding New Files

When adding new static files:

1. **Icons**: Add to appropriate subdirectory in `icons/`
2. **Downloads**: Add to `downloads/` directory
3. **Root files**: Only add to root if required by web standards
4. **Update references**: Update any references in views, manifests, or config files

## Notes

- The `assets/` directory is managed by Rails asset pipeline - do not manually edit files here
- Files in `public/` are served directly by the web server, bypassing Rails routing
- Paths in this directory map directly to URL paths (e.g., `public/robots.txt` → `/robots.txt`)

