import { Project, VoiceProfile } from '../types';

const STORAGE_PROJECTS_KEY = 'syncvoice_projects_v1';
const STORAGE_VOICES_KEY = 'syncvoice_voices_v1';
const STORAGE_CURRENT_PROJECT_ID = 'syncvoice_current_project_id';

export const DEFAULT_VOICE_PROFILES: VoiceProfile[] = [
  {
    id: 'voice-profile-user-primary',
    name: 'My Studio Voice',
    genderEstimate: 'neutral',
    fundamentalPitchHz: 168,
    timbre: 'warm',
    speakingRateWpm: 145,
    suggestedPrebuiltVoice: 'Kore',
    pitchFineTuneSemitones: 0,
    formantShift: 0,
    resonanceFactor: 1.0,
    clarityScore: 94,
    description: 'Balanced studio profile with warm presence, subtle low-mid resonance, and clean articulation.',
    stylePrompt: 'Professional, warm, clear and articulate natural tone with confident cadence',
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'voice-profile-deep-narrator',
    name: 'Cinematic Narrator',
    genderEstimate: 'male',
    fundamentalPitchHz: 110,
    timbre: 'deep',
    speakingRateWpm: 130,
    suggestedPrebuiltVoice: 'Fenrir',
    pitchFineTuneSemitones: -2,
    formantShift: -0.3,
    resonanceFactor: 1.25,
    clarityScore: 96,
    description: 'Resonant, cinematic chest voice suited for documentaries, trailers, and dramatic storytelling.',
    stylePrompt: 'Deep, calm, resonant and authoritative documentary narrator voice',
    createdAt: Date.now() - 43200000,
  },
  {
    id: 'voice-profile-energetic-host',
    name: 'Dynamic Presenter',
    genderEstimate: 'female',
    fundamentalPitchHz: 215,
    timbre: 'bright',
    speakingRateWpm: 160,
    suggestedPrebuiltVoice: 'Puck',
    pitchFineTuneSemitones: 1,
    formantShift: 0.2,
    resonanceFactor: 1.1,
    clarityScore: 93,
    description: 'Upbeat, articulate persona with quick syllable response and bright presence.',
    stylePrompt: 'Energetic, cheerful, articulate tech keynote host speaking with enthusiasm',
    createdAt: Date.now() - 21600000,
  },
];

