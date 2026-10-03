export const AURORA_VERTEX = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

export const AURORA_FRAGMENT = `precision highp float;

uniform float uTime;
uniform float uScroll;
uniform vec2 uResolution;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uStrength;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

vec3 ramp(float t) {
  float tri = 1.0 - abs(fract(t) * 2.0 - 1.0);
  return tri < 0.5 ? mix(uColorA, uColorB, tri * 2.0) : mix(uColorB, uColorC, (tri - 0.5) * 2.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float right = step(0.5, uv.x);
  float side = min(uv.x, 1.0 - uv.x) * 2.0;
  float wave = snoise(vec2(uv.y * 1.4 + uTime * 0.06, uTime * 0.18 + right * 7.3));
  float reach = 0.42 + 0.16 * wave;
  float curtain = smoothstep(reach, 0.0, side);
  float streak = 0.55 + 0.45 * snoise(vec2(side * 4.0 + right * 3.1, uv.y * 2.2 - uTime * 0.12));
  float alpha = clamp(curtain * streak, 0.0, 1.0) * uStrength;
  vec3 color = ramp(uv.y * 0.35 + uScroll * 0.9 + right * 0.08);
  gl_FragColor = vec4(color * alpha, alpha);
}`;
