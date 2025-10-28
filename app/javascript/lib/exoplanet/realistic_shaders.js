/**
 * realistic_shaders.js
 * Physics-based shaders for realistic exoplanet rendering
 * Implements atmospheric scattering, thermal emission, and proper illumination
 */

/**
 * Atmospheric Scattering Shader
 * Based on simplified Rayleigh + Mie scattering
 * Creates realistic atmospheric glow with proper color based on stellar illumination
 */
export const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const atmosphereFragmentShader = `
  uniform vec3 starPosition;
  uniform vec3 atmosphereColor;
  uniform float atmosphereDensity;
  uniform float planetRadius;
  uniform float atmosphereRadius;
  uniform vec3 cameraPosition;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  
  void main() {
    // Calculate view direction
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    
    // Calculate light direction (from star)
    vec3 lightDirection = normalize(starPosition - vWorldPosition);
    
    // Fresnel-like atmospheric effect (stronger at grazing angles)
    float rim = 1.0 - max(0.0, dot(viewDirection, vNormal));
    rim = pow(rim, 2.0);
    
    // Day-side illumination
    float dayFactor = max(0.0, dot(vNormal, lightDirection));
    
    // Combine effects
    float intensity = rim * (0.5 + 0.5 * dayFactor) * atmosphereDensity;
    
    // Apply atmospheric color (influenced by star color)
    vec3 finalColor = atmosphereColor * intensity;
    
    gl_FragColor = vec4(finalColor, intensity);
  }
`;

/**
 * Planet Surface Shader with Day-Night Terminator
 * Implements proper illumination with soft terminator
 */
export const planetSurfaceVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const planetSurfaceFragmentShader = `
  uniform sampler2D surfaceTexture;
  uniform vec3 starPosition;
  uniform vec3 starColor;
  uniform float starIntensity;
  uniform float planetRadius;
  uniform bool hasClouds;
  uniform sampler2D cloudTexture;
  uniform float cloudOpacity;
  uniform vec3 emissiveColor;
  uniform float emissiveIntensity;
  uniform float ambientLight;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  
  void main() {
    // Sample base surface texture
    vec4 surfaceColor = texture2D(surfaceTexture, vUv);
    
    // Calculate light direction from star
    vec3 lightDirection = normalize(starPosition - vWorldPosition);
    
    // Lambertian diffuse lighting
    float diffuse = max(0.0, dot(vNormal, lightDirection));
    
    // Soft terminator (atmospheric scattering softens the day-night boundary)
    float terminator = smoothstep(-0.1, 0.1, diffuse);
    
    // Apply stellar illumination
    vec3 litColor = surfaceColor.rgb * starColor * starIntensity * terminator;
    
    // Add ambient lighting (from galaxy, other sources)
    vec3 ambientColor = surfaceColor.rgb * ambientLight;
    
    // Add thermal emission for hot planets
    vec3 emissive = emissiveColor * emissiveIntensity;
    
    // Combine all lighting components
    vec3 finalColor = litColor + ambientColor + emissive;
    
    // Add clouds if present
    if (hasClouds) {
      vec4 clouds = texture2D(cloudTexture, vUv);
      finalColor = mix(finalColor, clouds.rgb * starColor * starIntensity, clouds.a * cloudOpacity * terminator);
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Thermal Emission Shader for Hot Planets
 * Implements blackbody radiation visualization
 */
export const thermalEmissionVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const thermalEmissionFragmentShader = `
  uniform float temperature;
  uniform float intensity;
  varying vec2 vUv;
  varying vec3 vNormal;
  
  // Convert temperature to blackbody color
  vec3 temperatureToColor(float temp) {
    // Simplified blackbody radiation color
    // Based on temperature in Kelvin
    
    if (temp < 1000.0) {
      // Very cool - deep red
      return vec3(0.5, 0.0, 0.0);
    } else if (temp < 2000.0) {
      // Cool - red-orange
      float t = (temp - 1000.0) / 1000.0;
      return mix(vec3(0.8, 0.1, 0.0), vec3(1.0, 0.3, 0.0), t);
    } else if (temp < 3000.0) {
      // Warm - orange
      float t = (temp - 2000.0) / 1000.0;
      return mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 0.5, 0.1), t);
    } else if (temp < 4000.0) {
      // Hot - yellow-orange
      float t = (temp - 3000.0) / 1000.0;
      return mix(vec3(1.0, 0.5, 0.1), vec3(1.0, 0.7, 0.3), t);
    } else if (temp < 6000.0) {
      // Very hot - yellow-white
      float t = (temp - 4000.0) / 2000.0;
      return mix(vec3(1.0, 0.7, 0.3), vec3(1.0, 0.9, 0.8), t);
    } else if (temp < 10000.0) {
      // Extremely hot - white
      float t = (temp - 6000.0) / 4000.0;
      return mix(vec3(1.0, 0.9, 0.8), vec3(1.0, 1.0, 1.0), t);
    } else {
      // Ultra-hot - blue-white
      float t = min(1.0, (temp - 10000.0) / 10000.0);
      return mix(vec3(1.0, 1.0, 1.0), vec3(0.7, 0.8, 1.0), t);
    }
  }
  
  void main() {
    vec3 emissionColor = temperatureToColor(temperature);
    gl_FragColor = vec4(emissionColor * intensity, intensity);
  }
