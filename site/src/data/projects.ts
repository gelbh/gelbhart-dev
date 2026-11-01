export interface Badge {
  text: string;
  color: string;
  url: string;
}

export interface Project {
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  linkText: string;
  linkUrl: string;
  linkIcon?: string;
  linkTarget?: string;
  linkRel?: string;
  routeName?: string;
  githubUrl?: string;
  badges: Badge[];
  position: number;
  published: boolean;
  featured: boolean;
}

export const projects: Project[] = [
  {
    title: "Jet Lag Map Companion",
    subtitle: "Live Map PWA",
    description:
      "Host or join synced map sessions for Jet Lag Hide + Seek — questions, zones, and pins stay live for the whole group.",
    icon: "jetlag/icon-mark.svg",
    color: "primary",
    linkText: "Learn More",
    linkUrl: "/projects/jetlag",
    routeName: "jetlag",
    githubUrl: "https://github.com/gelbh/jetlag",
    badges: [
      { text: "React", color: "primary", url: "https://react.dev/" },
      { text: "Leaflet", color: "success", url: "https://leafletjs.com/" },
      { text: "Firebase", color: "warning", url: "https://firebase.google.com/" },
      { text: "PWA", color: "info", url: "https://web.dev/progressive-web-apps/" },
    ],
    position: 1,
    published: true,
    featured: true,
  },
  {
    title: "Hevy Tracker",
    subtitle: "Google Apps Script",
    description:
      "Connect your Hevy workout data to Google Sheets™ with secure OAuth integration. Automatically sync your fitness progress.",
    icon: "bx-dumbbell",
    color: "primary",
    linkText: "Learn More",
    linkUrl: "/projects/hevy-tracker",
    routeName: "hevy_tracker",
    githubUrl: "https://github.com/gelbh/hevy-tracker",
    badges: [
      { text: "OAuth 2.0", color: "success", url: "https://oauth.net/2/" },
      { text: "Google Apps", color: "info", url: "https://workspace.google.com/" },
    ],
    position: 2,
    published: true,
    featured: true,
  },
  {
    title: "Video Captioner",
    subtitle: "AI-Powered Tool",
    description:
      "Generate and translate video captions from YouTube videos or local files. Powered by AI transcription with 15+ languages.",
    icon: "bx-video",
    color: "success",
    linkText: "Learn More",
    linkUrl: "/projects/video-captioner",
    routeName: "video_captioner",
    badges: [
      { text: "Whisper AI", color: "primary", url: "https://openai.com/research/whisper" },
      { text: "Python", color: "warning", url: "https://www.python.org/" },
    ],
    position: 3,
    published: true,
    featured: true,
  },
  {
    title: "Nim Quantum ML",
    subtitle: "COMP47950 Course Project",
    description:
      "Compare classical ML, simulated QML (VQC and QSVM), and inference-only IBM Quantum evaluation on Nim classification.",
    icon: "bx-atom",
    color: "secondary",
    linkText: "Learn More",
    linkUrl: "/projects/nim-quantum-ml",
    routeName: "nim_quantum_ml",
    githubUrl: "https://github.com/gelbh/comp47950-qml-project",
    badges: [
      { text: "Python", color: "warning", url: "https://www.python.org/" },
      { text: "Qiskit", color: "primary", url: "https://www.ibm.com/quantum/qiskit" },
      { text: "Streamlit", color: "danger", url: "https://streamlit.io/" },
    ],
    position: 4,
    published: true,
    featured: true,
  },
  {
    title: "NASA Exoplanet Explorer",
    subtitle: "3D Visualization Tool",
    description:
      "Interactive 3D visualization tool for exploring 5000+ confirmed exoplanets from NASA's Exoplanet Archive. Built with React, Three.js, and Express.",
    icon: "bx-planet",
    color: "info",
    linkText: "Learn More",
    linkUrl: "/projects/nasa-exoplanet-explorer",
    routeName: "nasa_exoplanet_explorer",
    githubUrl: "https://github.com/gelbh/nasa-exoplanet-explorer",
    badges: [
      { text: "React", color: "primary", url: "https://react.dev/" },
      { text: "Three.js", color: "warning", url: "https://threejs.org/" },
      { text: "Node.js", color: "success", url: "https://nodejs.org/" },
    ],
    position: 5,
    published: true,
    featured: true,
  },
  {
    title: "Google Maps Converter",
    subtitle: "V1 to V2 Style Converter",
    description:
      "Convert Google Maps JavaScript API V1 style JSON to V2 CBMS format. Free online tool for migrating custom map styles to the latest Google Maps API.",
    icon: "bx-map",
    color: "primary",
    linkText: "Learn More",
    linkUrl: "/projects/google-maps-converter",
    routeName: "google_maps_converter",
    badges: [
      { text: "JavaScript", color: "warning", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript" },
      { text: "Google Maps API", color: "danger", url: "https://developers.google.com/maps" },
      { text: "CodeMirror", color: "info", url: "https://codemirror.net/" },
    ],
    position: 6,
    published: true,
    featured: true,
  },
  {
    title: "Torch Checkpoint Inspector",
    subtitle: "VS Code Extension",
    description:
      "Inspect .pt and .pth PyTorch checkpoints directly in VS Code with a dedicated custom editor. Published on VS Marketplace and Open VSX.",
    icon: "projects/vscode-torch-checkpoint-inspector/pytorch.svg",
    color: "primary",
    linkText: "Learn More",
    linkUrl: "/projects/vscode-torch-checkpoint-inspector",
    routeName: "vscode_torch_checkpoint_inspector",
    githubUrl: "https://github.com/gelbh/vscode-torch-checkpoint-inspector",
    badges: [
      { text: "PyTorch", color: "danger", url: "https://pytorch.org/" },
      { text: "VS Code", color: "primary", url: "https://code.visualstudio.com/" },
      {
        text: "Open VSX",
        color: "info",
        url: "https://open-vsx.org/extension/gelbhart/vscode-torch-checkpoint-inspector",
      },
    ],
    position: 7,
    published: true,
    featured: true,
  },
  {
    title: "Robot Motion Planning",
    subtitle: "MATLAB Application",
    description:
      "Genetic algorithm implementation for robot path optimization with interactive UI, dynamic parameter adjustment, and real-time visualization.",
    icon: "bx-brain",
    color: "warning",
    linkText: "View on GitHub",
    linkUrl: "https://github.com/gelbh/robot-motion-planning",
    linkIcon: "bxl-github",
    linkTarget: "_blank",
    linkRel: "noopener",
    badges: [
      { text: "MATLAB", color: "danger", url: "https://www.mathworks.com/products/matlab.html" },
      { text: "Genetic Algorithm", color: "info", url: "https://en.wikipedia.org/wiki/Genetic_algorithm" },
      { text: "Path Planning", color: "success", url: "https://en.wikipedia.org/wiki/Motion_planning" },
    ],
    position: 8,
    published: true,
    featured: true,
  },
];

const byPosition = (a: Project, b: Project) => a.position - b.position;

export const featuredProjects = projects.filter((p) => p.featured && p.published).sort(byPosition);

export const projectsWithPages = projects.filter((p) => p.published && p.routeName).sort(byPosition);

// Icons without an image extension are Boxicons class names.
export const isImageIcon = (icon: string) => /\.(png|svg|webp|jpe?g)$/i.test(icon);
export const iconSrc = (icon: string) => (icon.startsWith("/") ? icon : `/assets/${icon}`);
