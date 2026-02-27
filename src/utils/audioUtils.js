// 周波数帯域の定義
const BASS_MIN = 20;
const BASS_MAX = 250;
const MID_MIN = 250;
const MID_MAX = 2000;
const HIGH_MIN = 2000;
const HIGH_MAX = 20000;

// 周波数インデックスに変換（sampleRate基準）
function freqToIndex(freq, fftSize, sampleRate) {
  return Math.round((freq * fftSize) / sampleRate);
}

// 指定帯域の平均音量を計算（0〜1に正規化）
function bandAverage(dataArray, startIndex, endIndex) {
  if (startIndex >= endIndex || startIndex >= dataArray.length) return 0;
  const end = Math.min(endIndex, dataArray.length);
  let sum = 0;
  for (let i = startIndex; i < end; i++) {
    sum += dataArray[i];
  }
  return sum / ((end - startIndex) * 255);
}

// FFTデータから各帯域の音量を抽出
export function getFrequencyBands(analyser, dataArray) {
  analyser.getByteFrequencyData(dataArray);

  const fftSize = analyser.fftSize;
  const sampleRate = analyser.context.sampleRate;

  const bassStart = freqToIndex(BASS_MIN, fftSize, sampleRate);
  const bassEnd = freqToIndex(BASS_MAX, fftSize, sampleRate);
  const midStart = freqToIndex(MID_MIN, fftSize, sampleRate);
  const midEnd = freqToIndex(MID_MAX, fftSize, sampleRate);
  const highStart = freqToIndex(HIGH_MIN, fftSize, sampleRate);
  const highEnd = freqToIndex(HIGH_MAX, fftSize, sampleRate);

  const bass = bandAverage(dataArray, bassStart, bassEnd);
  const mid = bandAverage(dataArray, midStart, midEnd);
  const high = bandAverage(dataArray, highStart, highEnd);

  // RMS（全体音量）
  let rmsSum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 255;
    rmsSum += v * v;
  }
  const volume = Math.sqrt(rmsSum / dataArray.length);

  // 周波数重心（スペクトルの「明るさ」指標）
  let weightedSum = 0;
  let totalEnergy = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const freq = (i * sampleRate) / fftSize;
    const amp = dataArray[i] / 255;
    weightedSum += freq * amp;
    totalEnergy += amp;
  }
  const spectralCentroid = totalEnergy > 0 ? weightedSum / totalEnergy : 0;

  return { bass, mid, high, volume, spectralCentroid };
}
