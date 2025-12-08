import { application } from "controllers/application";

// Explicitly import and register all controllers BEFORE starting Stimulus
// This ensures all controllers are registered before Stimulus scans the DOM
// and prevents lazy-loading attempts that cause 404 errors

// Pac-Man game controllers
import PacmanGameController from "controllers/pacman/game_controller";
import PacmanInputController from "controllers/pacman/input_controller";
import PacmanMenuController from "controllers/pacman/menu_controller";
import PacmanPreviewController from "controllers/pacman/preview_controller";

// Analytics controllers
import AnalyticsStatsController from "controllers/analytics/stats_controller";

// UI controllers
import CodeTyperController from "controllers/ui/code_typer_controller";
import CounterController from "controllers/ui/counter_controller";
import ThemeController from "controllers/ui/theme_controller";
import LazyIframeController from "controllers/ui/lazy_iframe_controller";

// Animation controllers
import ScrollAnimationController from "controllers/animation/scroll_controller";
import ScrollToTopController from "controllers/animation/scroll_to_top_controller";

// Project controllers
import GoogleMapsConverterController from "controllers/projects/google_maps_converter_controller";
import StyleModalController from "controllers/projects/style_modal_controller";

// Register all controllers with their kebab-case names
application.register("pacman-game", PacmanGameController);
application.register("pacman-input", PacmanInputController);
application.register("pacman-menu", PacmanMenuController);
application.register("pacman-preview", PacmanPreviewController);

application.register("analytics-stats", AnalyticsStatsController);
application.register("code-typer", CodeTyperController);
application.register("counter", CounterController);
application.register("lazy-iframe", LazyIframeController);
application.register("scroll-animation", ScrollAnimationController);
application.register("scroll-to-top", ScrollToTopController);
application.register("theme", ThemeController);
application.register("google-maps-converter", GoogleMapsConverterController);
application.register("style-modal", StyleModalController);

// Start Stimulus AFTER all controllers are registered
// This prevents Stimulus from attempting to lazy-load controllers
application.start();
