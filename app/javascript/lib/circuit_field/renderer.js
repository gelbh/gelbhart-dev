/**
 * Lightweight WebGL2 circuit-field renderer for hero backgrounds.
 * Falls back to a static Canvas2D grid when WebGL is unavailable.
 */
const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uTime;
uniform float uIntensity;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float gridLine(vec2 uv, float scale, float thickness) {
  vec2 grid = abs(fract(uv * scale - 0.5) - 0.5);
  vec2 derivative = fwidth(uv * scale);
  vec2 line = grid / max(derivative, vec2(0.0001));
  float lineMask = 1.0 - min(min(line.x, line.y), 1.0);
  return smoothstep(0.0, thickness, lineMask);
}

float circuitPulse(vec2 uv, float scale, float speed) {
  float lane = floor(uv.x * scale) + floor(uv.y * scale * 0.5);
  float pulse = sin(uTime * speed + lane * 1.7);
  return smoothstep(0.85, 1.0, pulse);
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 st = uv * aspect;

  float major = gridLine(st, 10.0, 0.55);
  float minor = gridLine(st, 40.0, 0.35) * 0.45;
  float pulse = circuitPulse(st, 6.0, 0.6);
  float traces = (major + minor) * (0.55 + pulse * 0.45);

  float node = step(0.96, hash(floor(st * 40.0)));
  traces += node * major * 0.35;

  vec2 mouse = uMouse * aspect;
  float glow = exp(-distance(st, mouse) * 5.5) * 0.65;

  vec3 indigo = vec3(0.388, 0.400, 0.945);
  vec3 violet = vec3(0.482, 0.227, 0.929);
  vec3 color = mix(indigo, violet, glow) * (traces + glow * 0.4);

  float alpha = clamp((traces * 0.22 + glow * 0.28) * uIntensity, 0.0, 0.55);
  fragColor = vec4(color, alpha);
}
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(message || "Shader compile failed");
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(message || "Program link failed");
  }
  return program;
}

export class CircuitFieldRenderer {
  constructor(canvas, { intensity = 1 } = {}) {
    this.canvas = canvas;
    this.intensity = intensity;
    this.gl = null;
    this.program = null;
    this.attribs = {};
    this.uniforms = {};
    this.mouse = { x: 0.5, y: 0.5 };
    this.mode = "none";
    this._2dCtx = null;
  }

  init() {
    const gl = this.canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });

    if (gl) {
      try {
        this._initWebGL(gl);
        this.mode = "webgl";
        return true;
      } catch {
        // Fall through to Canvas2D
      }
    }

    this._initCanvas2D();
    this.mode = this._2dCtx ? "canvas2d" : "none";
    return this.mode !== "none";
  }

  _initWebGL(gl) {
    this.gl = gl;

    this.program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    this.attribs.position = gl.getAttribLocation(this.program, "aPosition");
    this.uniforms.resolution = gl.getUniformLocation(this.program, "uResolution");
    this.uniforms.mouse = gl.getUniformLocation(this.program, "uMouse");
    this.uniforms.time = gl.getUniformLocation(this.program, "uTime");
    this.uniforms.intensity = gl.getUniformLocation(this.program, "uIntensity");

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this._buffer = buffer;
  }

  _initCanvas2D() {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    this._2dCtx = ctx;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { clientWidth, clientHeight } = this.canvas;
    if (clientWidth === 0 || clientHeight === 0) return;

    const width = Math.floor(clientWidth * dpr);
    const height = Math.floor(clientHeight * dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    if (this.mode === "webgl" && this.gl) {
      this.gl.viewport(0, 0, width, height);
    }
  }

  setMouse(x, y) {
    this.mouse.x = Math.min(1, Math.max(0, x));
    this.mouse.y = Math.min(1, Math.max(0, 1 - y));
  }

  render(time = 0) {
    if (this.mode === "webgl") {
      this._renderWebGL(time);
    } else if (this.mode === "canvas2d") {
      this._renderCanvas2D(time);
    }
  }

  _renderWebGL(time) {
    const { gl, program } = this;
    if (!gl || !program) return;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
    gl.enableVertexAttribArray(this.attribs.position);
    gl.vertexAttribPointer(this.attribs.position, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.uniforms.mouse, this.mouse.x, this.mouse.y);
    gl.uniform1f(this.uniforms.time, time * 0.001);
    gl.uniform1f(this.uniforms.intensity, this.intensity);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  _renderCanvas2D(time) {
    const ctx = this._2dCtx;
    if (!ctx) return;

    const { width, height } = this.canvas;
    ctx.clearRect(0, 0, width, height);

    const spacing = width / 14;
    ctx.strokeStyle = `rgba(99, 102, 241, ${0.12 * this.intensity})`;
    ctx.lineWidth = 1;

    const offset = (time * 0.02) % spacing;
    ctx.beginPath();
    for (let x = offset; x < width; x += spacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = offset; y < height; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    const mx = this.mouse.x * width;
    const my = (1 - this.mouse.y) * height;
    const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, width * 0.25);
    gradient.addColorStop(0, `rgba(99, 102, 241, ${0.25 * this.intensity})`);
    gradient.addColorStop(1, "rgba(99, 102, 241, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  destroy() {
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program);
    }
    this.gl = null;
    this.program = null;
    this._2dCtx = null;
    this.mode = "none";
  }
}
