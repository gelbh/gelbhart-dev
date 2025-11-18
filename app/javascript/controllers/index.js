import { application } from "./application";

// Explicitly import and register all controllers BEFORE starting Stimulus
// This ensures all controllers are registered before Stimulus scans the DOM
// and prevents lazy-loading attempts that cause 404 errors

import AnalyticsStatsController from "./analytics_stats_controller";
import CodeTyperController from "./code_typer_controller";
import CounterController from "./counter_controller";
import PacmanGameController from "./pacman_game_controller";
import PacmanPreviewController from "./pacman-preview_controller";
import ScrollAnimationController from "./scroll_animation_controller";
import ScrollToTopController from "./scroll_to_top_controller";
import ThemeController from "./theme_controller";

// Register all controllers with their kebab-case names
application.register("analytics-stats", AnalyticsStatsController);
application.register("code-typer", CodeTyperController);
application.register("counter", CounterController);
application.register("pacman-game", PacmanGameController);
application.register("pacman-preview", PacmanPreviewController);
application.register("scroll-animation", ScrollAnimationController);
application.register("scroll-to-top", ScrollToTopController);
application.register("theme", ThemeController);

// Start Stimulus AFTER all controllers are registered
// This prevents Stimulus from attempting to lazy-load controllers
application.start();
