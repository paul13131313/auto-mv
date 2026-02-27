import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const RING_SEGMENTS = 128;
const RING_COUNT = 8;

export default function WaveMode({ getAudioData }) {
  const groupRef = useRef();
  const audioRef = useRef({ bass: 0, mid: 0, high: 0, volume: 0, spectralCentroid: 0 });

  // リング群の初期ジオメトリ
  const rings = useMemo(() => {
    return Array.from({ length: RING_COUNT }, (_, ringIndex) => {
      const positions = new Float32Array((RING_SEGMENTS + 1) * 3);
      const colors = new Float32Array((RING_SEGMENTS + 1) * 3);
      const baseRadius = 1 + ringIndex * 0.4;
      return { positions, colors, baseRadius, ringIndex };
    });
  }, []);

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

    groupRef.current.children.forEach((line, ringIndex) => {
      const geo = line.geometry;
      const posAttr = geo.attributes.position;
      const colAttr = geo.attributes.color;
      const posArr = posAttr.array;
      const colArr = colAttr.array;
      const baseRadius = 1 + ringIndex * 0.4;

      for (let i = 0; i <= RING_SEGMENTS; i++) {
        const angle = (i / RING_SEGMENTS) * Math.PI * 2;
        const i3 = i * 3;

        // 低音で大きなうねり + 高音で細かい波
        const wave1 = Math.sin(angle * 2 + time * 1.5) * a.bass * 1.5;
        const wave2 = Math.sin(angle * 8 + time * 3) * a.high * 0.5;
        const wave3 = Math.sin(angle * 4 + time * 2 + ringIndex) * a.mid * 0.8;

        const r = (baseRadius + wave1 + wave2 + wave3) * scale;
        posArr[i3] = Math.cos(angle) * r;
        posArr[i3 + 1] = Math.sin(angle) * r;
        posArr[i3 + 2] = ringIndex * 0.3 - RING_COUNT * 0.15;

        // 色は周波数重心で決まる（低→赤, 高→青紫）
        const centroidNorm = Math.min(a.spectralCentroid / 4000, 1);
        const hue = centroidNorm * 0.8; // 0=赤, 0.8=紫
        const color = new THREE.Color().setHSL(hue, 0.8, 0.5 + a.volume * 0.3);
        colArr[i3] = color.r;
        colArr[i3 + 1] = color.g;
        colArr[i3 + 2] = color.b;
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
          <lineBasicMaterial vertexColors transparent opacity={0.8} linewidth={1} />
        </line>
      ))}
    </group>
  );
}
