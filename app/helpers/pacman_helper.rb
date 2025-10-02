module PacmanHelper
  def pacman_asset_manifest
    {
      # Pac-Man sprites
      'pacman/pacman_open_more.png' => asset_path('pacman-game/pacman/pacman_open_more.png'),
      'pacman/pacman_open_less.png' => asset_path('pacman-game/pacman/pacman_open_less.png'),
      'pacman/pacman_closed.png' => asset_path('pacman-game/pacman/pacman_closed.png'),

      # Audio files
      'sounds/pacman_beginning.wav' => asset_path('pacman-game/sounds/pacman_beginning.wav'),
      'sounds/pacman_chomp.wav' => asset_path('pacman-game/sounds/pacman_chomp.wav'),
      'sounds/pacman_death.wav' => asset_path('pacman-game/sounds/pacman_death.wav'),
      'sounds/pacman_eatfruit.wav' => asset_path('pacman-game/sounds/pacman_eatfruit.wav'),
      'sounds/pacman_eatghost.wav' => asset_path('pacman-game/sounds/pacman_eatghost.wav'),
      'sounds/pacman_extrapac.wav' => asset_path('pacman-game/sounds/pacman_extrapac.wav'),
      'sounds/pacman_intermission.wav' => asset_path('pacman-game/sounds/pacman_intermission.wav'),
      
      # Blinky (red ghost) sprites
      'ghosts/blinky-right-1.png' => asset_path('pacman-game/ghosts/blinky-right-1.png'),
      'ghosts/blinky-right-2.png' => asset_path('pacman-game/ghosts/blinky-right-2.png'),
      'ghosts/blinky-down-1.png' => asset_path('pacman-game/ghosts/blinky-down-1.png'),
      'ghosts/blinky-down-2.png' => asset_path('pacman-game/ghosts/blinky-down-2.png'),
      'ghosts/blinky-up-1.png' => asset_path('pacman-game/ghosts/blinky-up-1.png'),
      'ghosts/blinky-up-2.png' => asset_path('pacman-game/ghosts/blinky-up-2.png'),
      
      # Pinky (pink ghost) sprites
      'ghosts/pinky-right-1.png' => asset_path('pacman-game/ghosts/pinky-right-1.png'),
      'ghosts/pinky-right-2.png' => asset_path('pacman-game/ghosts/pinky-right-2.png'),
      'ghosts/pinky-down-1.png' => asset_path('pacman-game/ghosts/pinky-down-1.png'),
      'ghosts/pinky-down-2.png' => asset_path('pacman-game/ghosts/pinky-down-2.png'),
      'ghosts/pinky-up-1.png' => asset_path('pacman-game/ghosts/pinky-up-1.png'),
      'ghosts/pinky-up-2.png' => asset_path('pacman-game/ghosts/pinky-up-2.png'),
      
      # Inky (cyan ghost) sprites
      'ghosts/inky-right-1.png' => asset_path('pacman-game/ghosts/inky-right-1.png'),
      'ghosts/inky-right-2.png' => asset_path('pacman-game/ghosts/inky-right-2.png'),
      'ghosts/inky-down-1.png' => asset_path('pacman-game/ghosts/inky-down-1.png'),
      'ghosts/inky-down-2.png' => asset_path('pacman-game/ghosts/inky-down-2.png'),
      'ghosts/inky-up-1.png' => asset_path('pacman-game/ghosts/inky-up-1.png'),
      'ghosts/inky-up-2.png' => asset_path('pacman-game/ghosts/inky-up-2.png'),
      
      # Clyde (orange ghost) sprites
      'ghosts/clyde-right-1.png' => asset_path('pacman-game/ghosts/clyde-right-1.png'),
      'ghosts/clyde-right-2.png' => asset_path('pacman-game/ghosts/clyde-right-2.png'),
      'ghosts/clyde-down-1.png' => asset_path('pacman-game/ghosts/clyde-down-1.png'),
      'ghosts/clyde-down-2.png' => asset_path('pacman-game/ghosts/clyde-down-2.png'),
      'ghosts/clyde-up-1.png' => asset_path('pacman-game/ghosts/clyde-up-1.png'),
      'ghosts/clyde-up-2.png' => asset_path('pacman-game/ghosts/clyde-up-2.png'),
      
      # Frightened ghost sprites
      'ghosts/frightened-blue-1.png' => asset_path('pacman-game/ghosts/frightened-blue-1.png'),
      'ghosts/frightened-blue-2.png' => asset_path('pacman-game/ghosts/frightened-blue-2.png'),
      'ghosts/frightened-white-1.png' => asset_path('pacman-game/ghosts/frightened-white-1.png'),
      'ghosts/frightened-white-2.png' => asset_path('pacman-game/ghosts/frightened-white-2.png'),
      
      # Ghost eyes sprites
      'ghosts/eyes-right.png' => asset_path('pacman-game/ghosts/eyes-right.png'),
      'ghosts/eyes-down.png' => asset_path('pacman-game/ghosts/eyes-down.png'),
      'ghosts/eyes-up.png' => asset_path('pacman-game/ghosts/eyes-up.png')
    }
  end
end
