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

  float bpmRate = uBPM / 60.0;
  float rotAngle = uTime * bpmRate * 0.1;
  float co = cos(rotAngle);
  float si = sin(rotAngle);
  uv = mat2(co, -si, si, co) * uv;

  float zoom = 1.5 + uVolume * 3.0;
  uv /= zoom;

  vec3 finalColor = vec3(0.0);

  for (float i = 0.0; i < 4.0; i++) {
    vec2 z = fract(uv * (1.0 + i * 0.5)) - 0.5;

    float t = uTime * 0.3 + i * 0.1;
    z += vec2(sin(t + z.y * 3.0), cos(t + z.x * 3.0)) * 0.2 * (1.0 + uMid);

    float d = length(z) * exp(-length(uv));

    vec3 col = palette(length(uv) + i * 0.4 + uTime * 0.2);
    d = sin(d * 8.0 + uTime) / 8.0;
    d = abs(d);
    d = pow(0.01 / d, 1.2);

    finalColor += col * d;
  }

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export default function FractalMode({ getAudioData, bpm }) {
  const meshRef = useRef();
  const audioRef = useRef({ bass: 0, mid: 0, high: 0, volume: 0 });
  const { size } = useThree();

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uVolume: { value: 0 },
    uBPM: { value: 120 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
  }), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const audio = getAudioData();
    const a = audioRef.current;
    a.bass += (audio.bass - a.bass) * 0.1;
    a.mid += (audio.mid - a.mid) * 0.1;
    a.high += (audio.high - a.high) * 0.1;
    a.volume += (audio.volume - a.volume) * 0.1;

    const mat = meshRef.current.material;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uBass.value = a.bass;
    mat.uniforms.uMid.value = a.mid;
    mat.uniforms.uHigh.value = a.high;
    mat.uniforms.uVolume.value = a.volume;
    mat.uniforms.uBPM.value = bpm;
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
