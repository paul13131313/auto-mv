import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const PARTICLE_COUNT = isMobile ? 3000 : 8000;

const vertexShader = `
attribute float size;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = color;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  // 距離に応じたサイズ減衰（繊細な見た目）
  float dist = -mvPosition.z;
  gl_PointSize = size * (150.0 / dist);
  // 遠くのパーティクルは少し透明に
  vAlpha = clamp(1.0 - (dist - 3.0) * 0.08, 0.2, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  if (d > 0.5) discard;
  // ソフトなエッジ（繊細なグロウ）
  float alpha = smoothstep(0.5, 0.1, d) * vAlpha * 0.85;
  // 中心が明るいグロウ
  float glow = exp(-d * 6.0) * 0.4;
  gl_FragColor = vec4(vColor * (1.0 + glow), alpha);
}
`;

export default function ParticleMode({ getAudioData, params }) {
  const meshRef = useRef();
  const audioRef = useRef({ bass: 0, mid: 0, high: 0, volume: 0 });

  const intensity = params?.intensity ?? 0.5;
  const complexity = params?.complexity ?? 0.5;
  const speed = params?.speed ?? 0.5;

  const { positions, basePositions, velocities, colors, sizes, phases } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const basePositions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const phases = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.5 + Math.random() * 4;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      basePositions[i3] = x;
      basePositions[i3 + 1] = y;
      basePositions[i3 + 2] = z;

      // ゆっくりした初速
      velocities[i3] = (Math.random() - 0.5) * 0.008;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.008;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.008;

      // 初期色: 青〜紫系の繊細なトーン
      const hue = 0.55 + Math.random() * 0.15;
      const c = new THREE.Color().setHSL(hue, 0.6, 0.5 + Math.random() * 0.2);
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;

      sizes[i] = Math.random() * 1.5 + 0.3;
      phases[i] = Math.random() * Math.PI * 2;
    }
    return { positions, basePositions, velocities, colors, sizes, phases };
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

  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const audio = getAudioData();
    const a = audioRef.current;
    // ゆっくりスムージング（連続性重視）
    a.bass += (audio.bass - a.bass) * 0.06;
    a.mid += (audio.mid - a.mid) * 0.06;
    a.high += (audio.high - a.high) * 0.06;
    a.volume += (audio.volume - a.volume) * 0.06;

    const posAttr = meshRef.current.geometry.attributes.position;
    const colAttr = meshRef.current.geometry.attributes.color;
    const sizeAttr = meshRef.current.geometry.attributes.size;
    const posArr = posAttr.array;
    const colArr = colAttr.array;
    const sizeArr = sizeAttr.array;

    const time = state.clock.elapsedTime;
    // ゆったりとした動き
    const speedMult = (0.3 + speed * 0.7) * (1 + a.mid * 2);
    const spread = 2.5 + a.volume * 3 + intensity * 2;
    const sizeBase = 0.3 + intensity * 1.2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const phase = phases[i];

      // 緩やかな軌道運動（sin/cosで有機的なうねり）
      const orbitSpeed = time * (0.15 + speed * 0.3);
      posArr[i3] += velocities[i3] * speedMult;
      posArr[i3 + 1] += velocities[i3 + 1] * speedMult;
      posArr[i3 + 2] += velocities[i3 + 2] * speedMult;

      // 有機的な揺らぎ（各パーティクルの位相をずらして連続的に）
      const drift = 0.003 * (0.5 + complexity);
      posArr[i3] += Math.sin(orbitSpeed + phase) * drift;
      posArr[i3 + 1] += Math.cos(orbitSpeed * 0.7 + phase * 1.3) * drift;
      posArr[i3 + 2] += Math.sin(orbitSpeed * 0.5 + phase * 0.8) * drift * 0.5;

      // 中心に引き戻す力（柔らかく）
      const dx = posArr[i3];
      const dy = posArr[i3 + 1];
      const dz = posArr[i3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > spread) {
        const force = (dist - spread) * 0.008;
        posArr[i3] -= (dx / dist) * force;
        posArr[i3 + 1] -= (dy / dist) * force;
        posArr[i3 + 2] -= (dz / dist) * force;
      }

      // 低音 → サイズ（滑らかに変化）
      const targetSize = sizeBase * (0.5 + (Math.sin(phase + time * 0.5) * 0.25 + 0.25)) * (1 + a.bass * 2.5);
      sizeArr[i] += (targetSize - sizeArr[i]) * 0.1;

      // 色: 高音で暖色、低音で寒色（滑らかな遷移）
      const warmth = a.high;
      const hue = 0.6 - warmth * 0.35 + Math.sin(phase + time * 0.1) * 0.05;
      const sat = 0.5 + a.volume * 0.3;
      const light = 0.4 + a.volume * 0.2 + intensity * 0.1;
      tmpColor.setHSL(((hue % 1) + 1) % 1, sat, light);
      colArr[i3] += (tmpColor.r - colArr[i3]) * 0.05;
      colArr[i3 + 1] += (tmpColor.g - colArr[i3 + 1]) * 0.05;
      colArr[i3 + 2] += (tmpColor.b - colArr[i3 + 2]) * 0.05;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    // ゆったり回転
    meshRef.current.rotation.y += delta * (0.03 + speed * 0.06);
    meshRef.current.rotation.x += delta * 0.01;
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
