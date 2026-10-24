import { DialogueSegment, VisemeFrame, VoiceProfile } from '../types';

export async function analyzeVoiceSample(audioBase64: string, mimeType: string = 'audio/webm'): Promise<Partial<VoiceProfile>> {
  const res = await fetch('/api/voice/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, mimeType }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to analyze voice');
  }

  const data = await res.json();
  return data.voiceProfile;
}

export async function transcribeAudio(audioBase64: string, mimeType: string = 'audio/webm'): Promise<{
  fullTranscript: string;
  segments: DialogueSegment[];
}> {
  const res = await fetch('/api/voice/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, mimeType }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to transcribe speech');
  }

  return await res.json();
}

export async function swapVoiceSpeech(params: {
  text: string;
  voiceName: string;
  styleDescription: string;
  pitchAdjust?: number;
}): Promise<{ audioBase64: string; mimeType: string; voiceUsed: string }> {
  const res = await fetch('/api/voice/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to synthesize swapped voice');
  }

  return await res.json();
}

export async function analyzeLipSync(transcript: string, duration: number): Promise<{ visemeFrames: VisemeFrame[] }> {
  const res = await fetch('/api/lipsync/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, duration }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to calculate lip-sync');
  }

  return await res.json();
}
