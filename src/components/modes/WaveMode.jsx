import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const RING_SEGMENTS = 256;
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
      const baseRadius = 0.3 + ringIndex * 0.25;
      return { positions, colors, baseRadius, ringIndex };
    });
  }, []);

  // 色キャッシュ（毎フレームnew THREE.Colorを避ける）
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
    const scale = 1 + a.volume * (1 + intensity * 2);
    const timeSpeed = 0.5 + speed * 2;
    const waveComplexity = 2 + complexity * 12;

    groupRef.current.children.forEach((line, ringIndex) => {
      const geo = line.geometry;
      const posAttr = geo.attributes.position;
      const colAttr = geo.attributes.color;
      const posArr = posAttr.array;
      const colArr = colAttr.array;
      const baseRadius = 0.3 + ringIndex * 0.25;
      const ringOffset = ringIndex * 0.7;

      for (let i = 0; i <= RING_SEGMENTS; i++) {
        const angle = (i / RING_SEGMENTS) * Math.PI * 2;
        const i3 = i * 3;

        // 複数の波を重ねる（complexityで細かさが変わる）
        const wave1 = Math.sin(angle * 2 + time * timeSpeed * 1.5 + ringOffset) * a.bass * (1 + intensity);
        const wave2 = Math.sin(angle * waveComplexity + time * timeSpeed * 3) * a.high * 0.4;
        const wave3 = Math.sin(angle * (4 + complexity * 6) + time * timeSpeed * 2 + ringOffset * 0.5) * a.mid * 0.6;
        const wave4 = Math.sin(angle * (waveComplexity * 2) + time * timeSpeed * 4) * a.high * 0.2 * complexity;

        const r = (baseRadius + wave1 + wave2 + wave3 + wave4) * scale;
        posArr[i3] = Math.cos(angle) * r;
        posArr[i3 + 1] = Math.sin(angle) * r;
        posArr[i3 + 2] = (ringIndex - RING_COUNT * 0.5) * 0.15;

        // 色: リングごとに少しずつずらし + 周波数重心
        const centroidNorm = Math.min(a.spectralCentroid / 4000, 1);
        const hue = (centroidNorm * 0.7 + ringIndex * 0.04 + time * 0.02) % 1;
        const lightness = 0.45 + a.volume * 0.25 + intensity * 0.1;
        tmpColor.setHSL(hue, 0.85, lightness);
        colArr[i3] = tmpColor.r;
        colArr[i3 + 1] = tmpColor.g;
        colArr[i3 + 2] = tmpColor.b;
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    });

    groupRef.current.rotation.z += 0.001 + speed * 0.004;
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
          <lineBasicMaterial vertexColors transparent opacity={0.7} linewidth={1} />
        </line>
      ))}
    </group>
  );
}
