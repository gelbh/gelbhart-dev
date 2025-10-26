# JavaScript entrypoints
pin "application", preload: true
pin "@hotwired/turbo-rails", to: "turbo.min.js", preload: true
pin "@hotwired/stimulus", to: "stimulus.min.js", preload: true
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js", preload: true

# Bootstrap and Popper
pin "bootstrap", to: "https://ga.jspm.io/npm:bootstrap@5.3.3/dist/js/bootstrap.esm.js"
pin "@popperjs/core", to: "https://ga.jspm.io/npm:@popperjs/core@2.11.8/lib/index.js"

# Theme files
pin_all_from "app/javascript/controllers", under: "controllers"
pin_all_from "app/javascript/theme", under: "theme"

# Three.js for 3D visualization
pin "three", to: "https://ga.jspm.io/npm:three@0.168.0/build/three.module.js"
pin "three/addons/controls/OrbitControls", to: "https://ga.jspm.io/npm:three@0.168.0/examples/jsm/controls/OrbitControls.js"
pin "three/addons/postprocessing/EffectComposer.js", to: "https://ga.jspm.io/npm:three@0.168.0/examples/jsm/postprocessing/EffectComposer.js"
pin "three/addons/postprocessing/RenderPass.js", to: "https://ga.jspm.io/npm:three@0.168.0/examples/jsm/postprocessing/RenderPass.js"
pin "three/addons/postprocessing/UnrealBloomPass.js", to: "https://ga.jspm.io/npm:three@0.168.0/examples/jsm/postprocessing/UnrealBloomPass.js"
pin "three/addons/postprocessing/Pass.js", to: "https://ga.jspm.io/npm:three@0.168.0/examples/jsm/postprocessing/Pass.js"
pin "three/addons/postprocessing/ShaderPass.js", to: "https://ga.jspm.io/npm:three@0.168.0/examples/jsm/postprocessing/ShaderPass.js"
