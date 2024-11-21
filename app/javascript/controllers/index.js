import { application } from "./application";
import { eagerLoadControllersFrom } from "@hotwired/stimulus-loading";

// Load all controllers
eagerLoadControllersFrom("controllers", application);

// Lazy load controllers
import ThemeController from "./theme_controller";
application.register("theme", ThemeController);