`;

/**
 * Tidal Locking Shader
 * Creates distinct day and night hemispheres for tidally locked planets
 */
export const tidalLockVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const tidalLockFragmentShader = `
  uniform sampler2D surfaceTexture;
  uniform vec3 starPosition;
  uniform vec3 starColor;
  uniform float starIntensity;
  uniform vec3 daySideColor;
  uniform vec3 nightSideColor;
  uniform float temperature;
  uniform float nightSideEmission;
  uniform bool isLavaWorld;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  
  void main() {
    vec4 surfaceColor = texture2D(surfaceTexture, vUv);
    
    // Calculate light direction from star
    vec3 lightDirection = normalize(starPosition - vWorldPosition);
    
    // Determine which hemisphere we're on
    float hemisphereBlend = dot(vNormal, lightDirection);
    
    // Smooth transition across terminator
    float dayFactor = smoothstep(-0.3, 0.3, hemisphereBlend);
    
    // Day side: fully illuminated by star
    vec3 daySide = surfaceColor.rgb * daySideColor * starColor * starIntensity;
    
    // Night side: thermal emission or darkness
    vec3 nightSide;
    if (isLavaWorld) {
      // Lava worlds glow on night side
      float glowIntensity = nightSideEmission;
      nightSide = nightSideColor * glowIntensity;
    } else if (temperature > 800.0) {
      // Hot planets have thermal emission
      nightSide = surfaceColor.rgb * nightSideColor * nightSideEmission * 0.3;
    } else {
      // Cool planets are dark on night side
      nightSide = surfaceColor.rgb * 0.05; // Very faint ambient
    }
    
    // Blend day and night sides
    vec3 finalColor = mix(nightSide, daySide, dayFactor);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Enhanced Cloud Shader
 * Realistic cloud rendering with proper illumination and transparency
 */
export const cloudVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const cloudFragmentShader = `
  uniform sampler2D cloudTexture;
  uniform vec3 starPosition;
  uniform vec3 starColor;
  uniform float starIntensity;
  uniform float cloudOpacity;
  uniform float cloudHeight;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    vec4 cloud = texture2D(cloudTexture, vUv);
    
    // Calculate illumination
    vec3 lightDirection = normalize(starPosition - vWorldPosition);
    float diffuse = max(0.0, dot(vNormal, lightDirection));
    
    // Clouds are brighter and scatter light
    float cloudBrightness = 0.3 + 0.7 * diffuse;
    
    // Apply star color
    vec3 cloudColor = vec3(1.0, 1.0, 1.0) * starColor * starIntensity * cloudBrightness;
    
    // Use cloud texture alpha for density
    float alpha = cloud.a * cloudOpacity;
    
    gl_FragColor = vec4(cloudColor, alpha);
  }
`;

/**
 * Gas Giant Band Shader
 * Creates realistic atmospheric bands with proper lighting
 */
export const gasGiantVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const gasGiantFragmentShader = `
  uniform sampler2D bandTexture;
  uniform vec3 starPosition;
  uniform vec3 starColor;
  uniform float starIntensity;
  uniform float rotationOffset;
  uniform vec3 baseColor;
  uniform float turbulence;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  // Simplex noise for atmospheric turbulence
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
  
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  void main() {
    // Sample band texture
    vec2 uv = vUv;
    uv.x += rotationOffset; // Rotate with planet
    vec4 bands = texture2D(bandTexture, uv);
    
    // Add turbulence for storm features
    float noise = snoise(vUv * 10.0 + rotationOffset * 50.0) * turbulence;
    vec3 bandColor = bands.rgb + baseColor * noise;
    
    // Calculate stellar illumination
    vec3 lightDirection = normalize(starPosition - vWorldPosition);
    float diffuse = max(0.0, dot(vNormal, lightDirection));
    
    // Gas giants have thick atmospheres that scatter light differently
    // More gradual terminator
    float illumination = smoothstep(-0.2, 1.0, diffuse);
    
    // Apply lighting
    vec3 finalColor = bandColor * starColor * starIntensity * (0.2 + 0.8 * illumination);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Ring System Shader with proper lighting and shadows
 */
export const ringVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ringFragmentShader = `
  uniform sampler2D ringTexture;
  uniform vec3 starPosition;
  uniform vec3 starColor;
  uniform float starIntensity;
  uniform vec3 planetPosition;
  uniform float planetRadius;
  uniform float innerRadius;
  uniform float outerRadius;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  
  void main() {
    // Sample ring texture (radial alpha gradient)
    vec4 ringColor = texture2D(ringTexture, vUv);
    
    // Calculate distance from planet center
    float dist = length(vPosition);
    
    // Fade rings based on distance
    float ringAlpha = smoothstep(innerRadius, innerRadius + 0.1, dist) * 
                      smoothstep(outerRadius, outerRadius - 0.1, dist);
    
    // Calculate illumination from star
    vec3 lightDirection = normalize(starPosition - vWorldPosition);
    
    // Rings are thin, so we use a simpler lighting model
    float illumination = max(0.3, dot(normalize(vPosition), lightDirection));
    
    // Check if in planet shadow
    vec3 toPlanet = planetPosition - vWorldPosition;
    float planetDist = length(toPlanet);
    vec3 toStar = normalize(starPosition - vWorldPosition);
    
    // Simple shadow check
    float shadow = 1.0;
    if (dot(normalize(toPlanet), toStar) > 0.9 && planetDist < planetRadius * 2.0) {
      shadow = 0.3;
    }
    
    // Apply lighting
    vec3 finalColor = ringColor.rgb * starColor * starIntensity * illumination * shadow;
    float finalAlpha = ringColor.a * ringAlpha;
    
    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;
