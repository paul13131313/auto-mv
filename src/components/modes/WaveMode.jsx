import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 多数のリングを密集配置 → 1本の線から生まれるような挙動
const RING_SEGMENTS = 128;
const RING_COUNT = 16;

export default function WaveMode({ getAudioData, params }) {
  const groupRef = useRef();
  const audioRef = useRef({ bass: 0, mid: 0, high: 0, volume: 0, spectralCentroid: 0 });

  const intensity = params?.intensity ?? 0.5;
  const complexity = params?.complexity ?? 0.5;
  const speed = params?.speed ?? 0.5;

  const rings = useMemo(() => {
    return Array.from({ length: RING_COUNT }, (_, ringIndex) => {
      const positions = new Float32Array((RING_SEGMENTS + 1) * 3);
      const colors = new Float32Array((RING_SEGMENTS + 1) * 3);
      return { positions, colors };
    });
  }, []);

  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const audio = getAudioData();
    const a = audioRef.current;
    a.bass += (audio.bass - a.bass) * 0.15;
    a.mid += (audio.mid - a.mid) * 0.15;
    a.high += (audio.high - a.high) * 0.15;
    a.volume += (audio.volume - a.volume) * 0.15;
    a.spectralCentroid += (audio.spectralCentroid - a.spectralCentroid) * 0.1;

    const time = state.clock.elapsedTime;
    const scale = 1 + a.volume * 2;
    const timeSpeed = 0.5 + speed * 2.0;

    groupRef.current.children.forEach((line, ringIndex) => {
      const geo = line.geometry;
      const posAttr = geo.attributes.position;
      const colAttr = geo.attributes.color;
      const posArr = posAttr.array;
      const colArr = colAttr.array;

      // 密集配置: 全リングがほぼ同じ半径から始まる
      // リング間隔 0.08 → 16本が 1.0〜2.2 の狭い範囲に密集
      const baseRadius = 1.0 + ringIndex * 0.08;
      const ringPhase = ringIndex * 0.4;

      const waveComplexity = 2 + complexity * 12;

      for (let i = 0; i <= RING_SEGMENTS; i++) {
        const angle = (i / RING_SEGMENTS) * Math.PI * 2;
        const i3 = i * 3;

        // 低音: 大きなうねり（リズムに強く反応 → 線が広がる）
        const wave1 = Math.sin(angle * 2 + time * timeSpeed + ringPhase) * a.bass * (1.5 + intensity);
        // 中音: リングごとに位相がずれて広がる
        const wave2 = Math.sin(angle * 4 + time * timeSpeed * 0.7 + ringPhase * 1.5) * a.mid * 0.8;
        // 高音: 細かい波
        const wave3 = Math.sin(angle * waveComplexity + time * timeSpeed * 1.5) * a.high * 0.5;
        // 微振動
        const wave4 = Math.sin(angle * (waveComplexity * 2) + time * timeSpeed * 2.0 + ringPhase * 0.5) * a.high * 0.15 * complexity;

        const r = (baseRadius + wave1 + wave2 + wave3 + wave4) * scale;
        posArr[i3] = Math.cos(angle) * r;
        posArr[i3 + 1] = Math.sin(angle) * r;
        // Z方向もほぼ同じ平面に（密集感を出す）
        posArr[i3 + 2] = ringIndex * 0.05 - RING_COUNT * 0.025;

        // 色
        const centroidNorm = Math.min(a.spectralCentroid / 4000, 1);
        const hue = (centroidNorm * 0.8 + ringIndex * 0.04 + time * 0.02) % 1;
        const sat = 0.8;
        const lightness = 0.5 + a.volume * 0.3;
        tmpColor.setHSL(hue, sat, lightness);
        colArr[i3] = tmpColor.r;
        colArr[i3 + 1] = tmpColor.g;
        colArr[i3 + 2] = tmpColor.b;
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    });

    groupRef.current.rotation.z += 0.002;
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, idx) => (
        <line key={idx}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={RING_SEGMENTS + 1}
              array={ring.positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={RING_SEGMENTS + 1}
              array={ring.colors}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={0.8}
            linewidth={1}
          />
        </line>
      ))}
    </group>
  );
}
