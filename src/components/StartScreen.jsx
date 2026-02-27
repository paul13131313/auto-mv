import { useRef } from 'react';

export default function StartScreen({ onFileSelect, onMicStart }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.logo}>AUTO MV</h1>
        <p style={styles.subtitle}>Music Visualizer</p>

        <div style={styles.buttons}>
          <button
            style={styles.button}
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.1)';
            }}
          >
            <span style={styles.icon}>🎵</span>
            ファイルを選ぶ
          </button>

          <button
            style={styles.button}
            onClick={onMicStart}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.1)';
            }}
          >
            <span style={styles.icon}>🎤</span>
            マイクで聴かせる
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mp3,audio/wav,audio/m4a,audio/ogg,audio/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <p style={styles.formats}>mp3 / wav / m4a / ogg</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    inset: 0,
    background: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  content: {
    textAlign: 'center',
    padding: '20px',
  },
  logo: {
    fontSize: 'clamp(48px, 12vw, 80px)',
    fontWeight: 900,
    color: '#fff',
    margin: 0,
    letterSpacing: '0.05em',
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '8px',
    marginBottom: '48px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    alignItems: 'center',
  },
  button: {
    width: '240px',
    padding: '16px 24px',
    fontSize: '16px',
    color: '#fff',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background 0.2s',
  },
  icon: {
    fontSize: '20px',
  },
  formats: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '24px',
  },
};
