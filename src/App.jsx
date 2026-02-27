import { useState } from 'react';
import StartScreen from './components/StartScreen';
import Visualizer from './components/Visualizer';
import { useAudioAnalyser } from './hooks/useAudioAnalyser';

export default function App() {
  const [screen, setScreen] = useState('start');
  const audio = useAudioAnalyser();

  const handleFileSelect = async (file) => {
    await audio.loadFile(file);
    setScreen('visualizer');
  };

  const handleMicStart = async () => {
    await audio.startMic();
    setScreen('visualizer');
  };

  if (screen === 'start') {
    return (
      <StartScreen
        onFileSelect={handleFileSelect}
        onMicStart={handleMicStart}
      />
    );
  }

  return (
    <Visualizer
      isPlaying={audio.isPlaying}
      duration={audio.duration}
      currentTime={audio.currentTime}
      inputMode={audio.inputMode}
      volume={audio.volume}
      getAudioData={audio.getAudioData}
      onTogglePlay={audio.togglePlay}
      onSeek={audio.seek}
      onVolumeChange={audio.changeVolume}
      updateCurrentTime={audio.updateCurrentTime}
    />
  );
}
