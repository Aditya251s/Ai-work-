import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Project, VisemeType } from '../types';
import { lipSyncEngine } from '../services/lipSyncEngine';
import { audioEngine } from '../services/audioEngine';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Crosshair,
  Sliders,
  Layers,
  Sparkles,
  Maximize2
} from 'lucide-react';

interface VideoLipSyncPreviewProps {
  project: Project;
  onUpdateProject: (updated: Partial<Project>) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  activeAudioUrl?: string;
}

export const VideoLipSyncPreview: React.FC<VideoLipSyncPreviewProps> = ({
  project,
  onUpdateProject,
  isPlaying,
  setIsPlaying,
  currentTime,
  setCurrentTime,
  activeAudioUrl,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [activeViseme, setActiveViseme] = useState<VisemeType>('silence');
  const [currentEnergy, setCurrentEnergy] = useState<number>(0);
  const [isDraggingAnchor, setIsDraggingAnchor] = useState<boolean>(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);

  const isVideoFile = project.videoUrl.endsWith('.mp4') || project.videoUrl.endsWith('.webm');

  // Attach audio elements to audio engine on load
  useEffect(() => {
    if (audioRef.current) {
      audioEngine.attachVoiceAudio(audioRef.current);
    }
  }, [activeAudioUrl]);

  useEffect(() => {
    if (videoRef.current) {
      audioEngine.attachVideoAudio(videoRef.current);
    }
  }, [project.videoUrl]);

  // Sync audio/video playback state
  useEffect(() => {
    if (isPlaying) {
      audioEngine.init();
      if (audioRef.current) {
        audioRef.current.currentTime = currentTime;
        audioRef.current.play().catch(() => {});
      }
      if (videoRef.current) {
        videoRef.current.currentTime = currentTime;
        videoRef.current.play().catch(() => {});
      }
    } else {
      if (audioRef.current) audioRef.current.pause();
      if (videoRef.current) videoRef.current.pause();
    }
  }, [isPlaying]);

  // Time update listener
  useEffect(() => {
    let animationFrameId: number;

    const renderLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Determine active time
      let t = currentTime;
      if (isPlaying) {
        if (audioRef.current && !audioRef.current.paused) {
          t = audioRef.current.currentTime;
          setCurrentTime(t);
        } else if (videoRef.current && !videoRef.current.paused) {
          t = videoRef.current.currentTime;
          setCurrentTime(t);
        } else {
          t += 1 / 60;
          if (t >= project.videoDuration) {
            t = 0;
            setIsPlaying(false);
          }
          setCurrentTime(t);
        }
      }

      // Live RMS audio energy from audio engine
      const energy = isPlaying ? audioEngine.getEnergyLevel() : 0;
      setCurrentEnergy(energy);

      // Compute Viseme from transcript frames + audio energy
      const lipState = lipSyncEngine.updateVisemeFromAudio(
        t,
        project.visemeFrames,
        energy,
        project.lipSyncConfig
      );
      setActiveViseme(lipState.viseme);

      // Render the frame onto Canvas
      const source = isVideoFile ? videoRef.current : imageRef.current;
      if (source && (source as any).complete !== false) {
        lipSyncEngine.renderLipSyncFrame(
          ctx,
          source,
          canvas.width,
          canvas.height,
          project.lipSyncConfig,
          lipState
        );
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, currentTime, project, isVideoFile]);

  // Handle Dragging mouth anchor on Canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!project.lipSyncConfig.showAnchorWireframe) return;
    setIsDraggingAnchor(true);
    handleCanvasMouseMove(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingAnchor && e.type === 'mousemove') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    onUpdateProject({
      lipSyncConfig: {
        ...project.lipSyncConfig,
        mouthRegion: {
          ...project.lipSyncConfig.mouthRegion,
          centerX: Math.max(0.1, Math.min(0.9, x)),
          centerY: Math.max(0.1, Math.min(0.9, y)),
        },
      },
    });
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingAnchor(false);
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (audioRef.current) audioRef.current.currentTime = newTime;
    if (videoRef.current) videoRef.current.currentTime = newTime;
  };

  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}.${ms}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none">
      {/* Hidden media elements used for decoding/streaming */}
      {isVideoFile ? (
        <video
          ref={videoRef}
          src={project.videoUrl}
          playsInline
          muted={project.audioDspConfig.muteOriginal}
          className="hidden"
          onLoadedMetadata={(e) => {
            const dur = (e.target as HTMLVideoElement).duration;
            if (dur && dur > 0) onUpdateProject({ videoDuration: dur });
          }}
        />
      ) : (
        <img
          ref={imageRef}
          src={project.videoUrl}
          alt="Video Anchor Frame"
          className="hidden"
        />
      )}

      {activeAudioUrl && (
        <audio
          ref={audioRef}
          src={activeAudioUrl}
          className="hidden"
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Main Viewport Header Toolbar */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">AI Lip-Sync Engine</span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400 font-mono">60 FPS Real-Time Warping</span>
          </div>

          {/* Live Viseme HUD */}
          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-950 rounded border border-slate-800">
            <span className="text-[11px] text-slate-400">Viseme:</span>
            <span className="text-xs font-mono font-semibold text-blue-400 uppercase">
              {activeViseme === 'silence' ? 'Resting (closed)' : activeViseme}
            </span>
            {/* Live Audio Energy Indicator */}
            <div className="w-12 h-2 bg-slate-800 rounded-full overflow-hidden ml-2 flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-75"
                style={{ width: `${Math.min(100, currentEnergy * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Configuration Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onUpdateProject({
                lipSyncConfig: {
                  ...project.lipSyncConfig,
                  showAnchorWireframe: !project.lipSyncConfig.showAnchorWireframe,
                },
              })
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
              project.lipSyncConfig.showAnchorWireframe
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/50'
                : 'text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{project.lipSyncConfig.showAnchorWireframe ? 'Anchor Visible' : 'Anchor Hidden'}</span>
          </button>

          <button
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
              showConfigDrawer
                ? 'bg-slate-800 text-white border-slate-700'
                : 'text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Tuning</span>
          </button>
        </div>
      </div>

      {/* Main Video & Canvas Container */}
      <div className="relative flex-1 flex items-center justify-center p-4 bg-slate-950 overflow-hidden">
        <div className="relative max-w-4xl w-full aspect-video rounded-lg overflow-hidden shadow-2xl bg-black border border-slate-800/80 group">
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className={`w-full h-full object-contain ${
              project.lipSyncConfig.showAnchorWireframe ? 'cursor-crosshair' : 'cursor-default'
            }`}
          />

          {/* Quick Overlay Prompt if anchor is visible */}
          {project.lipSyncConfig.showAnchorWireframe && (
            <div className="absolute top-3 left-3 px-2 py-1 bg-black/75 backdrop-blur text-[11px] text-blue-300 rounded border border-blue-500/30 pointer-events-none">
              Click & drag anywhere on video to calibrate mouth anchor position
            </div>
          )}

          {/* Tuning Drawer Overlay */}
          {showConfigDrawer && (
            <div className="absolute top-3 right-3 w-72 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-lg p-4 shadow-xl space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-semibold text-slate-200">Lip-Sync Calibration</span>
                <button
                  onClick={() => setShowConfigDrawer(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ×
                </button>
              </div>

              {/* Jaw Opening Scale */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Jaw Opening Scale</span>
                  <span className="font-mono tabular-nums">{project.lipSyncConfig.jawOpenScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.2"
                  step="0.05"
                  value={project.lipSyncConfig.jawOpenScale}
                  onChange={(e) =>
                    onUpdateProject({
                      lipSyncConfig: {
                        ...project.lipSyncConfig,
                        jawOpenScale: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Audio Sensitivity */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Acoustic Sensitivity</span>
                  <span className="font-mono tabular-nums">{project.lipSyncConfig.sensitivity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={project.lipSyncConfig.sensitivity}
                  onChange={(e) =>
                    onUpdateProject({
                      lipSyncConfig: {
                        ...project.lipSyncConfig,
                        sensitivity: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Viseme Smoothing */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Motion Smoothing</span>
                  <span className="font-mono tabular-nums">{project.lipSyncConfig.smoothing.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={project.lipSyncConfig.smoothing}
                  onChange={(e) =>
                    onUpdateProject({
                      lipSyncConfig: {
                        ...project.lipSyncConfig,
                        smoothing: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Audio Timing Offset (ms) */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Sync Offset</span>
                  <span className="font-mono tabular-nums">{project.lipSyncConfig.audioOffsetMs} ms</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="-400"
                    max="400"
                    step="10"
                    value={project.lipSyncConfig.audioOffsetMs}
                    onChange={(e) =>
                      onUpdateProject({
                        lipSyncConfig: {
                          ...project.lipSyncConfig,
                          audioOffsetMs: parseInt(e.target.value, 10),
                        },
                      })
                    }
                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
                  />
                  <button
                    onClick={() =>
                      onUpdateProject({
                        lipSyncConfig: {
                          ...project.lipSyncConfig,
                          audioOffsetMs: 0,
                        },
                      })
                    }
                    className="px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Playback Controls & Timeline Scrubber Bar */}
      <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 space-y-2.5">
        {/* Scrubber Progress Bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono tabular-nums text-slate-400 w-16">
            {formatTimecode(currentTime)}
          </span>
          <div className="relative flex-1 flex items-center group">
            <input
              type="range"
              min="0"
              max={project.videoDuration || 10}
              step="0.05"
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 group-hover:h-2 transition-all"
            />
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500 w-16 text-right">
            {formatTimecode(project.videoDuration || 10)}
          </span>
        </div>

        {/* Transport Buttons & Audio Balance */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2.5 text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={() => handleSeek(0)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Rewind to start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Audio Mix Controls */}
          <div className="flex items-center gap-6 text-xs">
            {/* Swapped Voice Volume */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">My Voice Volume:</span>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={project.audioDspConfig.swappedVoiceVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateProject({
                    audioDspConfig: {
                      ...project.audioDspConfig,
                      swappedVoiceVolume: val,
                    },
                  });
                  audioEngine.updateDspConfig({
                    ...project.audioDspConfig,
                    swappedVoiceVolume: val,
                  });
                }}
                className="w-24 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
              />
              <span className="font-mono tabular-nums text-slate-400 w-8">
                {Math.round(project.audioDspConfig.swappedVoiceVolume * 100)}%
              </span>
            </div>

            {/* Original Video Speech Mute */}
            <button
              onClick={() => {
                const muted = !project.audioDspConfig.muteOriginal;
                onUpdateProject({
                  audioDspConfig: {
                    ...project.audioDspConfig,
                    muteOriginal: muted,
                  },
                });
                audioEngine.updateDspConfig({
                  ...project.audioDspConfig,
                  muteOriginal: muted,
                });
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                project.audioDspConfig.muteOriginal
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'
              }`}
            >
              {project.audioDspConfig.muteOriginal ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span>Original Video Audio Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Original Audio Blended</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
