import React, { useRef, useEffect } from 'react';
import { Project, AudioDspConfig } from '../types';
import { audioEngine } from '../services/audioEngine';
import { Sliders, Activity, Radio, Volume2, ShieldCheck, Gauge, RotateCcw } from 'lucide-react';

interface AudioProcessingRackProps {
  project: Project;
  onUpdateProject: (updated: Partial<Project>) => void;
  isPlaying: boolean;
}

export const AudioProcessingRack: React.FC<AudioProcessingRackProps> = ({
  project,
  onUpdateProject,
  isPlaying,
}) => {
  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const { audioDspConfig } = project;

  // Real-time Visualizer Animation Loop
  useEffect(() => {
    let animId: number;
    const freqArray = new Uint8Array(64);
    const timeArray = new Uint8Array(128);

    const draw = () => {
      audioEngine.getFrequencySpectrum(freqArray);
      audioEngine.getWaveform(timeArray);

      // 1. Draw Spectrum
      const specCanvas = spectrumCanvasRef.current;
      if (specCanvas) {
        const sCtx = specCanvas.getContext('2d');
        if (sCtx) {
          sCtx.clearRect(0, 0, specCanvas.width, specCanvas.height);
          const barWidth = specCanvas.width / 64;
          for (let i = 0; i < 64; i++) {
            const barHeight = (freqArray[i] / 255) * specCanvas.height;
            const x = i * barWidth;
            const y = specCanvas.height - barHeight;

            // Gradient from blue to cyan
            const grad = sCtx.createLinearGradient(0, specCanvas.height, 0, 0);
            grad.addColorStop(0, '#2563eb');
            grad.addColorStop(0.7, '#38bdf8');
            grad.addColorStop(1, '#a855f7');

            sCtx.fillStyle = grad;
            sCtx.fillRect(x, y, barWidth - 1, barHeight);
          }
        }
      }

      // 2. Draw Waveform Oscillogram
      const waveCanvas = waveformCanvasRef.current;
      if (waveCanvas) {
        const wCtx = waveCanvas.getContext('2d');
        if (wCtx) {
          wCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
          wCtx.lineWidth = 1.5;
          wCtx.strokeStyle = '#38bdf8';
          wCtx.beginPath();

          const sliceWidth = waveCanvas.width / 128;
          let x = 0;

          for (let i = 0; i < 128; i++) {
            const v = timeArray[i] / 128.0;
            const y = (v * waveCanvas.height) / 2;

            if (i === 0) wCtx.moveTo(x, y);
            else wCtx.lineTo(x, y);

            x += sliceWidth;
          }

          wCtx.stroke();
        }
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleConfigChange = (updates: Partial<AudioDspConfig>) => {
    const updated = { ...audioDspConfig, ...updates };
    onUpdateProject({ audioDspConfig: updated });
    audioEngine.updateDspConfig(updated);
  };

  const resetDspDefaults = () => {
    const defaults: AudioDspConfig = {
      noiseGateThreshold: -45,
      eqLow: 0,
      eqMid: 1.5,
      eqHigh: 2.0,
      compressorThreshold: -24,
      compressorRatio: 4,
      deEsserFrequency: 6500,
      deEsserAmount: 35,
      pitchShift: 0,
      normalizeLufs: true,
      originalAudioVolume: 0.0,
      swappedVoiceVolume: 1.2,
      muteOriginal: true,
    };
    handleConfigChange(defaults);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-white">AI Studio Audio DSP Rack</h2>
          <p className="text-xs text-slate-400">
            Real-time vocal signal processing, EQ, dynamics compression, de-esser and broadcast normalization
          </p>
        </div>

        <button
          onClick={resetDspDefaults}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Rack</span>
        </button>
      </div>

      {/* Real-Time Analyzers Dual Screen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 64-Band FFT Spectrum */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">64-Band Frequency Spectrum</span>
            <span className="text-[10px] font-mono text-slate-500">20Hz – 20kHz</span>
          </div>
          <canvas
            ref={spectrumCanvasRef}
            width={380}
            height={90}
            className="w-full h-24 bg-slate-950 rounded border border-slate-850"
          />
        </div>

        {/* Real-Time Waveform */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">Vocal Oscilloscope Waveform</span>
            <span className="text-[10px] font-mono text-slate-500">Real-Time RMS</span>
          </div>
          <canvas
            ref={waveformCanvasRef}
            width={380}
            height={90}
            className="w-full h-24 bg-slate-950 rounded border border-slate-850"
          />
        </div>
      </div>

      {/* DSP Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Module 1: 3-Band Parametric Studio EQ */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-blue-400">3-Band Parametric EQ</span>
            <span className="text-[10px] text-slate-500 font-mono">Biquad Filter</span>
          </div>

          {/* Low Shelf (100 Hz) */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Low Warmth (100 Hz)</span>
              <span className="font-mono tabular-nums text-slate-300">
                {audioDspConfig.eqLow > 0 ? `+${audioDspConfig.eqLow.toFixed(1)}` : audioDspConfig.eqLow.toFixed(1)} dB
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={audioDspConfig.eqLow}
              onChange={(e) => handleConfigChange({ eqLow: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Mid Peak (2.5 kHz) */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Mid Clarity (2.5 kHz)</span>
              <span className="font-mono tabular-nums text-slate-300">
                {audioDspConfig.eqMid > 0 ? `+${audioDspConfig.eqMid.toFixed(1)}` : audioDspConfig.eqMid.toFixed(1)} dB
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={audioDspConfig.eqMid}
              onChange={(e) => handleConfigChange({ eqMid: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* High Shelf (10 kHz) */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>High Air & Sheen (10 kHz)</span>
              <span className="font-mono tabular-nums text-slate-300">
                {audioDspConfig.eqHigh > 0 ? `+${audioDspConfig.eqHigh.toFixed(1)}` : audioDspConfig.eqHigh.toFixed(1)} dB
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={audioDspConfig.eqHigh}
              onChange={(e) => handleConfigChange({ eqHigh: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* Module 2: Broadcast Dynamics Compressor */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-purple-400">Dynamics Compressor</span>
            <span className="text-[10px] text-slate-500 font-mono">Broadcast VCA</span>
          </div>

          {/* Threshold */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Threshold</span>
              <span className="font-mono tabular-nums text-slate-300">
                {audioDspConfig.compressorThreshold} dB
              </span>
            </div>
            <input
              type="range"
              min="-40"
              max="0"
              step="1"
              value={audioDspConfig.compressorThreshold}
              onChange={(e) => handleConfigChange({ compressorThreshold: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          {/* Ratio */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Ratio</span>
              <span className="font-mono tabular-nums text-slate-300">
                {audioDspConfig.compressorRatio}:1
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="16"
              step="0.5"
              value={audioDspConfig.compressorRatio}
              onChange={(e) => handleConfigChange({ compressorRatio: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          {/* Vocal De-Esser */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>De-Esser Sibilance Suppressor</span>
              <span className="font-mono tabular-nums text-slate-300">
                {audioDspConfig.deEsserAmount}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={audioDspConfig.deEsserAmount}
              onChange={(e) => handleConfigChange({ deEsserAmount: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-500"
            />
          </div>
        </div>

        {/* Module 3: Pitch & Formant Tuning + Normalizer */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-emerald-400">Master Finishing</span>
            <span className="text-[10px] text-slate-500 font-mono">ITU-R BS.1770</span>
          </div>

          {/* Noise Gate */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Noise Gate Threshold</span>
              <span className="font-mono tabular-nums text-slate-300">
                {audioDspConfig.noiseGateThreshold} dB
              </span>
            </div>
            <input
              type="range"
              min="-60"
              max="-10"
              step="1"
              value={audioDspConfig.noiseGateThreshold}
              onChange={(e) => handleConfigChange({ noiseGateThreshold: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Pitch Shifter */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Pitch Shifter</span>
              <span className="font-mono tabular-nums text-slate-300">
                {audioDspConfig.pitchShift > 0 ? `+${audioDspConfig.pitchShift}` : audioDspConfig.pitchShift} st
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={audioDspConfig.pitchShift}
              onChange={(e) => handleConfigChange({ pitchShift: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Broadcast LUFS Normalizer */}
          <div className="pt-2">
            <label className="flex items-center justify-between cursor-pointer p-2.5 bg-slate-950 rounded border border-slate-800 hover:border-slate-700 transition-colors">
              <div>
                <span className="text-xs font-medium text-slate-200 block">Loudness Normalization</span>
                <span className="text-[10px] text-slate-400 block">-16 LUFS Studio Standard</span>
              </div>
              <input
                type="checkbox"
                checked={audioDspConfig.normalizeLufs}
                onChange={(e) => handleConfigChange({ normalizeLufs: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
