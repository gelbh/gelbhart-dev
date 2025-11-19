# JavaScript entrypoints
pin "application", preload: true
pin "@hotwired/turbo-rails", to: "turbo.min.js", preload: true
pin "@hotwired/stimulus", to: "stimulus.min.js", preload: true

# Bootstrap and Popper
pin "bootstrap", to: "https://ga.jspm.io/npm:bootstrap@5.3.3/dist/js/bootstrap.esm.js"
pin "@popperjs/core", to: "https://ga.jspm.io/npm:@popperjs/core@2.11.8/lib/index.js"

# Controllers
pin_all_from "app/javascript/controllers", under: "controllers", preload: true

# Theme files
pin_all_from "app/javascript/theme", under: "theme"

# Library files (pacman game modules, etc.)
pin_all_from "app/javascript/lib", under: "lib"
