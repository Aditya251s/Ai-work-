import React, { useState, useRef } from 'react';
import { VoiceProfile } from '../types';
import { analyzeVoiceSample, swapVoiceSpeech } from '../services/geminiService';
import { Mic, Upload, Play, Square, Sparkles, Check, X, Volume2, RefreshCw, Trash2, Plus } from 'lucide-react';

interface VoiceProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceProfiles: VoiceProfile[];
  activeVoiceId: string;
  onSelectVoice: (id: string) => void;
  onSaveVoice: (profile: VoiceProfile) => void;
  onDeleteVoice: (id: string) => void;
}

export const VoiceProfileModal: React.FC<VoiceProfileModalProps> = ({
  isOpen,
  onClose,
  voiceProfiles,
  activeVoiceId,
  onSelectVoice,
  onSaveVoice,
  onDeleteVoice,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'record' | 'upload' | 'profiles'>('record');
  const [editingProfile, setEditingProfile] = useState<VoiceProfile>(
    voiceProfiles.find((v) => v.id === activeVoiceId) || voiceProfiles[0]
  );

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(editingProfile.sampleAudioUrl || null);
  const [recordedAudioBase64, setRecordedAudioBase64] = useState<string | null>(editingProfile.sampleAudioBase64 || null);

  // Processing & Testing State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const handleStartRecording = async () => {
    try {
      setStatusMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);

        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setRecordedAudioBase64(base64data);
        };

        // stop mic tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setStatusMessage('Microphone access denied or unavailable: ' + err.message);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setRecordedAudioUrl(url);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      setRecordedAudioBase64(base64data);
      setStatusMessage(`Uploaded "${file.name}" ready for AI voice analysis.`);
    };
  };

  const handleRunAiAnalysis = async () => {
    if (!recordedAudioBase64) {
      setStatusMessage('Please record or upload a voice sample first.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setStatusMessage('Analyzing acoustic timbre, pitch harmonics, and pacing with Gemini AI...');
      const analysis = await analyzeVoiceSample(recordedAudioBase64);

      setEditingProfile((prev) => ({
        ...prev,
        ...analysis,
        sampleAudioUrl: recordedAudioUrl || undefined,
        sampleAudioBase64: recordedAudioBase64 || undefined,
      }));

      setStatusMessage('Voice analysis complete! Voice profile calibrated.');
    } catch (err: any) {
      setStatusMessage('Analysis warning: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTestVoiceSynthesis = async () => {
    try {
      setIsTestingVoice(true);
      setStatusMessage('Generating voice test clip using calibrated profile...');
      const sampleText = `Hello! This is a real-time sample of my voice generated with SyncVoice Studio.`;

      const result = await swapVoiceSpeech({
        text: sampleText,
        voiceName: editingProfile.suggestedPrebuiltVoice,
        styleDescription: editingProfile.stylePrompt,
        pitchAdjust: editingProfile.pitchFineTuneSemitones,
      });

      const audioSrc = `data:audio/wav;base64,${result.audioBase64}`;
      setTestAudioUrl(audioSrc);
      const audio = new Audio(audioSrc);
      audio.play();
      setStatusMessage('Playing voice test sample.');
    } catch (err: any) {
      setStatusMessage('Test synthesis error: ' + err.message);
    } finally {
      setIsTestingVoice(false);
    }
  };

  const handleSaveAndApply = () => {
    onSaveVoice(editingProfile);
    onSelectVoice(editingProfile.id);
    onClose();
  };

  const handleCreateNewProfile = () => {
    const newProfile: VoiceProfile = {
      id: 'voice-' + Date.now(),
      name: `Custom Voice ${voiceProfiles.length + 1}`,
      genderEstimate: 'neutral',
      fundamentalPitchHz: 160,
      timbre: 'warm',
      speakingRateWpm: 140,
      suggestedPrebuiltVoice: 'Kore',
      pitchFineTuneSemitones: 0,
      formantShift: 0,
      resonanceFactor: 1.0,
      clarityScore: 90,
      description: 'Personalized voice clone profile.',
      stylePrompt: 'Natural, clear and authentic speaking style.',
      createdAt: Date.now(),
    };
    setEditingProfile(newProfile);
    setRecordedAudioUrl(null);
    setRecordedAudioBase64(null);
    setStatusMessage('Created new voice profile draft. Record or upload your voice to calibrate.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Voice Profile & AI Calibration</h2>
              <p className="text-xs text-slate-400">Record or upload your voice to swap any video dialogue into your voice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/60 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('record')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'record'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Record My Voice</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Voice Audio</span>
            </button>
            <button
              onClick={() => setActiveTab('profiles')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'profiles'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Saved Profiles ({voiceProfiles.length})</span>
            </button>
          </div>

          <button
            onClick={handleCreateNewProfile}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Profile</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'profiles' ? (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Your Voice Profiles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {voiceProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className={`p-4 rounded-lg border transition-all text-left flex flex-col justify-between ${
                      profile.id === editingProfile.id
                        ? 'bg-slate-800/90 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-slate-800/40 border-slate-700/80 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-sm text-white">{profile.name}</span>
                        {profile.id === activeVoiceId && (
                          <span className="text-[10px] text-blue-400 font-medium">ACTIVE</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-3">{profile.description}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                        <span>{profile.timbre}</span>
                        <span>·</span>
                        <span>{profile.fundamentalPitchHz} Hz</span>
                        <span>·</span>
                        <span>{profile.suggestedPrebuiltVoice}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50">
                      <button
                        onClick={() => {
                          setEditingProfile(profile);
                          setActiveTab('record');
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Edit & Tune
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onSelectVoice(profile.id);
                            setEditingProfile(profile);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 rounded"
                        >
                          Select
                        </button>
                        {voiceProfiles.length > 1 && (
                          <button
                            onClick={() => onDeleteVoice(profile.id)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                            title="Delete profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Record / Upload Area */}
              <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {activeTab === 'record' ? 'Record Voice Sample' : 'Upload Audio Sample'}
                  </span>
                  <span className="text-xs text-slate-500">
                    Speak clearly for 5–15 seconds for optimal pitch & timbre analysis
                  </span>
                </div>

                {activeTab === 'record' ? (
                  <div className="flex flex-col items-center justify-center py-6 space-y-4">
                    <div className="text-2xl font-mono tabular-nums text-slate-200 font-medium">
                      00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                    </div>

                    {!isRecording ? (
                      <button
                        onClick={handleStartRecording}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-full shadow-lg transition-all"
                      >
                        <Mic className="w-4 h-4" />
                        <span>Start Recording</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleStopRecording}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-red-500/50 rounded-full shadow-lg transition-all"
                      >
                        <Square className="w-4 h-4 text-red-500" />
                        <span>Stop Recording</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-800 rounded-lg">
                    <Upload className="w-8 h-8 text-slate-500 mb-2" />
                    <label className="cursor-pointer px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors">
                      <span>Choose Audio File (WAV, MP3, M4A)</span>
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                )}

                {/* Sample playback & Run AI Analysis */}
                {recordedAudioUrl && (
                  <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <audio controls src={recordedAudioUrl} className="h-8 max-w-xs" />
                      <span className="text-xs text-emerald-400 font-medium">Voice Sample Captured</span>
                    </div>

                    <button
                      onClick={handleRunAiAnalysis}
                      disabled={isAnalyzing}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-md transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Analyzing Acoustics...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Analyze Voice with AI</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div className="text-xs p-3 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                  {statusMessage}
                </div>
              )}

              {/* Profile Calibration Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Profile Name & Description */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Profile Name</label>
                    <input
                      type="text"
                      value={editingProfile.name}
                      onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-md text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Base AI Voice Model</label>
                    <select
                      value={editingProfile.suggestedPrebuiltVoice}
                      onChange={(e) =>
                        setEditingProfile({
                          ...editingProfile,
                          suggestedPrebuiltVoice: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-md text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="Kore">Kore (Warm, Balanced Studio)</option>
                      <option value="Fenrir">Fenrir (Deep, Cinematic Chest Voice)</option>
                      <option value="Puck">Puck (Dynamic, Expressive Syllables)</option>
                      <option value="Charon">Charon (Authoritative, Broadcast Baritone)</option>
                      <option value="Zephyr">Zephyr (Clear, High Articulation)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Persona Style Prompt</label>
                    <textarea
                      rows={2}
                      value={editingProfile.stylePrompt}
                      onChange={(e) => setEditingProfile({ ...editingProfile, stylePrompt: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-100 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. Natural, confident, articulate speaking style with warm cadence"
                    />
                  </div>
                </div>

                {/* Acoustic Fine-Tuning */}
                <div className="space-y-4 bg-slate-950/40 p-4 border border-slate-800/80 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Acoustic Fine-Tuning</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      F0: {editingProfile.fundamentalPitchHz} Hz · {editingProfile.timbre}
                    </span>
                  </div>

                  {/* Pitch Fine Tune */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Pitch Offset</span>
                      <span className="font-mono tabular-nums text-slate-300">
                        {editingProfile.pitchFineTuneSemitones > 0 ? `+${editingProfile.pitchFineTuneSemitones}` : editingProfile.pitchFineTuneSemitones} st
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-6"
                      max="6"
                      step="1"
                      value={editingProfile.pitchFineTuneSemitones}
                      onChange={(e) =>
                        setEditingProfile({
                          ...editingProfile,
                          pitchFineTuneSemitones: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Resonance Factor */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Vocal Resonance Factor</span>
                      <span className="font-mono tabular-nums text-slate-300">
                        {editingProfile.resonanceFactor.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={editingProfile.resonanceFactor}
                      onChange={(e) =>
                        setEditingProfile({
                          ...editingProfile,
                          resonanceFactor: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Test synthesis button */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      onClick={handleTestVoiceSynthesis}
                      disabled={isTestingVoice}
                      className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors disabled:opacity-50"
                    >
                      {isTestingVoice ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                          <span>Test Voice Speech</span>
                        </>
                      )}
                    </button>
                    {testAudioUrl && (
                      <span className="text-[11px] text-emerald-400">Sample ready</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-t border-slate-800">
          <div className="text-xs text-slate-500">
            Unlimited voice profiles · Stored locally · No credits deducted
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndApply}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md shadow transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Save & Apply Voice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
