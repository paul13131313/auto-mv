import { useState, useCallback, useRef, useEffect } from 'react';

const FADER_DEFS = [
  { key: 'intensity', label: 'INTENSITY', icon: '⚡' },
  { key: 'complexity', label: 'COMPLEXITY', icon: '🌀' },
  { key: 'speed', label: 'SPEED', icon: '💨' },
];

export default function Faders({ params, onChange }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const hideTimerRef = useRef(null);

  const resetHideTimer = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!open) setVisible(false);
    }, 3000);
  }, [open]);

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

  // パネル開いてる間は消さない
  useEffect(() => {
    if (open) {
      setVisible(true);
      clearTimeout(hideTimerRef.current);
    } else {
      resetHideTimer();
    }
  }, [open, resetHideTimer]);

  const handleChange = (key, value) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <div
      style={{
        ...styles.container,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* トグルボタン */}
      <button
        style={{
          ...styles.toggleBtn,
          background: open ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
        }}
        onClick={() => setOpen(!open)}
      >
        🎛
      </button>

      {/* フェーダーパネル */}
      {open && (
        <div style={styles.panel}>
          {FADER_DEFS.map(({ key, label, icon }) => (
            <div key={key} style={styles.faderRow}>
              <span style={styles.faderIcon}>{icon}</span>
              <span style={styles.faderLabel}>{label}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params[key]}
                onChange={(e) => handleChange(key, parseFloat(e.target.value))}
                style={styles.faderSlider}
              />
              <span style={styles.faderValue}>{Math.round(params[key] * 100)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 100,
    transition: 'opacity 0.3s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  toggleBtn: {
    width: '44px',
    height: '44px',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
    marginLeft: 'auto',
  },
  panel: {
    marginTop: '8px',
    background: 'rgba(0,0,0,0.85)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    padding: '16px',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: '240px',
  },
  faderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  faderIcon: {
    fontSize: '14px',
    width: '20px',
    textAlign: 'center',
  },
  faderLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.5)',
    width: '80px',
    letterSpacing: '0.1em',
    fontWeight: 600,
  },
  faderSlider: {
    flex: 1,
    accentColor: '#fff',
  },
  faderValue: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.6)',
    width: '28px',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
};
