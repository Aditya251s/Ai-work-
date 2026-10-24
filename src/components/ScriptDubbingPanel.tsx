import React, { useState } from 'react';
import { Project, DialogueSegment, VoiceProfile } from '../types';
import { swapVoiceSpeech, analyzeLipSync } from '../services/geminiService';
import {
  Mic,
  Sparkles,
  Play,
  Square,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Volume2,
  Check,
  Clock,
  ArrowRight
} from 'lucide-react';

interface ScriptDubbingPanelProps {
  project: Project;
  onUpdateProject: (updated: Partial<Project>) => void;
  activeVoice: VoiceProfile;
  onPreviewAudio: (audioUrl: string) => void;
}

export const ScriptDubbingPanel: React.FC<ScriptDubbingPanelProps> = ({
  project,
  onUpdateProject,
  activeVoice,
  onPreviewAudio,
}) => {
  const [isSwappingAll, setIsSwappingAll] = useState(false);
  const [swappingSegmentId, setSwappingSegmentId] = useState<string | null>(null);
  const [recordingSegmentId, setRecordingSegmentId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Line-by-line Recording
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);

  // Batch Voice Swap: Swap all lines with User's Voice Profile
  const handleSwapAllVoices = async () => {
    try {
      setIsSwappingAll(true);
      setStatusMessage(`Synthesizing all ${project.segments.length} dialogue lines using "${activeVoice.name}"...`);

      const updatedSegments: DialogueSegment[] = [];
      const combinedAudioBlobs: string[] = [];

      for (let i = 0; i < project.segments.length; i++) {
        const seg = project.segments[i];
        setStatusMessage(`Synthesizing line ${i + 1}/${project.segments.length}: "${seg.text.slice(0, 30)}..."`);

        const result = await swapVoiceSpeech({
          text: seg.text,
          voiceName: activeVoice.suggestedPrebuiltVoice,
          styleDescription: activeVoice.stylePrompt,
          pitchAdjust: activeVoice.pitchFineTuneSemitones,
        });

        const audioUrl = `data:audio/wav;base64,${result.audioBase64}`;
        updatedSegments.push({
          ...seg,
          swappedAudioUrl: audioUrl,
          swappedAudioBase64: result.audioBase64,
        });
        combinedAudioBlobs.push(result.audioBase64);
      }

      // Generate Lip-Sync visemes
      setStatusMessage('Calculating frame-accurate 60fps lip-sync visemes...');
      const fullTranscript = updatedSegments.map((s) => s.text).join(' ');
      const lipSyncResult = await analyzeLipSync(fullTranscript, project.videoDuration);

      onUpdateProject({
        segments: updatedSegments,
        visemeFrames: lipSyncResult.visemeFrames,
        customVoiceAudioUrl: updatedSegments[0]?.swappedAudioUrl,
        lastModified: Date.now(),
      });

      setStatusMessage('All dialogue successfully swapped into your voice with aligned lip sync!');
    } catch (err: any) {
      setStatusMessage('Voice swap error: ' + err.message);
    } finally {
      setIsSwappingAll(false);
    }
  };

  // Swap Single Line
  const handleSwapSingleLine = async (segment: DialogueSegment) => {
    try {
      setSwappingSegmentId(segment.id);
      setStatusMessage(`Synthesizing line with "${activeVoice.name}"...`);

      const result = await swapVoiceSpeech({
        text: segment.text,
        voiceName: activeVoice.suggestedPrebuiltVoice,
        styleDescription: activeVoice.stylePrompt,
        pitchAdjust: activeVoice.pitchFineTuneSemitones,
      });

      const audioUrl = `data:audio/wav;base64,${result.audioBase64}`;

      const updatedSegments = project.segments.map((s) =>
        s.id === segment.id
          ? {
              ...s,
              swappedAudioUrl: audioUrl,
              swappedAudioBase64: result.audioBase64,
            }
          : s
      );

      onUpdateProject({
        segments: updatedSegments,
        customVoiceAudioUrl: audioUrl,
        lastModified: Date.now(),
      });

      onPreviewAudio(audioUrl);
      setStatusMessage(`Line swapped and loaded into project timeline.`);
    } catch (err: any) {
      setStatusMessage('Voice swap error: ' + err.message);
    } finally {
      setSwappingSegmentId(null);
    }
  };

  // Record with Mic for a specific line
  const handleStartLineRecord = async (segmentId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64 = (reader.result as string).replace(/^data:audio\/[a-zA-Z0-9]+;base64,/, '');
          const updated = project.segments.map((s) =>
            s.id === segmentId
              ? {
                  ...s,
                  swappedAudioUrl: url,
                  swappedAudioBase64: base64,
                }
              : s
          );
          onUpdateProject({ segments: updated, customVoiceAudioUrl: url });
        };

        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setRecordingSegmentId(segmentId);
    } catch (err: any) {
      setStatusMessage('Microphone access denied: ' + err.message);
    }
  };

  const handleStopLineRecord = () => {
    if (mediaRecorderRef.current && recordingSegmentId) {
      mediaRecorderRef.current.stop();
      setRecordingSegmentId(null);
    }
  };

  // Upload Audio for a specific line
  const handleLineAudioUpload = (segmentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64 = (reader.result as string).replace(/^data:audio\/[a-zA-Z0-9]+;base64,/, '');
      const updated = project.segments.map((s) =>
        s.id === segmentId
          ? {
              ...s,
              swappedAudioUrl: url,
              swappedAudioBase64: base64,
            }
          : s
      );
      onUpdateProject({ segments: updated, customVoiceAudioUrl: url });
      setStatusMessage(`Audio uploaded for segment.`);
    };
  };

  const handleTextChange = (id: string, text: string) => {
    const updated = project.segments.map((s) => (s.id === id ? { ...s, text } : s));
    onUpdateProject({ segments: updated });
  };

  const handleTimeChange = (id: string, field: 'startTime' | 'endTime', val: number) => {
    const updated = project.segments.map((s) => (s.id === id ? { ...s, [field]: Math.max(0, val) } : s));
    onUpdateProject({ segments: updated });
  };

  const handleAddSegment = () => {
    const lastSeg = project.segments[project.segments.length - 1];
    const newStart = lastSeg ? lastSeg.endTime + 0.2 : 0;
    const newSeg: DialogueSegment = {
      id: 'seg-' + Date.now(),
      text: 'New dialogue line here...',
      startTime: parseFloat(newStart.toFixed(2)),
      endTime: parseFloat((newStart + 2.5).toFixed(2)),
      speaker: 'Speaker',
    };
    onUpdateProject({ segments: [...project.segments, newSeg] });
  };

  const handleDeleteSegment = (id: string) => {
    if (project.segments.length <= 1) return;
    const updated = project.segments.filter((s) => s.id !== id);
    onUpdateProject({ segments: updated });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* Script Header Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-white">Script & Dubbing Director</h3>
          <p className="text-xs text-slate-400">
            Edit dialogue lines, swap voices with your profile, or record custom audio takes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAddSegment}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Line</span>
          </button>

          <button
            onClick={handleSwapAllVoices}
            disabled={isSwappingAll}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded shadow-sm transition-colors disabled:opacity-50"
          >
            {isSwappingAll ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Processing All Lines...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Swap All with My Voice</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="px-6 py-2 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-300 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-slate-500 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Dialogue Lines List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {project.segments.map((seg, index) => {
          const isRecording = recordingSegmentId === seg.id;
          const isSwapping = swappingSegmentId === seg.id;

          return (
            <div
              key={seg.id}
              className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500 font-semibold">
                    #{index + 1}
                  </span>
                  <input
                    type="text"
                    value={seg.speaker}
                    onChange={(e) => {
                      const updated = project.segments.map((s) =>
                        s.id === seg.id ? { ...s, speaker: e.target.value } : s
                      );
                      onUpdateProject({ segments: updated });
                    }}
                    className="px-2 py-0.5 text-xs bg-slate-950 border border-slate-800 rounded text-slate-300 w-24 font-medium focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-slate-600">·</span>
                  {/* Timecodes */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono tabular-nums">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <input
                      type="number"
                      step="0.1"
                      value={seg.startTime}
                      onChange={(e) => handleTimeChange(seg.id, 'startTime', parseFloat(e.target.value) || 0)}
                      className="w-14 px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-slate-200 text-center"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      step="0.1"
                      value={seg.endTime}
                      onChange={(e) => handleTimeChange(seg.id, 'endTime', parseFloat(e.target.value) || 0)}
                      className="w-14 px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-slate-200 text-center"
                    />
                    <span>s</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {seg.swappedAudioUrl && (
                    <button
                      onClick={() => onPreviewAudio(seg.swappedAudioUrl!)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-400 bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-800/60 rounded transition-colors"
                      title="Play swapped audio take"
                    >
                      <Play className="w-3 h-3" />
                      <span>Play Dub</span>
                    </button>
                  )}

                  {project.segments.length > 1 && (
                    <button
                      onClick={() => handleDeleteSegment(seg.id)}
                      className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                      title="Delete segment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Dialogue Textarea */}
              <textarea
                rows={2}
                value={seg.text}
                onChange={(e) => handleTextChange(seg.id, e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-md text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              />

              {/* Action Buttons for this line */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-xs">
                  {/* AI Voice Swap Single Line */}
                  <button
                    onClick={() => handleSwapSingleLine(seg)}
                    disabled={isSwapping}
                    className="flex items-center gap-1.5 px-3 py-1 font-medium text-purple-300 hover:text-white bg-purple-950/60 hover:bg-purple-900/70 border border-purple-800/80 rounded transition-colors disabled:opacity-50"
                  >
                    {isSwapping ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Synthesizing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span>Swap Line</span>
                      </>
                    )}
                  </button>

                  {/* Record with Mic */}
                  {!isRecording ? (
                    <button
                      onClick={() => handleStartLineRecord(seg.id)}
                      className="flex items-center gap-1.5 px-3 py-1 font-medium text-red-300 hover:text-white bg-red-950/50 hover:bg-red-900/60 border border-red-800/80 rounded transition-colors"
                    >
                      <Mic className="w-3 h-3 text-red-400" />
                      <span>Record Mic</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStopLineRecord}
                      className="flex items-center gap-1.5 px-3 py-1 font-medium text-white bg-red-600 hover:bg-red-500 rounded transition-colors animate-pulse"
                    >
                      <Square className="w-3 h-3" />
                      <span>Stop Recording</span>
                    </button>
                  )}

                  {/* Upload audio file for this line */}
                  <label className="flex items-center gap-1.5 px-3 py-1 font-medium text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded cursor-pointer transition-colors">
                    <Upload className="w-3 h-3" />
                    <span>Upload Take</span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => handleLineAudioUpload(seg.id, e)}
                    />
                  </label>
                </div>

                <div className="text-[11px] text-slate-500 font-mono">
                  {seg.swappedAudioUrl ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Voice Dub Ready
                    </span>
                  ) : (
                    <span>Original Audio</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
