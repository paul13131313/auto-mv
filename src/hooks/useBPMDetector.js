import { useRef, useCallback } from 'react';

// 簡易BPM検出（オンセット検出ベース）
// 低音域のピーク間隔からBPMを推定する
export function useBPMDetector() {
  const prevEnergyRef = useRef(0);
  const peakTimesRef = useRef([]);
  const bpmRef = useRef(120); // デフォルトBPM
  const lastPeakTimeRef = useRef(0);

  const detectBPM = useCallback((bassEnergy, timestamp) => {
    const prevEnergy = prevEnergyRef.current;
    const threshold = 0.15;
    const minInterval = 200; // 最低200ms間隔（=300BPM上限）

    // エネルギーの急激な上昇を検出（オンセット）
    if (bassEnergy - prevEnergy > threshold && timestamp - lastPeakTimeRef.current > minInterval) {
      lastPeakTimeRef.current = timestamp;
      const peaks = peakTimesRef.current;
      peaks.push(timestamp);

      // 直近10個のピークからBPM計算
      if (peaks.length > 10) {
        peaks.shift();
      }

      if (peaks.length >= 3) {
        let totalInterval = 0;
        let count = 0;
        for (let i = 1; i < peaks.length; i++) {
          const interval = peaks[i] - peaks[i - 1];
          // 妥当な範囲のみ（300ms〜1500ms = 40〜200BPM）
          if (interval >= 300 && interval <= 1500) {
            totalInterval += interval;
            count++;
          }
        }
        if (count > 0) {
          const avgInterval = totalInterval / count;
          bpmRef.current = Math.round(60000 / avgInterval);
        }
      }
    }

    prevEnergyRef.current = bassEnergy;
    return bpmRef.current;
  }, []);

  const getBPM = useCallback(() => bpmRef.current, []);

  return { detectBPM, getBPM };
}