export const DEFAULT_STARTER_PROJECTS: Project[] = [
  {
    id: 'proj-starter-speaker',
    title: 'Executive Studio Speech - Voice Swap & Lip Sync',
    videoUrl: '/src/assets/images/speaker_interview_studio_1792824069663.jpg',
    videoPoster: '/src/assets/images/speaker_interview_studio_1792824069663.jpg',
    videoType: 'sample_interview',
    videoDuration: 10.5,
    userVoiceProfileId: 'voice-profile-user-primary',
    transcript: 'Welcome everyone. Today we are demonstrating how real-time AI can swap voices seamlessly and maintain exact lip synchronization without limits.',
    segments: [
      {
        id: 'seg-1',
        text: 'Welcome everyone.',
        startTime: 0.2,
        endTime: 1.8,
        speaker: 'Speaker',
      },
      {
        id: 'seg-2',
        text: 'Today we are demonstrating how real-time AI can swap voices seamlessly...',
        startTime: 2.1,
        endTime: 5.9,
        speaker: 'Speaker',
      },
      {
        id: 'seg-3',
        text: '...and maintain exact lip synchronization without limits.',
        startTime: 6.2,
        endTime: 9.8,
        speaker: 'Speaker',
      },
    ],
    visemeFrames: [
      { time: 0.2, viseme: 'silence', intensity: 0 },
      { time: 0.4, viseme: 'OO', intensity: 0.7 },
      { time: 0.7, viseme: 'EE', intensity: 0.8 },
      { time: 1.1, viseme: 'AA', intensity: 0.9 },
      { time: 1.4, viseme: 'MM', intensity: 0.6 },
      { time: 1.8, viseme: 'silence', intensity: 0 },
      { time: 2.1, viseme: 'TH', intensity: 0.7 },
      { time: 2.4, viseme: 'OH', intensity: 0.85 },
      { time: 2.8, viseme: 'EE', intensity: 0.8 },
      { time: 3.2, viseme: 'AA', intensity: 0.95 },
      { time: 3.7, viseme: 'FF', intensity: 0.7 },
      { time: 4.2, viseme: 'EE', intensity: 0.8 },
      { time: 4.8, viseme: 'OO', intensity: 0.85 },
      { time: 5.3, viseme: 'AA', intensity: 0.9 },
      { time: 5.9, viseme: 'silence', intensity: 0 },
      { time: 6.2, viseme: 'AA', intensity: 0.85 },
      { time: 6.8, viseme: 'MM', intensity: 0.75 },
      { time: 7.3, viseme: 'EE', intensity: 0.8 },
      { time: 7.9, viseme: 'OH', intensity: 0.9 },
      { time: 8.5, viseme: 'TH', intensity: 0.85 },
      { time: 9.2, viseme: 'AA', intensity: 0.95 },
      { time: 9.8, viseme: 'silence', intensity: 0 },
    ],
    lipSyncConfig: {
      mouthRegion: {
        centerX: 0.508,
        centerY: 0.485,
        width: 0.17,
        height: 0.13,
        rotation: 0,
      },
      sensitivity: 1.25,
      jawOpenScale: 1.35,
      smoothing: 0.35,
      audioOffsetMs: 0,
      blendMode: 'warp',
      showAnchorWireframe: true,
    },
    audioDspConfig: {
      noiseGateThreshold: -42,
      eqLow: 1.5,
      eqMid: 2.0,
      eqHigh: 2.5,
      compressorThreshold: -22,
      compressorRatio: 4,
      deEsserFrequency: 6500,
      deEsserAmount: 40,
      pitchShift: 0,
      normalizeLufs: true,
      originalAudioVolume: 0.0,
      swappedVoiceVolume: 1.2,
      muteOriginal: true,
    },
    lastModified: Date.now(),
  },
  {
    id: 'proj-starter-podcast',
    title: 'Broadcast Studio Podcast - Live Dub',
    videoUrl: '/src/assets/images/podcast_host_studio_1792824069992.jpg',
    videoPoster: '/src/assets/images/podcast_host_studio_1792824069992.jpg',
    videoType: 'sample_podcast',
    videoDuration: 8.4,
    userVoiceProfileId: 'voice-profile-user-primary',
    transcript: 'Check this out! With our AI pipeline, anyone can replace dialogue in seconds with their own recorded voice.',
    segments: [
      {
        id: 'seg-p1',
        text: 'Check this out!',
        startTime: 0.2,
        endTime: 1.7,
        speaker: 'Host',
      },
      {
        id: 'seg-p2',
        text: 'With our AI pipeline, anyone can replace dialogue in seconds...',
        startTime: 2.0,
        endTime: 5.4,
        speaker: 'Host',
      },
      {
        id: 'seg-p3',
        text: '...with their own recorded voice.',
        startTime: 5.6,
        endTime: 7.9,
        speaker: 'Host',
      },
    ],
    visemeFrames: [
      { time: 0.2, viseme: 'TH', intensity: 0.7 },
      { time: 0.6, viseme: 'EE', intensity: 0.8 },
      { time: 1.1, viseme: 'OH', intensity: 0.9 },
      { time: 1.7, viseme: 'silence', intensity: 0 },
      { time: 2.0, viseme: 'OO', intensity: 0.8 },
      { time: 2.5, viseme: 'AA', intensity: 0.9 },
      { time: 3.1, viseme: 'FF', intensity: 0.75 },
      { time: 3.8, viseme: 'EE', intensity: 0.85 },
      { time: 4.5, viseme: 'OH', intensity: 0.9 },
      { time: 5.4, viseme: 'silence', intensity: 0 },
      { time: 5.6, viseme: 'TH', intensity: 0.7 },
      { time: 6.2, viseme: 'OH', intensity: 0.9 },
      { time: 6.9, viseme: 'EE', intensity: 0.8 },
      { time: 7.5, viseme: 'AA', intensity: 0.95 },
      { time: 7.9, viseme: 'silence', intensity: 0 },
    ],
    lipSyncConfig: {
      mouthRegion: {
        centerX: 0.505,
        centerY: 0.388,
        width: 0.16,
        height: 0.125,
        rotation: 0,
      },
      sensitivity: 1.3,
      jawOpenScale: 1.4,
      smoothing: 0.3,
      audioOffsetMs: 0,
      blendMode: 'warp',
      showAnchorWireframe: true,
    },
    audioDspConfig: {
      noiseGateThreshold: -45,
      eqLow: 2.5,
      eqMid: 1.5,
      eqHigh: 3.0,
      compressorThreshold: -20,
      compressorRatio: 5,
      deEsserFrequency: 7000,
      deEsserAmount: 50,
      pitchShift: 0,
      normalizeLufs: true,
      originalAudioVolume: 0.0,
      swappedVoiceVolume: 1.25,
      muteOriginal: true,
    },
    lastModified: Date.now() - 10000,
  },
];

export function getStoredProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
    if (!raw) {
      saveProjects(DEFAULT_STARTER_PROJECTS);
      return DEFAULT_STARTER_PROJECTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_STARTER_PROJECTS;
  } catch {
    return DEFAULT_STARTER_PROJECTS;
  }
}

export function saveProjects(projects: Project[]) {
  try {
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects to localStorage:', e);
  }
}

export function getStoredVoiceProfiles(): VoiceProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_VOICES_KEY);
    if (!raw) {
      saveVoiceProfiles(DEFAULT_VOICE_PROFILES);
      return DEFAULT_VOICE_PROFILES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_VOICE_PROFILES;
  } catch {
    return DEFAULT_VOICE_PROFILES;
  }
}

export function saveVoiceProfiles(profiles: VoiceProfile[]) {
  try {
    localStorage.setItem(STORAGE_VOICES_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error('Failed to save voice profiles to localStorage:', e);
  }
}

export function getActiveProjectId(): string {
  return localStorage.getItem(STORAGE_CURRENT_PROJECT_ID) || DEFAULT_STARTER_PROJECTS[0].id;
}

export function setActiveProjectId(id: string) {
  localStorage.setItem(STORAGE_CURRENT_PROJECT_ID, id);
}
