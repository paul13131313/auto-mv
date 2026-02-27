import { useRef, useState, useCallback, useEffect } from 'react';
import { getFrequencyBands } from '../utils/audioUtils';

export function useAudioAnalyser() {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const dataArrayRef = useRef(null);
  const bufferRef = useRef(null);
  const startTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);
  const gainNodeRef = useRef(null);
  const streamRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [inputMode, setInputMode] = useState(null); // 'file' | 'mic'
  const [volume, setVolume] = useState(1);

  // AudioContextを初期化（iOS Safari対策: ユーザージェスチャー後に呼ぶ）
  const ensureContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AC();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      analyserRef.current.connect(gainNodeRef.current);
    }
    // iOS Safari: suspended状態ならresumeする
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // ソースを安全に切断
  const disconnectSource = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (e) { /* ignore */ }
      try { sourceRef.current.stop?.(); } catch (e) { /* ignore */ }
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // ファイルを読み込んで再生
  const loadFile = useCallback(async (file) => {
    const ctx = ensureContext();
    disconnectSource();

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    bufferRef.current = audioBuffer;
    setDuration(audioBuffer.duration);
    setInputMode('file');

    // 再生開始
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyserRef.current);
    source.start(0);
    sourceRef.current = source;
    startTimeRef.current = ctx.currentTime;
    pauseTimeRef.current = 0;
    setIsPlaying(true);
    setCurrentTime(0);

    source.onended = () => {
      setIsPlaying(false);
    };
  }, [ensureContext, disconnectSource]);

  // マイク入力開始
  const startMic = useCallback(async () => {
    const ctx = ensureContext();
    disconnectSource();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyserRef.current);
    sourceRef.current = source;
    setInputMode('mic');
    setIsPlaying(true);
    setDuration(0);
  }, [ensureContext, disconnectSource]);

  // 再生/一時停止トグル
  const togglePlay = useCallback(() => {
    if (inputMode !== 'file' || !bufferRef.current) return;
    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (isPlaying) {
      // 一時停止
      pauseTimeRef.current += ctx.currentTime - startTimeRef.current;
      disconnectSource();
      setIsPlaying(false);
    } else {
      // 再開
      const source = ctx.createBufferSource();
      source.buffer = bufferRef.current;
      source.connect(analyserRef.current);
      source.start(0, pauseTimeRef.current);
      sourceRef.current = source;
      startTimeRef.current = ctx.currentTime;
      setIsPlaying(true);

      source.onended = () => {
        setIsPlaying(false);
      };
    }
  }, [inputMode, isPlaying, disconnectSource]);

  // シーク
  const seek = useCallback((time) => {
    if (inputMode !== 'file' || !bufferRef.current) return;
    const ctx = audioContextRef.current;
    if (!ctx) return;

    disconnectSource();
    const source = ctx.createBufferSource();
    source.buffer = bufferRef.current;
    source.connect(analyserRef.current);
    source.start(0, time);
    sourceRef.current = source;
    startTimeRef.current = ctx.currentTime;
    pauseTimeRef.current = time;
    setIsPlaying(true);
    setCurrentTime(time);

    source.onended = () => {
      setIsPlaying(false);
    };
  }, [inputMode, disconnectSource]);

  // 音量変更
  const changeVolume = useCallback((v) => {
    setVolume(v);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = v;
    }
  }, []);

  // 周波数データ取得（毎フレーム呼ぶ用）
  const getAudioData = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) {
      return { bass: 0, mid: 0, high: 0, volume: 0, spectralCentroid: 0 };
    }
    return getFrequencyBands(analyserRef.current, dataArrayRef.current);
  }, []);

  // 現在の再生位置を更新
  const updateCurrentTime = useCallback(() => {
    if (inputMode !== 'file' || !audioContextRef.current) return;
    if (isPlaying) {
      const elapsed = pauseTimeRef.current + (audioContextRef.current.currentTime - startTimeRef.current);
      setCurrentTime(Math.min(elapsed, duration));
    }
  }, [inputMode, isPlaying, duration]);

  // 停止（スタート画面に戻る用）
  const stop = useCallback(() => {
    disconnectSource();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setInputMode(null);
    bufferRef.current = null;
    pauseTimeRef.current = 0;
  }, [disconnectSource]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      disconnectSource();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [disconnectSource]);

  return {
    isPlaying,
    duration,
    currentTime,
    inputMode,
    volume,
    loadFile,
    startMic,
    togglePlay,
    seek,
    changeVolume,
    getAudioData,
    updateCurrentTime,
    stop,
  };
}
