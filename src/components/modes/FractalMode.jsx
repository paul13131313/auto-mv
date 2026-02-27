import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uVolume;
uniform float uBPM;
uniform float uIntensity;
uniform float uComplexity;
uniform float uSpeed;
uniform vec2 uResolution;

varying vec2 vUv;

vec3 palette(float t) {
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = vec3(0.263 + uBass * 0.2, 0.416 + uMid * 0.2, 0.557 + uHigh * 0.2);
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= uResolution.x / uResolution.y;

  // ゆったりとした回転
  float bpmRate = uBPM / 60.0;
  float timeSpeed = 0.2 + uSpeed * 0.6;
  float rotAngle = uTime * timeSpeed * bpmRate * 0.04;
  float co = cos(rotAngle);
  float si = sin(rotAngle);
  uv = mat2(co, -si, si, co) * uv;

  // ズーム: より深いズームで繊細なディテール
  float zoom = 2.5 + uVolume * 1.5 + uIntensity * 2.5;
  uv /= zoom;

  vec3 finalColor = vec3(0.0);
  float iterations = 4.0 + uComplexity * 4.0;

  for (float i = 0.0; i < 8.0; i++) {
    if (i >= iterations) break;

    // 細かいタイル + 有機的な歪み
    float tileFreq = 2.0 + i * 1.2 + uComplexity * 3.0;
    vec2 z = fract(uv * tileFreq) - 0.5;

    // ゆっくりとした歪み
    float t = uTime * timeSpeed * 0.2 + i * 0.12;
    float distortFreq = 5.0 + uComplexity * 6.0;
    float distortAmt = 0.12 * (1.0 + uMid * 0.5 + uIntensity * 0.3);
    z += vec2(
      sin(t + z.y * distortFreq + uv.x * 2.0),
      cos(t * 0.8 + z.x * distortFreq + uv.y * 2.0)
    ) * distortAmt;

    float d = length(z) * exp(-length(uv) * (0.6 + uIntensity * 0.4));

    vec3 col = palette(length(uv) + i * 0.25 + uTime * timeSpeed * 0.1);

    // 高い周波数の正弦波で細い線を作る
    float waveFreq = 12.0 + uComplexity * 10.0;
    d = sin(d * waveFreq + uTime * timeSpeed * 0.8) / waveFreq;
    d = abs(d);

    // 線の細さを制御（小さい値 = 細い線）
    float lineWidth = 0.005 + (1.0 - uIntensity) * 0.005;
    d = pow(lineWidth / d, 1.0 + uIntensity * 0.4);

    finalColor += col * d * (0.7 + uIntensity * 0.3);
  }

  // トーンマッピング（繊細な明暗を保つ）
  finalColor = finalColor / (1.0 + finalColor * 0.5);
  // ほんの少しビネット
  float vignette = 1.0 - length(vUv - 0.5) * 0.4;
  finalColor *= vignette;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export default function FractalMode({ getAudioData, bpm, params }) {
  const meshRef = useRef();
  const audioRef = useRef({ bass: 0, mid: 0, high: 0, volume: 0 });
  const { size } = useThree();

  const intensity = params?.intensity ?? 0.5;
  const complexity = params?.complexity ?? 0.5;
  const speed = params?.speed ?? 0.5;

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uVolume: { value: 0 },
    uBPM: { value: 120 },
    uIntensity: { value: 0.5 },
    uComplexity: { value: 0.5 },
    uSpeed: { value: 0.5 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
  }), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const audio = getAudioData();
    const a = audioRef.current;
    // ゆっくりスムージング
    a.bass += (audio.bass - a.bass) * 0.06;
    a.mid += (audio.mid - a.mid) * 0.06;
    a.high += (audio.high - a.high) * 0.06;
    a.volume += (audio.volume - a.volume) * 0.06;

    const mat = meshRef.current.material;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uBass.value = a.bass;
    mat.uniforms.uMid.value = a.mid;
    mat.uniforms.uHigh.value = a.high;
    mat.uniforms.uVolume.value = a.volume;
    mat.uniforms.uBPM.value = bpm;
    mat.uniforms.uIntensity.value = intensity;
    mat.uniforms.uComplexity.value = complexity;
    mat.uniforms.uSpeed.value = speed;
    mat.uniforms.uResolution.value.set(size.width, size.height);
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
