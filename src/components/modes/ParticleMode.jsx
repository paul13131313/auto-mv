import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const PARTICLE_COUNT = isMobile ? 2000 : 5000;

const vertexShader = `
attribute float size;
varying vec3 vColor;
void main() {
  vColor = color;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (200.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  if (d > 0.5) discard;
  float alpha = 1.0 - smoothstep(0.2, 0.5, d);
  gl_FragColor = vec4(vColor, alpha * 0.9);
}
`;

export default function ParticleMode({ getAudioData, params }) {
  const meshRef = useRef();
  const audioRef = useRef({ bass: 0, mid: 0, high: 0, volume: 0 });

  const intensity = params?.intensity ?? 0.5;
  const complexity = params?.complexity ?? 0.5;
  const speed = params?.speed ?? 0.5;

  const { positions, velocities, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1 + Math.random() * 4;
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);

      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;

      colors[i3] = 0.4 + Math.random() * 0.2;
      colors[i3 + 1] = 0.3 + Math.random() * 0.2;
      colors[i3 + 2] = 0.8 + Math.random() * 0.2;

      sizes[i] = Math.random() * 2 + 0.5;
    }
    return { positions, velocities, colors, sizes };
  }, []);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const audio = getAudioData();
    const a = audioRef.current;
    a.bass += (audio.bass - a.bass) * 0.15;
    a.mid += (audio.mid - a.mid) * 0.15;
    a.high += (audio.high - a.high) * 0.15;
    a.volume += (audio.volume - a.volume) * 0.15;

    const posAttr = meshRef.current.geometry.attributes.position;
    const colAttr = meshRef.current.geometry.attributes.color;
    const sizeAttr = meshRef.current.geometry.attributes.size;
    const posArr = posAttr.array;
    const colArr = colAttr.array;
    const sizeArr = sizeAttr.array;

    const time = state.clock.elapsedTime;
    const speedMult = (0.5 + speed * 2) * (1 + a.mid * 5);
    const spread = 2 + a.volume * 6 + intensity * 3;
    const sizeBase = 0.5 + intensity * 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // 移動
      posArr[i3] += velocities[i3] * speedMult;
      posArr[i3 + 1] += velocities[i3 + 1] * speedMult;
      posArr[i3 + 2] += velocities[i3 + 2] * speedMult;

      // 軌道上に揺らぎを加える
      const noiseX = Math.sin(time * 0.5 + i * 0.1) * 0.005 * complexity;
      const noiseY = Math.cos(time * 0.3 + i * 0.07) * 0.005 * complexity;
      posArr[i3] += noiseX;
      posArr[i3 + 1] += noiseY;

      // 中心に引き戻す力
      const dx = posArr[i3];
      const dy = posArr[i3 + 1];
      const dz = posArr[i3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > spread) {
        const force = (dist - spread) * 0.02;
        posArr[i3] -= (dx / dist) * force;
        posArr[i3 + 1] -= (dy / dist) * force;
        posArr[i3 + 2] -= (dz / dist) * force;
      }

      // 低音 → サイズ
      sizeArr[i] = sizeBase * (0.5 + Math.random() * 0.5) * (1 + a.bass * 4);

      // 高音 → 色（暖色↔寒色）
      const warmth = a.high;
      colArr[i3] = 0.3 + warmth * 0.7;
      colArr[i3 + 1] = 0.1 + a.mid * 0.4 + complexity * 0.2;
      colArr[i3 + 2] = 0.9 - warmth * 0.5;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    meshRef.current.rotation.y += delta * (0.05 + speed * 0.15);
    meshRef.current.rotation.x += delta * 0.02;
  });

  return (
    <points ref={meshRef} material={shaderMaterial}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={PARTICLE_COUNT}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={PARTICLE_COUNT}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
    </points>
  );
}
