# JavaScript entrypoints
pin "application", preload: true
pin "@hotwired/turbo-rails", to: "turbo.min.js", preload: true
pin "@hotwired/stimulus", to: "stimulus.min.js", preload: true

# Bootstrap and Popper
pin "bootstrap", to: "https://ga.jspm.io/npm:bootstrap@5.3.3/dist/js/bootstrap.esm.js"
pin "@popperjs/core", to: "https://ga.jspm.io/npm:@popperjs/core@2.11.8/lib/index.js"

# Library dependencies
pin "i18n-iso-countries/langs/en.json", to: "i18n-iso-countries-langs-en.js"
pin "localforage", to: "https://ga.jspm.io/npm:localforage@1.10.0/dist/localforage.js"
pin "he", to: "https://ga.jspm.io/npm:he@1.2.0/he.js"
pin "axios", to: "https://esm.sh/axios@1.13.2"
pin "eases", to: "https://ga.jspm.io/npm:eases@1.0.8/index.js"
pin "i18n-iso-countries", to: "https://ga.jspm.io/npm:i18n-iso-countries@7.14.0/index.js"
pin "lodash.debounce", to: "https://ga.jspm.io/npm:lodash.debounce@4.0.8/index.js"
pin "diacritics", to: "https://ga.jspm.io/npm:diacritics@1.3.0/index.js"
pin "lodash.throttle", to: "https://ga.jspm.io/npm:lodash.throttle@4.1.1/index.js"
pin "date-fns/formatDistanceToNow", to: "https://ga.jspm.io/npm:date-fns@4.1.0/formatDistanceToNow.js"
pin "date-fns/format", to: "https://ga.jspm.io/npm:date-fns@4.1.0/format.js"
pin "date-fns/differenceInDays", to: "https://ga.jspm.io/npm:date-fns@4.1.0/differenceInDays.js"

# Controllers
pin_all_from "app/javascript/controllers", under: "controllers", preload: true

# Theme files
pin_all_from "app/javascript/theme", under: "theme"

# Library files
pin_all_from "app/javascript/lib", under: "lib"
