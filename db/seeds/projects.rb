# Seed data for Projects
# This file seeds the projects table with initial project data

project = Project.find_or_initialize_by(title: 'Hevy Tracker')
project.assign_attributes(
  subtitle: 'Google Apps Script',
  description: 'Connect your Hevy workout data to Google Sheets™ with secure OAuth integration. Automatically sync your fitness progress.',
  icon: 'bx-dumbbell',
  color: 'primary',
  link_text: 'Learn More',
  link_url: '/projects/hevy-tracker',
  route_name: 'hevy_tracker',
  github_url: 'https://github.com/gelbh/hevy-tracker',
  badges: [
    { text: 'OAuth 2.0', color: 'success', url: 'https://oauth.net/2/' },
    { text: 'Google Apps', color: 'info', url: 'https://workspace.google.com/' }
  ],
  position: 1,
  published: true,
  featured: true
)
project.save!

project = Project.find_or_initialize_by(title: 'Video Captioner')
project.assign_attributes(
  subtitle: 'AI-Powered Tool',
  description: 'Generate and translate video captions from YouTube videos or local files. Powered by AI transcription with 15+ languages.',
  icon: 'bx-video',
  color: 'success',
  link_text: 'Learn More',
  link_url: '/projects/video-captioner',
  route_name: 'video_captioner',
  badges: [
    { text: 'Whisper AI', color: 'primary', url: 'https://openai.com/research/whisper' },
    { text: 'Python', color: 'warning', url: 'https://www.python.org/' }
  ],
  position: 2,
  published: true,
  featured: true
)
project.save!

project = Project.find_or_initialize_by(title: 'NASA Exoplanet Explorer')
project.assign_attributes(
  subtitle: '3D Visualization Tool',
  description: 'Interactive 3D visualization tool for exploring 5000+ confirmed exoplanets from NASA\'s Exoplanet Archive. Built with React, Three.js, and Express.',
  icon: 'bx-planet',
  color: 'info',
  link_text: 'Learn More',
  link_url: '/projects/nasa-exoplanet-explorer',
  route_name: 'nasa_exoplanet_explorer',
  github_url: 'https://github.com/gelbh/nasa-exoplanet-explorer',
  badges: [
    { text: 'React', color: 'primary', url: 'https://react.dev/' },
    { text: 'Three.js', color: 'warning', url: 'https://threejs.org/' },
    { text: 'Node.js', color: 'success', url: 'https://nodejs.org/' }
  ],
  position: 3,
  published: true,
  featured: true
)
project.save!

project = Project.find_or_initialize_by(title: 'Google Maps Converter')
project.assign_attributes(
  subtitle: 'V1 to V2 Style Converter',
  description: 'Convert Google Maps JavaScript API V1 style JSON to V2 CBMS format. Free online tool for migrating custom map styles to the latest Google Maps API.',
  icon: 'bx-map',
  color: 'primary',
  link_text: 'Learn More',
  link_url: '/projects/google-maps-converter',
  route_name: 'google_maps_converter',
  badges: [
    { text: 'JavaScript', color: 'warning', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript' },
    { text: 'Google Maps API', color: 'danger', url: 'https://developers.google.com/maps' },
    { text: 'CodeMirror', color: 'info', url: 'https://codemirror.net/' }
  ],
  position: 4,
  published: true,
  featured: true
)
project.save!

project = Project.find_or_initialize_by(title: 'Robot Motion Planning')
project.assign_attributes(
  subtitle: 'MATLAB Application',
  description: 'Genetic algorithm implementation for robot path optimization with interactive UI, dynamic parameter adjustment, and real-time visualization.',
  icon: 'bx-brain',
  color: 'warning',
  link_text: 'View on GitHub',
  link_url: 'https://github.com/gelbh/robot-motion-planning',
  link_icon: 'bxl-github',
  link_target: '_blank',
  link_rel: 'noopener',
  badges: [
    { text: 'MATLAB', color: 'danger', url: 'https://www.mathworks.com/products/matlab.html' },
    { text: 'Genetic Algorithm', color: 'info', url: 'https://en.wikipedia.org/wiki/Genetic_algorithm' },
    { text: 'Path Planning', color: 'success', url: 'https://en.wikipedia.org/wiki/Motion_planning' }
  ],
  position: 5,
  published: true,
  featured: true
)
project.save!
