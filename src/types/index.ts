export interface VoiceProfile {
  id: string;
  name: string;
  genderEstimate: 'male' | 'female' | 'neutral';
  fundamentalPitchHz: number;
  timbre: 'warm' | 'crisp' | 'deep' | 'bright' | 'husky' | 'smooth';
  speakingRateWpm: number;
  suggestedPrebuiltVoice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  pitchFineTuneSemitones: number;
  formantShift: number;
  resonanceFactor: number;
  clarityScore: number;
  description: string;
  stylePrompt: string;
  sampleAudioUrl?: string;
  sampleAudioBase64?: string;
  createdAt: number;
}

export interface DialogueSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker: string;
  swappedAudioUrl?: string;
  swappedAudioBase64?: string;
  isMuted?: boolean;
}

export type VisemeType =
  | 'silence'
  | 'AA'
  | 'EE'
  | 'OH'
  | 'OO'
  | 'MM'
  | 'FF'
  | 'TH';

export interface VisemeFrame {
  time: number;
  viseme: VisemeType;
  intensity: number;
}

export interface MouthRegion {
  centerX: number; // 0 to 1
  centerY: number; // 0 to 1
  width: number; // 0 to 1
  height: number; // 0 to 1
  rotation: number;
}

export interface LipSyncConfig {
  mouthRegion: MouthRegion;
  sensitivity: number; // 0.5 - 2.0
  jawOpenScale: number; // 0.5 - 2.5
  smoothing: number; // 0.1 - 0.9
  audioOffsetMs: number; // -500 to 500 ms
  blendMode: 'warp' | 'viseme_overlay' | 'neural_mesh';
  showAnchorWireframe: boolean;
}

export interface AudioDspConfig {
  noiseGateThreshold: number; // -60 to -10 dB
  eqLow: number; // -12 to +12 dB (100 Hz)
  eqMid: number; // -12 to +12 dB (2.5 kHz)
  eqHigh: number; // -12 to +12 dB (10 kHz)
  compressorThreshold: number; // -40 to 0 dB
  compressorRatio: number; // 1 to 20
  deEsserFrequency: number; // 4000 to 9000 Hz
  deEsserAmount: number; // 0 to 100%
  pitchShift: number; // -12 to +12 semitones
  normalizeLufs: boolean;
  originalAudioVolume: number; // 0 to 1.5
  swappedVoiceVolume: number; // 0 to 2.0
  muteOriginal: boolean;
}

export interface Project {
  id: string;
  title: string;
  videoUrl: string;
  videoPoster?: string;
  videoType: 'custom' | 'sample_interview' | 'sample_podcast';
  videoDuration: number;
  userVoiceProfileId: string;
  transcript: string;
  segments: DialogueSegment[];
  visemeFrames: VisemeFrame[];
  lipSyncConfig: LipSyncConfig;
  audioDspConfig: AudioDspConfig;
  customVoiceAudioUrl?: string;
  customVoiceAudioBase64?: string;
  lastModified: number;
}

export interface ExportProgress {
  isExporting: boolean;
  progressPercent: number;
  currentStep: string;
  exportedBlobUrl?: string;
  exportedFilename?: string;
}
