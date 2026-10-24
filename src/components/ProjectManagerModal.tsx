import React, { useState } from 'react';
import { Project, VoiceProfile, DialogueSegment, VisemeFrame } from '../types';
import { DEFAULT_STARTER_PROJECTS } from '../services/projectStorage';
import {
  FolderPlus,
  Video,
  Upload,
  Copy,
  Trash2,
  Check,
  X,
  PlaySquare,
  Sparkles
} from 'lucide-react';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  voiceProfiles: VoiceProfile[];
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  voiceProfiles,
}) => {
  if (!isOpen) return null;

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'upload' | 'starter_speaker' | 'starter_podcast'>('upload');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(10);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(voiceProfiles[0]?.id || '');

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setUploadedVideoUrl(url);
    if (!newTitle) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    // Inspect duration
    const tempVideo = document.createElement('video');
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      if (tempVideo.duration) {
        setVideoDuration(parseFloat(tempVideo.duration.toFixed(1)));
      }
    };
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let videoUrl = uploadedVideoUrl || DEFAULT_STARTER_PROJECTS[0].videoUrl;
    let videoType: 'custom' | 'sample_interview' | 'sample_podcast' = 'custom';
    let segments: DialogueSegment[] = [
      {
        id: 'seg-1',
        text: 'Hello, this is my custom dubbed video.',
        startTime: 0.5,
        endTime: 4.5,
        speaker: 'Speaker',
      },
    ];
    let visemeFrames: VisemeFrame[] = [
      { time: 0.5, viseme: 'OH', intensity: 0.8 },
      { time: 1.5, viseme: 'AA', intensity: 0.9 },
      { time: 2.5, viseme: 'EE', intensity: 0.85 },
      { time: 3.5, viseme: 'MM', intensity: 0.7 },
      { time: 4.5, viseme: 'silence', intensity: 0 },
    ];
    let mouthRegion = {
      centerX: 0.5,
      centerY: 0.5,
      width: 0.16,
      height: 0.13,
      rotation: 0,
    };

    if (selectedTemplate === 'starter_speaker') {
      const template = DEFAULT_STARTER_PROJECTS[0];
      videoUrl = template.videoUrl;
      videoType = 'sample_interview';
      segments = template.segments;
      visemeFrames = template.visemeFrames;
      mouthRegion = template.lipSyncConfig.mouthRegion;
    } else if (selectedTemplate === 'starter_podcast') {
      const template = DEFAULT_STARTER_PROJECTS[1];
      videoUrl = template.videoUrl;
      videoType = 'sample_podcast';
      segments = template.segments;
      visemeFrames = template.visemeFrames;
      mouthRegion = template.lipSyncConfig.mouthRegion;
    }

    const newProject: Project = {
      id: 'proj-' + Date.now(),
      title: newTitle || 'Untitled Video Project',
      videoUrl: videoUrl,
      videoType: videoType,
      videoDuration: videoDuration,
      userVoiceProfileId: selectedVoiceId,
      transcript: segments.map((s) => s.text).join(' '),
      segments: segments,
      visemeFrames: visemeFrames,
      lipSyncConfig: {
        mouthRegion,
        sensitivity: 1.25,
        jawOpenScale: 1.35,
        smoothing: 0.35,
        audioOffsetMs: 0,
        blendMode: 'warp',
        showAnchorWireframe: true,
      },
      audioDspConfig: {
        noiseGateThreshold: -42,
        eqLow: 1.0,
        eqMid: 1.5,
        eqHigh: 2.0,
        compressorThreshold: -24,
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
    };

    onCreateProject(newProject);
    setIsCreating(false);
    onClose();
  };

  const handleDuplicate = (project: Project) => {
    const duplicated: Project = {
      ...project,
      id: 'proj-' + Date.now(),
      title: `${project.title} (Copy)`,
      lastModified: Date.now(),
    };
    onCreateProject(duplicated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Project Manager</h2>
              <p className="text-xs text-slate-400">Unlimited video voice swap projects for personal use</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!isCreating ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Your Projects ({projects.length})
                </span>
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Create New Project</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {projects.map((proj) => {
                  const isActive = proj.id === activeProjectId;
                  return (
                    <div
                      key={proj.id}
                      className={`p-4 rounded-lg border transition-all flex items-center justify-between gap-4 ${
                        isActive
                          ? 'bg-slate-800/90 border-blue-500 ring-1 ring-blue-500'
                          : 'bg-slate-800/40 border-slate-700/80 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                          {proj.videoPoster ? (
                            <img src={proj.videoPoster} alt="Poster" className="w-full h-full object-cover" />
                          ) : (
                            <Video className="w-5 h-5 text-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-white truncate">{proj.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>{proj.videoDuration.toFixed(1)}s</span>
                            <span>·</span>
                            <span>{proj.segments.length} dialogue lines</span>
                            {isActive && <span className="text-blue-400 font-medium">· Active</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isActive && (
                          <button
                            onClick={() => {
                              onSelectProject(proj.id);
                              onClose();
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
                          >
                            Open
                          </button>
                        )}
                        <button
                          onClick={() => handleDuplicate(proj)}
                          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
                          title="Duplicate project"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {projects.length > 1 && (
                          <button
                            onClick={() => onDeleteProject(proj.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-slate-700 transition-colors"
                            title="Delete project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  New Project Setup
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Back to projects
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Keynote Presentation Dubbed"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-md text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Template / Video Source Picker */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Video Source</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setSelectedTemplate('upload')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all text-center ${
                      selectedTemplate === 'upload'
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Upload className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                    <span className="text-xs font-medium block">Upload Video File</span>
                    <span className="text-[10px] text-slate-500 block">MP4, WebM, MOV</span>
                  </div>

                  <div
                    onClick={() => setSelectedTemplate('starter_speaker')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all text-center ${
                      selectedTemplate === 'starter_speaker'
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <PlaySquare className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                    <span className="text-xs font-medium block">Studio Keynote</span>
                    <span className="text-[10px] text-slate-500 block">Preset Presenter</span>
                  </div>

                  <div
                    onClick={() => setSelectedTemplate('starter_podcast')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all text-center ${
                      selectedTemplate === 'starter_podcast'
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <PlaySquare className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                    <span className="text-xs font-medium block">Podcast Studio</span>
                    <span className="text-[10px] text-slate-500 block">Preset Host</span>
                  </div>
                </div>
              </div>

              {/* Upload Input if upload mode */}
              {selectedTemplate === 'upload' && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-center">
                  <input
                    type="file"
                    accept="video/*"
                    id="video-upload-input"
                    className="hidden"
                    onChange={handleVideoUpload}
                  />
                  <label
                    htmlFor="video-upload-input"
                    className="inline-block px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md cursor-pointer transition-colors"
                  >
                    Choose Video File from Computer
                  </label>
                  {uploadedVideoUrl && (
                    <p className="text-xs text-emerald-400 mt-2">
                      Video loaded ({videoDuration}s)
                    </p>
                  )}
                </div>
              )}

              {/* Voice Profile selection */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Initial Voice Profile to Swap With
                </label>
                <select
                  value={selectedVoiceId}
                  onChange={(e) => setSelectedVoiceId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {voiceProfiles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.timbre}, {v.fundamentalPitchHz} Hz)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
                >
                  Create Project
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
          <span>Unlimited projects · 100% Client-side privacy & storage</span>
          <span>Zero credits limit</span>
        </div>
      </div>
    </div>
  );
};
