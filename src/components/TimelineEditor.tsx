import React, { useState, useRef } from 'react';
import { Project, DialogueSegment } from '../types';
import { Play, Pause, Mic, Upload, ZoomIn, ZoomOut, Scissors, Plus, Check } from 'lucide-react';

interface TimelineEditorProps {
  project: Project;
  onUpdateProject: (updated: Partial<Project>) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSelectSegment: (segment: DialogueSegment) => void;
  selectedSegmentId?: string;
  onRecordOverdub: () => void;
  onUploadCustomVoiceTrack: (file: File) => void;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  project,
  onUpdateProject,
  currentTime,
  onSeek,
  isPlaying,
  onTogglePlay,
  onSelectSegment,
  selectedSegmentId,
  onRecordOverdub,
  onUploadCustomVoiceTrack,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 0.5 to 2.5
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const duration = project.videoDuration || 10;
  const pixelsPerSecond = 80 * zoomLevel;
  const totalTimelineWidth = Math.max(900, duration * pixelsPerSecond + 100);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const clickedTime = Math.max(0, Math.min(duration, clickX / pixelsPerSecond));
    onSeek(clickedTime);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadCustomVoiceTrack(file);
    }
  };

  // Generate tick markers
  const tickCount = Math.ceil(duration);
  const ticks = [];
  for (let i = 0; i <= tickCount; i++) {
    ticks.push(i);
  }

  return (
    <div className="flex flex-col bg-slate-900 border-t border-slate-800 text-slate-100 select-none">
      {/* Timeline Controls Header */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onTogglePlay}
            className="p-1.5 text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <span className="text-xs font-mono tabular-nums text-slate-300">
            {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
          </span>
        </div>

        {/* Quick Dub Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRecordOverdub}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded shadow-sm transition-colors"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Record Voice Over</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Import Voice Audio</span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <div className="h-4 w-px bg-slate-800 mx-2" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1 text-slate-400">
            <button
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
              className="p-1 hover:text-white hover:bg-slate-800 rounded"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono tabular-nums w-8 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(Math.min(2.5, zoomLevel + 0.25))}
              className="p-1 hover:text-white hover:bg-slate-800 rounded"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tracks Container with Scroll */}
      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        className="relative overflow-x-auto overflow-y-hidden max-h-56 bg-slate-950 p-4 cursor-pointer"
      >
        <div
          className="relative min-h-[140px]"
          style={{ width: `${totalTimelineWidth}px` }}
        >
          {/* Time Ruler Ticks */}
          <div className="relative h-6 border-b border-slate-800 flex items-end">
            {ticks.map((second) => (
              <div
                key={second}
                className="absolute flex flex-col items-start"
                style={{ left: `${second * pixelsPerSecond}px` }}
              >
                <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                  {second}s
                </span>
                <div className="w-px h-2 bg-slate-700" />
              </div>
            ))}
          </div>

          {/* Track 1: Video Track */}
          <div className="relative h-9 my-1.5 bg-slate-900/90 border border-slate-800 rounded flex items-center px-3 overflow-hidden">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-3 shrink-0">
              Video
            </span>
            <div
              className="h-6 bg-blue-950/60 border border-blue-800/60 rounded flex items-center px-2 text-xs text-blue-300 truncate"
              style={{ width: `${duration * pixelsPerSecond}px` }}
            >
              {project.title} ({duration.toFixed(1)}s)
            </div>
          </div>

          {/* Track 2: Dialogue & Voice Dubbing Track */}
          <div className="relative h-11 my-1.5 bg-slate-900/90 border border-slate-800 rounded flex items-center px-3">
            <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mr-3 shrink-0">
              Dialogue
            </span>
            <div className="relative h-8 flex-1">
              {project.segments.map((seg) => {
                const segLeft = seg.startTime * pixelsPerSecond;
                const segWidth = Math.max(20, (seg.endTime - seg.startTime) * pixelsPerSecond);
                const isSelected = seg.id === selectedSegmentId;

                return (
                  <div
                    key={seg.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSegment(seg);
                      onSeek(seg.startTime);
                    }}
                    className={`absolute top-0 h-full rounded border px-2 flex items-center text-xs truncate transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md ring-1 ring-purple-400'
                        : seg.swappedAudioBase64
                        ? 'bg-emerald-950/70 text-emerald-200 border-emerald-700 hover:bg-emerald-900/70'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-750'
                    }`}
                    style={{
                      left: `${segLeft}px`,
                      width: `${segWidth}px`,
                    }}
                    title={`${seg.speaker}: "${seg.text}" (${seg.startTime.toFixed(1)}s - ${seg.endTime.toFixed(1)}s)`}
                  >
                    <span className="truncate font-medium">{seg.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track 3: Viseme Lip-Sync Markers */}
          <div className="relative h-8 my-1.5 bg-slate-900/90 border border-slate-800 rounded flex items-center px-3 overflow-hidden">
            <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mr-3 shrink-0">
              Lip-Sync
            </span>
            <div className="relative h-6 flex-1">
              {project.visemeFrames.map((vf, idx) => {
                const left = vf.time * pixelsPerSecond;
                return (
                  <div
                    key={idx}
                    className="absolute top-0 h-full flex flex-col items-center pointer-events-none"
                    style={{ left: `${left}px` }}
                  >
                    <span className="text-[9px] font-mono text-cyan-300 font-bold">
                      {vf.viseme}
                    </span>
                    <div
                      className="w-1 bg-cyan-500/60 rounded-full"
                      style={{ height: `${Math.max(4, vf.intensity * 12)}px` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Playhead Vertical Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-lg pointer-events-none z-20 flex flex-col items-center"
            style={{ left: `${currentTime * pixelsPerSecond}px` }}
          >
            <div className="w-3 h-3 bg-red-500 rotate-45 -mt-1.5 shadow" />
          </div>
        </div>
      </div>
    </div>
  );
};
