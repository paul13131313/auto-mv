import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const PARTICLE_COUNT = isMobile ? 2000 : 5000;

export default function ParticleMode({ getAudioData }) {
  const meshRef = useRef();
  const audioRef = useRef({ bass: 0, mid: 0, high: 0, volume: 0 });

  // パーティクルの初期位置と速度
  const { positions, velocities, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      // 球体状に配置
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 3;
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);

      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;

      colors[i3] = 0.5;
      colors[i3 + 1] = 0.5;
      colors[i3 + 2] = 1.0;

      sizes[i] = Math.random() * 3 + 1;
    }
    return { positions, velocities, colors, sizes };
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const audio = getAudioData();
    // スムージング
    const a = audioRef.current;
    a.bass += (audio.bass - a.bass) * 0.1;
    a.mid += (audio.mid - a.mid) * 0.1;
    a.high += (audio.high - a.high) * 0.1;
    a.volume += (audio.volume - a.volume) * 0.1;

    const posAttr = meshRef.current.geometry.attributes.position;
    const colAttr = meshRef.current.geometry.attributes.color;
    const sizeAttr = meshRef.current.geometry.attributes.size;
    const posArr = posAttr.array;
    const colArr = colAttr.array;
    const sizeArr = sizeAttr.array;

    const time = state.clock.elapsedTime;
    const speedMult = 1 + a.mid * 5; // 中音 → 速度
    const spread = 3 + a.volume * 4; // 音量 → 広がり

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // 移動
      posArr[i3] += velocities[i3] * speedMult;
      posArr[i3 + 1] += velocities[i3 + 1] * speedMult;
      posArr[i3 + 2] += velocities[i3 + 2] * speedMult;

      // 中心に引き戻す力
      const dx = posArr[i3];
      const dy = posArr[i3 + 1];
      const dz = posArr[i3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > spread) {
        const force = (dist - spread) * 0.01;
        posArr[i3] -= (dx / dist) * force;
        posArr[i3 + 1] -= (dy / dist) * force;
        posArr[i3 + 2] -= (dz / dist) * force;
      }

      // 低音 → サイズ
      sizeArr[i] = (Math.random() * 2 + 1) * (1 + a.bass * 4);

      // 高音 → 色（暖色↔寒色）
      const warmth = a.high;
      colArr[i3] = 0.3 + warmth * 0.7;     // R: 高音で赤く
      colArr[i3 + 1] = 0.2 + a.mid * 0.3;  // G: 中音でやや緑
      colArr[i3 + 2] = 1.0 - warmth * 0.6;  // B: 高音で青が減る
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    // 全体をゆっくり回転
    meshRef.current.rotation.y += delta * 0.1;
  });

  return (
    <points ref={meshRef}>
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
      <pointsMaterial
        size={3}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
