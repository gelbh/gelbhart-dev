# Seed data for Projects
# This file seeds the projects table with initial project data

Project.find_or_create_by(title: 'Hevy Tracker') do |project|
  project.subtitle = 'Google Apps Script'
  project.description = 'Connect your Hevy workout data to Google Sheets™ with secure OAuth integration. Automatically sync your fitness progress.'
  project.icon = 'bx-dumbbell'
  project.color = 'primary'
  project.link_text = 'Learn More'
  project.link_url = '/hevy-tracker'
  project.route_name = 'hevy_tracker'
  project.badges = [
    { text: 'OAuth 2.0', color: 'success', url: 'https://oauth.net/2/' },
    { text: 'Google Apps', color: 'info', url: 'https://workspace.google.com/' }
  ]
  project.position = 1
  project.published = true
  project.featured = true
end

Project.find_or_create_by(title: 'Video Captioner') do |project|
  project.subtitle = 'AI-Powered Tool'
  project.description = 'Generate and translate video captions from YouTube videos or local files. Powered by AI transcription with 15+ languages.'
  project.icon = 'bx-video'
  project.color = 'success'
  project.link_text = 'Learn More'
  project.link_url = '/video-captioner'
  project.route_name = 'video_captioner'
  project.badges = [
    { text: 'Whisper AI', color: 'primary', url: 'https://openai.com/research/whisper' },
    { text: 'Python', color: 'warning', url: 'https://www.python.org/' }
  ]
  project.position = 2
  project.published = true
  project.featured = true
end

Project.find_or_create_by(title: 'NASA Exoplanet Explorer') do |project|
  project.subtitle = '3D Visualization Tool'
  project.description = 'Interactive 3D visualization tool for exploring 5000+ confirmed exoplanets from NASA\'s Exoplanet Archive. Built with React, Three.js, and Express.'
  project.icon = 'bx-planet'
  project.color = 'info'
  project.link_text = 'Learn More'
  project.link_url = '/nasa-exoplanet-explorer'
  project.route_name = 'nasa_exoplanet_explorer'
  project.github_url = 'https://github.com/gelbh/nasa-exoplanet-explorer'
  project.badges = [
    { text: 'React', color: 'primary', url: 'https://react.dev/' },
    { text: 'Three.js', color: 'warning', url: 'https://threejs.org/' },
    { text: 'Node.js', color: 'success', url: 'https://nodejs.org/' }
  ]
  project.position = 3
  project.published = true
  project.featured = true
end

Project.find_or_create_by(title: 'Robot Motion Planning') do |project|
  project.subtitle = 'MATLAB Application'
  project.description = 'Genetic algorithm implementation for robot path optimization with interactive UI, dynamic parameter adjustment, and real-time visualization.'
  project.icon = 'bx-brain'
  project.color = 'warning'
  project.link_text = 'View on GitHub'
  project.link_url = 'https://github.com/gelbh/robot-motion-planning'
  project.link_icon = 'bxl-github'
  project.link_target = '_blank'
  project.link_rel = 'noopener'
  project.badges = [
    { text: 'MATLAB', color: 'danger', url: 'https://www.mathworks.com/products/matlab.html' },
    { text: 'Genetic Algorithm', color: 'info', url: 'https://en.wikipedia.org/wiki/Genetic_algorithm' },
    { text: 'Path Planning', color: 'success', url: 'https://en.wikipedia.org/wiki/Motion_planning' }
  ]
  project.position = 4
  project.published = true
  project.featured = true
end
