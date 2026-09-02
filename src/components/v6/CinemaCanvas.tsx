"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type CinemaCanvasHandle = {
  setScroll: (value: number) => void;
  setAct: (value: number) => void;
};

const vertexShaderSource = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const fragmentShaderSource = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform float uTime;
uniform float uScroll;
uniform float uAct;
uniform vec2 uPointer;
uniform vec2 uRes;
uniform float uDpr;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);
  for (int octave = 0; octave < 5; octave++) {
    value += amplitude * noise(p);
    p = rotation * p * 2.03 + 13.7;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uRes.x / max(uRes.y, 1.0), 1.0);
  vec2 p = (uv - 0.5) * aspect;
  float time = uTime * 0.035;
  vec2 pointer = (uPointer - 0.5) * 0.08;
  vec2 warp = vec2(fbm(p * 1.8 + vec2(time, -time)), fbm(p * 1.55 + 8.4 - time));
  float haze = fbm(p * 2.1 + warp * 1.75 + vec2(0.0, uScroll * 0.8));
  haze = smoothstep(0.42, 0.88, haze) * 0.16;

  float actMix = clamp(uAct, 0.0, 3.0);
  vec2 lightPos = vec2(pointer.x, -0.33 + uScroll * 0.18 + pointer.y);
  vec2 delta = p - lightPos;
  float anisotropic = length(vec2(delta.x * 1.85, delta.y * 0.68));
  float light = exp(-anisotropic * 5.8);
  light *= smoothstep(0.56, 0.06, abs(delta.x));

  float rays = 0.0;
  vec2 rayPoint = p;
  vec2 rayStep = (lightPos - p) * 0.12;
  for (int tap = 0; tap < 5; tap++) {
    rayPoint += rayStep;
    rays += fbm(rayPoint * 2.5 + warp) * 0.055;
  }
  rays *= light * smoothstep(0.48, 0.12, abs(delta.x));

  vec3 ink = vec3(0.043, 0.043, 0.055);
  vec3 vermilion = vec3(0.894, 0.278, 0.122);
  vec3 paper = vec3(0.953, 0.937, 0.906);
  vec3 coolPaper = vec3(0.91, 0.92, 0.92);
  vec3 warmPaper = vec3(0.96, 0.93, 0.88);
  vec3 actColor = vermilion;
  if (actMix > 0.5 && actMix < 1.5) actColor = coolPaper;
  if (actMix >= 2.5) actColor = warmPaper;

  float energy = clamp(light + rays + haze * 0.55, 0.0, 1.0);
  vec3 color = mix(ink, actColor, smoothstep(0.05, 0.58, energy) * 0.88);
  color = mix(color, paper, smoothstep(0.72, 0.98, light) * 0.72);
  color += haze * mix(vec3(0.02), actColor, 0.12);

  float vignette = smoothstep(0.98, 0.25, length((uv - 0.5) * vec2(1.0, 0.82)));
  color *= mix(0.38, 1.0, vignette);
  float grain = (hash21(gl_FragCoord.xy + uTime * 61.0) - 0.5) * 0.035;
  float dither = (hash21(gl_FragCoord.yx * 0.73 + uTime) - 0.5) * (2.0 / 255.0);
  color += grain + dither;
  outColor = vec4(color, 1.0);
}`;

function makeShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("CinemaCanvas shader compile failed", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const CinemaCanvas = forwardRef<CinemaCanvasHandle>(function CinemaCanvas(_, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ scroll: 0, act: 0 });
  const [poster, setPoster] = useState(false);

  useImperativeHandle(ref, () => ({
    setScroll(value) {
      stateRef.current.scroll = Math.min(1, Math.max(0, value));
    },
    setAct(value) {
      stateRef.current.act = Math.min(3, Math.max(0, value));
    },
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const mobile = window.matchMedia("(max-width: 859px)").matches;
    const lowPowerMobile = mobile && (navigator.hardwareConcurrency || 8) <= 4;
    if (reducedMotion || connection?.saveData || lowPowerMobile) {
      setPoster(true);
      return;
    }

    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "high-performance" });
    if (!gl) {
      setPoster(true);
      return;
    }

    const vertexShader = makeShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = makeShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) {
      setPoster(true);
      return;
    }
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.bindAttribLocation(program, 0, "aPosition");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("CinemaCanvas program link failed", gl.getProgramInfoLog(program));
      setPoster(true);
      return;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);

    const uniforms = {
      time: gl.getUniformLocation(program, "uTime"),
      scroll: gl.getUniformLocation(program, "uScroll"),
      act: gl.getUniformLocation(program, "uAct"),
      pointer: gl.getUniformLocation(program, "uPointer"),
      res: gl.getUniformLocation(program, "uRes"),
      dpr: gl.getUniformLocation(program, "uDpr"),
    };
    const pointer = { x: 0.5, y: 0.5 };
    let visible = true;
    let pageVisible = !document.hidden;
    let frame = 0;
    let start = performance.now();

    const resize = () => {
      const dpr = mobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      const scale = mobile ? 0.5 : 1;
      canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr * scale));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr * scale));
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uniforms.dpr, dpr);
      gl.uniform2f(uniforms.res, canvas.width, canvas.height);
    };
    const onPointerMove = (event: PointerEvent) => {
      pointer.x += (event.clientX / window.innerWidth - pointer.x) * 0.18;
      pointer.y += (1 - event.clientY / window.innerHeight - pointer.y) * 0.18;
    };
    const draw = (now: number) => {
      if (visible && pageVisible) {
        gl.uniform1f(uniforms.time, (now - start) / 1000);
        gl.uniform1f(uniforms.scroll, stateRef.current.scroll);
        gl.uniform1f(uniforms.act, stateRef.current.act);
        gl.uniform2f(uniforms.pointer, pointer.x, pointer.y);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      frame = requestAnimationFrame(draw);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start = performance.now();
    });
    const onVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible) start = performance.now();
    };

    resize();
    observer.observe(host);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return (
    <div ref={hostRef} className={`v6-cinema${poster ? " is-poster" : ""}`} aria-hidden="true">
      <canvas ref={canvasRef} className="v6-cinema-canvas" />
    </div>
  );
});

export default CinemaCanvas;
