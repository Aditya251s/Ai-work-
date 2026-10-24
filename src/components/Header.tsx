import React from 'react';
import { Project, VoiceProfile } from '../types';
import { Mic, Video, Sliders, FileText, Download, FolderPlus, Sparkles, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../services/firebase';

interface HeaderProps {
  activeTab: 'preview' | 'script' | 'audio_dsp' | 'voice_profile';
  setActiveTab: (tab: 'preview' | 'script' | 'audio_dsp' | 'voice_profile') => void;
  currentProject: Project;
  activeVoice: VoiceProfile;
  onOpenVoiceModal: () => void;
  onOpenProjectsModal: () => void;
  onOpenExportModal: () => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentProject,
  activeVoice,
  onOpenVoiceModal,
  onOpenProjectsModal,
  onOpenExportModal,
  user,
  onSignIn,
  onSignOut,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900 border-b border-slate-800 text-slate-100 select-none">
      {/* Zone 1: Single text wordmark with subtle project kicker */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-semibold tracking-tight text-white whitespace-nowrap">
            SyncVoice Studio
          </span>
        </div>

        <span className="text-slate-600 text-xs hidden sm:inline" aria-hidden="true">|</span>

        {/* Project Selector Trigger */}
        <button
          onClick={onOpenProjectsModal}
          className="hidden md:flex items-center gap-2 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-md border border-slate-700/80 transition-colors whitespace-nowrap"
          title="Switch or create unlimited projects"
        >
          <span className="text-slate-400 font-normal">Project:</span>
          <span className="max-w-[140px] truncate text-slate-200">{currentProject.title}</span>
          <FolderPlus className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Zone 2: 4-5 Clean single-line text navigation links */}
      <nav className="hidden lg:flex items-center gap-1 p-1 bg-slate-950/60 border border-slate-800/90 rounded-lg">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'preview'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Video & Lip Sync</span>
        </button>

        <button
          onClick={() => setActiveTab('script')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'script'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Script & Dubbing</span>
        </button>

        <button
          onClick={() => setActiveTab('audio_dsp')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'audio_dsp'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Audio DSP Rack</span>
        </button>

        <button
          onClick={onOpenVoiceModal}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Voice: <strong className="text-slate-200 font-medium">{activeVoice.name}</strong></span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action + Firebase Auth + Unboxed tier proof */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>Unlimited Personal</span>
          <span aria-hidden="true">·</span>
          <span>No Watermarks</span>
          <span aria-hidden="true">·</span>
          <span>Zero Credits Limit</span>
        </div>

        {user ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-850 rounded border border-slate-750 text-xs">
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-4 h-4 rounded-full" />
              ) : (
                <UserIcon className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span className="max-w-[100px] truncate text-slate-200">{user.displayName || user.email}</span>
            </div>
            <button
              onClick={onSignOut}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded transition-colors whitespace-nowrap"
          >
            <LogIn className="w-3.5 h-3.5 text-blue-400" />
            <span>Sign In</span>
          </button>
        )}

        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md shadow-sm transition-colors whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Video & Audio</span>
        </button>
      </div>
    </header>
  );
};
