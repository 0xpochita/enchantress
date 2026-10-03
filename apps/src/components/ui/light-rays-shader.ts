export const RAYS_VERTEX = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

export const RAYS_FRAGMENT = `precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform vec2 rayPos;
uniform vec2 rayDir;
uniform vec3 raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float fadeDistance;
uniform vec2 mousePos;
uniform float mouseInfluence;

float rayStrength(vec2 source, vec2 refDir, vec2 coord, float seedA, float seedB, float speed) {
  vec2 toCoord = coord - source;
  float cosAngle = dot(normalize(toCoord), refDir);
  float spread = pow(max(cosAngle, 0.0), 1.0 / max(lightSpread, 0.001));
  float dist = length(toCoord);
  float maxDist = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDist - dist) / maxDist, 0.0, 1.0);
  float fade = clamp((iResolution.x * fadeDistance - dist) / (iResolution.x * fadeDistance), 0.5, 1.0);
  float base = clamp(
    (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)),
    0.0, 1.0
  );
  return base * lengthFalloff * fade * spread;
}

void main() {
  vec2 coord = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y);
  vec2 mouseDir = normalize(mousePos * iResolution.xy - rayPos);
  vec2 dir = normalize(mix(rayDir, mouseDir, mouseInfluence));
  float rays =
    rayStrength(rayPos, dir, coord, 36.2214, 21.11349, 1.5 * raysSpeed) * 0.5 +
    rayStrength(rayPos, dir, coord, 22.3991, 18.0234, 1.1 * raysSpeed) * 0.4;
  float brightness = 1.0 - coord.y / iResolution.y;
  float glow = rays * (0.2 + brightness * 0.8);
  gl_FragColor = vec4(vec3(glow) * raysColor, glow);
}`;
