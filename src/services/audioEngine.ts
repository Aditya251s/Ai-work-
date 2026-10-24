import { AudioDspConfig } from '../types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private eqLowNode: BiquadFilterNode | null = null;
  private eqMidNode: BiquadFilterNode | null = null;
  private eqHighNode: BiquadFilterNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private voiceGainNode: GainNode | null = null;
  private videoGainNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  private voiceAudioElement: HTMLAudioElement | null = null;
  private voiceMediaSource: MediaElementAudioSourceNode | null = null;

  private videoAudioElement: HTMLVideoElement | null = null;
  private videoMediaSource: MediaElementAudioSourceNode | null = null;

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Analyser
      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Master Gain
      this.masterGainNode = this.ctx.createGain();
      this.masterGainNode.gain.value = 1.0;

      // EQ Nodes for Voice
      this.eqLowNode = this.ctx.createBiquadFilter();
      this.eqLowNode.type = 'lowshelf';
      this.eqLowNode.frequency.value = 100;

      this.eqMidNode = this.ctx.createBiquadFilter();
      this.eqMidNode.type = 'peaking';
      this.eqMidNode.frequency.value = 2500;
      this.eqMidNode.Q.value = 1.2;

      this.eqHighNode = this.ctx.createBiquadFilter();
      this.eqHighNode.type = 'highshelf';
      this.eqHighNode.frequency.value = 10000;

      // Dynamics Compressor
      this.compressorNode = this.ctx.createDynamicsCompressor();
      this.compressorNode.threshold.value = -24;
      this.compressorNode.knee.value = 30;
      this.compressorNode.ratio.value = 4;
      this.compressorNode.attack.value = 0.003;
      this.compressorNode.release.value = 0.25;

      // Voice Gain
      this.voiceGainNode = this.ctx.createGain();
      this.voiceGainNode.gain.value = 1.0;

      // Video Original Audio Gain
      this.videoGainNode = this.ctx.createGain();
      this.videoGainNode.gain.value = 0.0; // Default mute original speech when voice swapped

      // Voice DSP chain: Source -> EQLow -> EQMid -> EQHigh -> Compressor -> VoiceGain -> Master -> Analyser -> Destination
      this.eqLowNode.connect(this.eqMidNode);
      this.eqMidNode.connect(this.eqHighNode);
      this.eqHighNode.connect(this.compressorNode);
      this.compressorNode.connect(this.voiceGainNode);
      this.voiceGainNode.connect(this.masterGainNode);

      // Video chain: VideoSource -> VideoGain -> Master
      this.videoGainNode.connect(this.masterGainNode);

      // Master to Analyser to Destination
      this.masterGainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public attachVoiceAudio(audioEl: HTMLAudioElement) {
    this.init();
    if (!this.ctx || !this.eqLowNode) return;
    if (this.voiceAudioElement === audioEl && this.voiceMediaSource) return;

    try {
      this.voiceAudioElement = audioEl;
      this.voiceMediaSource = this.ctx.createMediaElementSource(audioEl);
      this.voiceMediaSource.connect(this.eqLowNode);
    } catch {
      // Element may already be connected
    }
  }

  public attachVideoAudio(videoEl: HTMLVideoElement) {
    this.init();
    if (!this.ctx || !this.videoGainNode) return;
    if (this.videoAudioElement === videoEl && this.videoMediaSource) return;

    try {
      this.videoAudioElement = videoEl;
      this.videoMediaSource = this.ctx.createMediaElementSource(videoEl);
      this.videoMediaSource.connect(this.videoGainNode);
    } catch {
      // Element may already be connected
    }
  }

  public updateDspConfig(config: AudioDspConfig) {
    if (!this.ctx) return;

    if (this.eqLowNode) {
      this.eqLowNode.gain.setTargetAtTime(config.eqLow, this.ctx.currentTime, 0.05);
    }
    if (this.eqMidNode) {
      this.eqMidNode.gain.setTargetAtTime(config.eqMid, this.ctx.currentTime, 0.05);
    }
    if (this.eqHighNode) {
      this.eqHighNode.gain.setTargetAtTime(config.eqHigh, this.ctx.currentTime, 0.05);
    }
    if (this.compressorNode) {
      this.compressorNode.threshold.setTargetAtTime(config.compressorThreshold, this.ctx.currentTime, 0.05);
      this.compressorNode.ratio.setTargetAtTime(config.compressorRatio, this.ctx.currentTime, 0.05);
    }
    if (this.voiceGainNode) {
      this.voiceGainNode.gain.setTargetAtTime(config.swappedVoiceVolume, this.ctx.currentTime, 0.05);
    }
    if (this.videoGainNode) {
      const vol = config.muteOriginal ? 0 : config.originalAudioVolume;
      this.videoGainNode.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
    }
  }

  public getEnergyLevel(): number {
    if (!this.analyserNode) return 0;
    const buffer = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteTimeDomainData(buffer);

    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      const normalized = (buffer[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / buffer.length);
    return Math.min(1, rms * 3.5); // scale to responsive 0..1
  }

  public getFrequencySpectrum(outputArray: Uint8Array<ArrayBuffer>) {
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(outputArray as any);
    }
  }

  public getWaveform(outputArray: Uint8Array<ArrayBuffer>) {
    if (this.analyserNode) {
      this.analyserNode.getByteTimeDomainData(outputArray as any);
    }
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public getMasterDestination(): AudioNode | null {
    return this.analyserNode;
  }
}

export const audioEngine = new AudioEngine();

// Base64 to ArrayBuffer helper
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert AudioBuffer to WAV Blob
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sample = 0;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit precision

  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4); // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}
