'use client';

import React, { useRef, useEffect } from 'react';

// Canvas-based visualizer: responsive, smooth and lightweight
function AudioVisualizer({ audioStream }: { audioStream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevLevelsRef = useRef<number[] | null>(null);

  useEffect(() => {
    const cleanup = async () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      try {
        sourceRef.current?.disconnect();
        analyserRef.current?.disconnect();
      } catch {}
      sourceRef.current = null;
      sourceRef.current = null;
      if (audioCtxRef.current) {
        try {
          await audioCtxRef.current.close();
        } catch {}
        audioCtxRef.current = null;
      }
    };

    if (!audioStream) {
      cleanup();
      return;
    }

    const ctx = new (window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512; // enough resolution for smooth bars
    analyser.smoothingTimeConstant = 0.85; // balanced smoothing
    const source = ctx.createMediaStreamSource(audioStream);
    source.connect(analyser);

    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (
        canvas.width !== Math.floor(rect.width * dpr) ||
        canvas.height !== Math.floor(rect.height * dpr)
      ) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }
      const c = canvas.getContext('2d');
      if (!c) return;
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.save();
      c.scale(dpr, dpr);

      analyser.getByteFrequencyData(dataArray);

      const width = rect.width;
      const height = rect.height;
      const centerY = height / 2;
      // Compute responsive, even bar count so we can mirror around center
      const targetBarWidth = 3; // px
      const targetGap = 2; // px
      let barCount = Math.round(width / (targetBarWidth + targetGap));
      barCount = Math.max(24, Math.min(96, barCount));
      if (barCount % 2 !== 0) barCount += 1; // ensure even

      const half = barCount / 2;
      // Map frequency data to half the bars, then mirror so center responds
      const binSize = Math.max(1, Math.floor(dataArray.length / half));
      const halfLevels: number[] = new Array(half).fill(0).map((_, i) => {
        let sum = 0;
        // Emphasize lower/mid frequencies: use slight log-like spacing
        const frac = i / Math.max(1, half - 1);
        const startIdx = Math.floor(Math.pow(frac, 0.8) * (dataArray.length - binSize));
        const start = Math.max(0, startIdx);
        const end = Math.min(dataArray.length, start + binSize);
        for (let j = start; j < end; j++) sum += dataArray[j] || 0;
        const avg = sum / Math.max(1, end - start);
        let level = avg / 255; // 0..1
        // Perceptual boost (stronger)
        level = Math.pow(level, 0.6);
        // Noise gate (tolerant to background noise)
        const gate = 0.08; // ignore levels below this
        level = level < gate ? 0 : (level - gate) / (1 - gate);
        // Soft quantization with more steps, then apply gain
        const steps = 10;
        level = Math.round(level * steps) / steps;
        level = Math.min(1, level * 1.35);
        return Math.max(0, Math.min(1, level));
      });

      // Mirror around center: lowest freqs at the center
      const nextLevels = [...halfLevels.slice().reverse(), ...halfLevels];

      // Exponential smoothing for responsiveness without jitter
      const alpha = 0.3;
      const smoothed = nextLevels.map((lvl, i) => {
        const prev = prevLevelsRef.current?.[i] ?? lvl;
        return prev * (1 - alpha) + lvl * alpha;
      });
      prevLevelsRef.current = smoothed;

      // Compute bar width to exactly span full width
      const gap = targetGap;
      const barWidth = Math.max(1, (width - (barCount - 1) * gap) / barCount);
      c.fillStyle = 'rgba(255,255,255,0.92)';
      const radius = Math.min(3, barWidth / 2);
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap);
        const h = Math.max(0, Math.round(smoothed[i] * height));
        const y = centerY - h / 2; // draw around center (up and down)

        // Rounded rect helper
        const r = Math.min(radius, barWidth / 2, h / 2);
        if (h <= 1 || r <= 0) {
          c.fillRect(x, Math.round(centerY - 0.5), barWidth, 1);
        } else {
          c.beginPath();
          c.moveTo(x + r, y);
          c.lineTo(x + barWidth - r, y);
          c.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
          c.lineTo(x + barWidth, y + h - r);
          c.quadraticCurveTo(x + barWidth, y + h, x + barWidth - r, y + h);
          c.lineTo(x + r, y + h);
          c.quadraticCurveTo(x, y + h, x, y + h - r);
          c.lineTo(x, y + r);
          c.quadraticCurveTo(x, y, x + r, y);
          c.closePath();
          c.fill();
        }
      }

      c.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cleanup();
    };
  }, [audioStream]);

  return <canvas ref={canvasRef} className="block h-6 w-full" />;
}

export { AudioVisualizer };
