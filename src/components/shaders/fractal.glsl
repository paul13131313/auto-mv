// Fractal fragment shader
// uniforms: uTime, uBass, uMid, uHigh, uVolume, uBPM, uResolution

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uVolume;
uniform float uBPM;
uniform vec2 uResolution;

varying vec2 vUv;

vec3 palette(float t) {
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = vec3(0.263 + uBass * 0.3, 0.416 + uMid * 0.3, 0.557 + uHigh * 0.3);
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= uResolution.x / uResolution.y;

  // BPM同期の回転
  float bpmRate = uBPM / 60.0;
  float rotAngle = uTime * bpmRate * 0.1;
  float c = cos(rotAngle);
  float s = sin(rotAngle);
  uv = mat2(c, -s, s, c) * uv;

  // 音量でズーム
  float zoom = 1.5 + uVolume * 3.0;
  uv /= zoom;

  vec3 finalColor = vec3(0.0);
  float d = 0.0;

  for (float i = 0.0; i < 4.0; i++) {
    vec2 z = fract(uv * (1.0 + i * 0.5)) - 0.5;

    float t = uTime * 0.3 + i * 0.1;
    z += vec2(sin(t + z.y * 3.0), cos(t + z.x * 3.0)) * 0.2 * (1.0 + uMid);

    d = length(z) * exp(-length(uv));

    vec3 col = palette(length(uv) + i * 0.4 + uTime * 0.2);
    d = sin(d * 8.0 + uTime) / 8.0;
    d = abs(d);
    d = pow(0.01 / d, 1.2);

    finalColor += col * d;
  }

  gl_FragColor = vec4(finalColor, 1.0);
}
