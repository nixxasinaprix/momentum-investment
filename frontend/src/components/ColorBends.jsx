import { useEffect, useRef, useState } from "react";

const MAX_COLORS = 8;

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mouse;
uniform float u_rotation;
uniform float u_scale;
uniform float u_speed;
uniform float u_frequency;
uniform float u_warp;
uniform float u_mouseInfluence;
uniform float u_noise;
uniform float u_parallax;
uniform float u_iterations;
uniform float u_intensity;
uniform float u_bandWidth;
uniform float u_transparent;
uniform vec3  u_colors[${MAX_COLORS}];
uniform float u_colorCount;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m * m; m = m * m;
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

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 6; i++) {
    float on = step(float(i) + 0.5, u_iterations);
    v += on * amp * snoise(p);
    p = rot * p * 2.0 + 11.37;
    amp *= 0.5;
  }
  return v;
}

float hash12(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  float aspect = u_res.x / u_res.y;

  vec2 p = uv - 0.5;
  p.x *= aspect;
  p -= (u_mouse - 0.5) * u_parallax * 0.18;

  float ang = radians(u_rotation);
  mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  p = (R * p) / max(u_scale, 0.0001);

  float t = u_time * u_speed;

  vec2 mp = uv - u_mouse;
  mp.x *= aspect;
  float mForce = exp(-length(mp) * 3.2) * u_mouseInfluence;

  vec2 q = vec2(
    fbm(p * u_frequency + vec2(0.0, t * 0.35)),
    fbm(p * u_frequency + vec2(5.2, 1.3) - t * 0.28)
  );
  vec2 r = vec2(
    fbm(p * u_frequency + u_warp * q + vec2(1.7, 9.2) + 0.13 * t + mForce * 0.5),
    fbm(p * u_frequency + u_warp * q + vec2(8.3, 2.8) - 0.10 * t)
  );
  float f = fbm(p * u_frequency + u_warp * r + vec2(mForce * 0.8));

  float v = clamp(f * 0.5 + 0.5, 0.0, 1.0);
  v = pow(v, 1.15);

  float bands = v * u_bandWidth;
  float bandLum = smoothstep(0.15, 0.85, fract(bands));

  float ct = v * max(u_colorCount - 1.0, 1.0);
  vec3 col = u_colors[0];
  col = mix(col, u_colors[1], clamp(ct - 0.0, 0.0, 1.0));
  col = mix(col, u_colors[2], clamp(ct - 1.0, 0.0, 1.0));
  col = mix(col, u_colors[3], clamp(ct - 2.0, 0.0, 1.0));
  col = mix(col, u_colors[4], clamp(ct - 3.0, 0.0, 1.0));
  col = mix(col, u_colors[5], clamp(ct - 4.0, 0.0, 1.0));
  col = mix(col, u_colors[6], clamp(ct - 5.0, 0.0, 1.0));
  col = mix(col, u_colors[7], clamp(ct - 6.0, 0.0, 1.0));

  col *= 0.88 + 0.24 * bandLum;
  col += mForce * 0.20;
  col *= u_intensity;
  col += (hash12(gl_FragCoord.xy + fract(t) * 61.7) - 0.5) * u_noise;

  float alpha = u_transparent > 0.5 ? smoothstep(0.02, 0.70, v) : 1.0;
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

export default function ColorBends({
  colors = ["#4F46E5", "#7C3AED", "#06B6D4", "#3B82F6"],
  rotation = 90,
  speed = 0.18,
  scale = 1.15,
  frequency = 1,
  warpStrength = 1.1,
  mouseInfluence = 0.8,
  noise = 0.08,
  parallax = 0.45,
  iterations = 2,
  intensity = 1.4,
  bandWidth = 7,
  transparent = true,
  className = "",
}) {
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    });
    if (!gl) return setFailed(true);

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return setFailed(true);

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return setFailed(true);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = (n) => gl.getUniformLocation(prog, n);
    const u = {
      res: U("u_res"), time: U("u_time"), mouse: U("u_mouse"),
      rotation: U("u_rotation"), scale: U("u_scale"), speed: U("u_speed"),
      frequency: U("u_frequency"), warp: U("u_warp"), mi: U("u_mouseInfluence"),
      noise: U("u_noise"), parallax: U("u_parallax"), iterations: U("u_iterations"),
      intensity: U("u_intensity"), bandWidth: U("u_bandWidth"),
      transparent: U("u_transparent"), colors: U("u_colors[0]"),
      colorCount: U("u_colorCount"),
    };

    const hexToRgb = (hex) => {
      const h = hex.replace("#", "");
      const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
      const n = parseInt(full, 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    };

    const list = colors.slice(0, MAX_COLORS);
    const flat = [];
    for (let i = 0; i < MAX_COLORS; i++)
      flat.push(...hexToRgb(list[Math.min(i, list.length - 1)]));

    gl.uniform3fv(u.colors, flat);
    gl.uniform1f(u.colorCount, list.length);
    gl.uniform1f(u.rotation, rotation);
    gl.uniform1f(u.scale, scale);
    gl.uniform1f(u.speed, speed);
    gl.uniform1f(u.frequency, frequency);
    gl.uniform1f(u.warp, warpStrength);
    gl.uniform1f(u.mi, mouseInfluence);
    gl.uniform1f(u.noise, noise);
    gl.uniform1f(u.parallax, parallax);
    gl.uniform1f(u.iterations, iterations);
    gl.uniform1f(u.intensity, intensity);
    gl.uniform1f(u.bandWidth, bandWidth);
    gl.uniform1f(u.transparent, transparent ? 1 : 0);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(u.res, w, h);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gl.uniform1f(u.speed, reducedMotion ? 0 : speed);

    const target = { x: 0.5, y: 0.5 };
    const mouse = { x: 0.5, y: 0.5 };
    const onMove = (e) => {
      const t = e.touches ? e.touches[0] : e;
      if (!t) return;
      target.x = t.clientX / window.innerWidth;
      target.y = 1 - t.clientY / window.innerHeight;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });

    gl.clearColor(0, 0, 0, 0);

    let raf;
    const start = performance.now();
    const loop = (now) => {
      mouse.x += (target.x - mouse.x) * 0.055;
      mouse.y += (target.y - mouse.y) * 0.055;
      gl.uniform1f(u.time, (now - start) / 1000);
      gl.uniform2f(u.mouse, mouse.x, mouse.y);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [
    colors.join("|"), rotation, speed, scale, frequency, warpStrength,
    mouseInfluence, noise, parallax, iterations, intensity, bandWidth, transparent,
  ]);

  if (failed) {
    return (
      <div
        aria-hidden="true"
        className={className}
        style={{ background: `linear-gradient(135deg, ${colors.join(", ")})` }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ transform: "translateZ(0)", willChange: "transform" }}
    />
  );
}