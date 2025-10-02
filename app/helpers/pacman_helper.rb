module PacmanHelper
  def pacman_asset_manifest
    {
      # Pac-Man sprites - keys match JavaScript lookups with 'pacman-game/' prefix
      'pacman-game/pacman/pacman_open_more.png' => asset_path('pacman-game/pacman/pacman_open_more.png'),
      'pacman-game/pacman/pacman_open_less.png' => asset_path('pacman-game/pacman/pacman_open_less.png'),
      'pacman-game/pacman/pacman_closed.png' => asset_path('pacman-game/pacman/pacman_closed.png'),

      # Audio files
      'pacman-game/sounds/pacman_beginning.wav' => asset_path('pacman-game/sounds/pacman_beginning.wav'),
      'pacman-game/sounds/pacman_chomp.wav' => asset_path('pacman-game/sounds/pacman_chomp.wav'),
      'pacman-game/sounds/pacman_death.wav' => asset_path('pacman-game/sounds/pacman_death.wav'),
      'pacman-game/sounds/pacman_eatfruit.wav' => asset_path('pacman-game/sounds/pacman_eatfruit.wav'),
      'pacman-game/sounds/pacman_eatghost.wav' => asset_path('pacman-game/sounds/pacman_eatghost.wav'),
      'pacman-game/sounds/pacman_extrapac.wav' => asset_path('pacman-game/sounds/pacman_extrapac.wav'),
      'pacman-game/sounds/pacman_intermission.wav' => asset_path('pacman-game/sounds/pacman_intermission.wav'),

      # Blinky (red ghost) sprites
      'pacman-game/ghosts/blinky-right-1.png' => asset_path('pacman-game/ghosts/blinky-right-1.png'),
      'pacman-game/ghosts/blinky-right-2.png' => asset_path('pacman-game/ghosts/blinky-right-2.png'),
      'pacman-game/ghosts/blinky-down-1.png' => asset_path('pacman-game/ghosts/blinky-down-1.png'),
      'pacman-game/ghosts/blinky-down-2.png' => asset_path('pacman-game/ghosts/blinky-down-2.png'),
      'pacman-game/ghosts/blinky-up-1.png' => asset_path('pacman-game/ghosts/blinky-up-1.png'),
      'pacman-game/ghosts/blinky-up-2.png' => asset_path('pacman-game/ghosts/blinky-up-2.png'),

      # Pinky (pink ghost) sprites
      'pacman-game/ghosts/pinky-right-1.png' => asset_path('pacman-game/ghosts/pinky-right-1.png'),
      'pacman-game/ghosts/pinky-right-2.png' => asset_path('pacman-game/ghosts/pinky-right-2.png'),
      'pacman-game/ghosts/pinky-down-1.png' => asset_path('pacman-game/ghosts/pinky-down-1.png'),
      'pacman-game/ghosts/pinky-down-2.png' => asset_path('pacman-game/ghosts/pinky-down-2.png'),
      'pacman-game/ghosts/pinky-up-1.png' => asset_path('pacman-game/ghosts/pinky-up-1.png'),
      'pacman-game/ghosts/pinky-up-2.png' => asset_path('pacman-game/ghosts/pinky-up-2.png'),

      # Inky (cyan ghost) sprites
      'pacman-game/ghosts/inky-right-1.png' => asset_path('pacman-game/ghosts/inky-right-1.png'),
      'pacman-game/ghosts/inky-right-2.png' => asset_path('pacman-game/ghosts/inky-right-2.png'),
      'pacman-game/ghosts/inky-down-1.png' => asset_path('pacman-game/ghosts/inky-down-1.png'),
      'pacman-game/ghosts/inky-down-2.png' => asset_path('pacman-game/ghosts/inky-down-2.png'),
      'pacman-game/ghosts/inky-up-1.png' => asset_path('pacman-game/ghosts/inky-up-1.png'),
      'pacman-game/ghosts/inky-up-2.png' => asset_path('pacman-game/ghosts/inky-up-2.png'),

      # Clyde (orange ghost) sprites
      'pacman-game/ghosts/clyde-right-1.png' => asset_path('pacman-game/ghosts/clyde-right-1.png'),
      'pacman-game/ghosts/clyde-right-2.png' => asset_path('pacman-game/ghosts/clyde-right-2.png'),
      'pacman-game/ghosts/clyde-down-1.png' => asset_path('pacman-game/ghosts/clyde-down-1.png'),
      'pacman-game/ghosts/clyde-down-2.png' => asset_path('pacman-game/ghosts/clyde-down-2.png'),
      'pacman-game/ghosts/clyde-up-1.png' => asset_path('pacman-game/ghosts/clyde-up-1.png'),
      'pacman-game/ghosts/clyde-up-2.png' => asset_path('pacman-game/ghosts/clyde-up-2.png'),

      # Frightened ghost sprites
      'pacman-game/ghosts/frightened-blue-1.png' => asset_path('pacman-game/ghosts/frightened-blue-1.png'),
      'pacman-game/ghosts/frightened-blue-2.png' => asset_path('pacman-game/ghosts/frightened-blue-2.png'),
      'pacman-game/ghosts/frightened-white-1.png' => asset_path('pacman-game/ghosts/frightened-white-1.png'),
      'pacman-game/ghosts/frightened-white-2.png' => asset_path('pacman-game/ghosts/frightened-white-2.png'),

      # Ghost eyes sprites
      'pacman-game/ghosts/eyes-right.png' => asset_path('pacman-game/ghosts/eyes-right.png'),
      'pacman-game/ghosts/eyes-down.png' => asset_path('pacman-game/ghosts/eyes-down.png'),
      'pacman-game/ghosts/eyes-up.png' => asset_path('pacman-game/ghosts/eyes-up.png')
    }
  end
end
