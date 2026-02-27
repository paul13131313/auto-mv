import { useState, useEffect, useRef, useCallback } from 'react';

const MODES = ['PARTICLE', 'WAVE', 'FRACTAL'];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Controls({
  isPlaying,
  duration,
  currentTime,
  inputMode,
  volume,
  currentMode,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onModeChange,
}) {
  const [visible, setVisible] = useState(true);
  const hideTimerRef = useRef(null);
  const containerRef = useRef(null);

  const resetHideTimer = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    const handleMove = () => resetHideTimer();
    const handleTouch = () => resetHideTimer();
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchstart', handleTouch);
    return () => {
      clearTimeout(hideTimerRef.current);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchstart', handleTouch);
    };
  }, [resetHideTimer]);

  const handleProgressClick = (e) => {
    if (inputMode !== 'file' || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(ratio * duration);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      style={{
        ...styles.container,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* プログレスバー（ファイル再生時のみ） */}
      {inputMode === 'file' && (
        <div style={styles.progressRow}>
          <span style={styles.time}>{formatTime(currentTime)}</span>
          <div style={styles.progressBar} onClick={handleProgressClick}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <span style={styles.time}>{formatTime(duration)}</span>
        </div>
      )}

      <div style={styles.row}>
        {/* 再生/一時停止 */}
        <button style={styles.btn} onClick={onTogglePlay}>
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* モード切替 */}
        <div style={styles.modes}>
          {MODES.map((mode) => (
            <button
              key={mode}
              style={{
                ...styles.modeBtn,
                background: currentMode === mode ? 'rgba(255,255,255,0.3)' : 'transparent',
              }}
              onClick={() => onModeChange(mode)}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* 音量 */}
        <div style={styles.volumeWrap}>
          <span style={styles.volumeIcon}>{volume === 0 ? '🔇' : '🔊'}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            style={styles.volumeSlider}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
    padding: '24px 16px 16px',
    transition: 'opacity 0.3s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    zIndex: 100,
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  time: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)',
    minWidth: '36px',
    textAlign: 'center',
  },
  progressBar: {
    flex: 1,
    height: '4px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '2px',
    cursor: 'pointer',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    background: '#fff',
    borderRadius: '2px',
    transition: 'width 0.1s linear',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  btn: {
    width: '40px',
    height: '40px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '50%',
    color: '#fff',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modes: {
    display: 'flex',
    gap: '4px',
  },
  modeBtn: {
    padding: '6px 12px',
    fontSize: '11px',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '16px',
    cursor: 'pointer',
    letterSpacing: '0.05em',
    fontWeight: 600,
    transition: 'background 0.2s',
  },
  volumeWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },
  volumeIcon: {
    fontSize: '16px',
  },
  volumeSlider: {
    width: '60px',
    accentColor: '#fff',
  },
};
