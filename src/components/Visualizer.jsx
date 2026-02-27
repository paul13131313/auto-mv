import { useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import ParticleMode from './modes/ParticleMode';
import WaveMode from './modes/WaveMode';
import FractalMode from './modes/FractalMode';
import Controls from './Controls';
import { useBPMDetector } from '../hooks/useBPMDetector';

export default function Visualizer({
  isPlaying,
  duration,
  currentTime,
  inputMode,
  volume,
  getAudioData,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  updateCurrentTime,
}) {
  const [mode, setMode] = useState('PARTICLE');
  const { detectBPM, getBPM } = useBPMDetector();

  // フルスクリーン切替
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  // 再生位置の定期更新
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(updateCurrentTime, 100);
    return () => clearInterval(id);
  }, [isPlaying, updateCurrentTime]);

  // BPM検出用ラッパー
  const getAudioDataWithBPM = useCallback(() => {
    const data = getAudioData();
    detectBPM(data.bass, performance.now());
    return data;
  }, [getAudioData, detectBPM]);

  const renderMode = () => {
    switch (mode) {
      case 'PARTICLE':
        return <ParticleMode getAudioData={getAudioDataWithBPM} />;
      case 'WAVE':
        return <WaveMode getAudioData={getAudioDataWithBPM} />;
      case 'FRACTAL':
        return <FractalMode getAudioData={getAudioDataWithBPM} bpm={getBPM()} />;
      default:
        return <ParticleMode getAudioData={getAudioDataWithBPM} />;
    }
  };

  return (
    <div style={styles.container} onClick={toggleFullscreen}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        style={styles.canvas}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#000000']} />
        {renderMode()}
      </Canvas>

      <Controls
        isPlaying={isPlaying}
        duration={duration}
        currentTime={currentTime}
        inputMode={inputMode}
        volume={volume}
        currentMode={mode}
        onTogglePlay={onTogglePlay}
        onSeek={onSeek}
        onVolumeChange={onVolumeChange}
        onModeChange={setMode}
      />
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    inset: 0,
    background: '#000',
    cursor: 'pointer',
  },
  canvas: {
    width: '100%',
    height: '100%',
  },
};
