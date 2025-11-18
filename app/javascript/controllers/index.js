import { application } from "controllers/application";

// Explicitly import and register all controllers BEFORE starting Stimulus
// This ensures all controllers are registered before Stimulus scans the DOM
// and prevents lazy-loading attempts that cause 404 errors

import AnalyticsStatsController from "controllers/analytics_stats_controller";
import CodeTyperController from "controllers/code_typer_controller";
import CounterController from "controllers/counter_controller";
import PacmanGameController from "controllers/pacman_game_controller";
import PacmanPreviewController from "controllers/pacman-preview_controller";
import ScrollAnimationController from "controllers/scroll_animation_controller";
import ScrollToTopController from "controllers/scroll_to_top_controller";
import ThemeController from "controllers/theme_controller";

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
