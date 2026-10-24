/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Project, VoiceProfile, DialogueSegment } from './types';
import {
  getStoredProjects,
  saveProjects,
  getStoredVoiceProfiles,
  saveVoiceProfiles,
  getActiveProjectId,
  setActiveProjectId,
} from './services/projectStorage';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User } from './services/firebase';
import {
  syncUserProfile,
  subscribeUserProjects,
  saveProjectToFirestore,
  deleteProjectFromFirestore,
  subscribeUserVoiceProfiles,
  saveVoiceProfileToFirestore,
  deleteVoiceProfileFromFirestore,
} from './services/firebaseSync';
import { Header } from './components/Header';
import { VideoLipSyncPreview } from './components/VideoLipSyncPreview';
import { TimelineEditor } from './components/TimelineEditor';
import { ScriptDubbingPanel } from './components/ScriptDubbingPanel';
import { AudioProcessingRack } from './components/AudioProcessingRack';
import { VoiceProfileModal } from './components/VoiceProfileModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { ExportModal } from './components/ExportModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>(getStoredProjects);
  const [activeProjectId, setCurrentActiveProjectId] = useState<string>(getActiveProjectId);
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>(getStoredVoiceProfiles);
  const [activeVoiceId, setActiveVoiceId] = useState<string>(() => {
    const profiles = getStoredVoiceProfiles();
    return profiles[0]?.id || 'voice-profile-user-primary';
  });

  const [activeTab, setActiveTab] = useState<'preview' | 'script' | 'audio_dsp' | 'voice_profile'>('preview');

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        syncUserProfile(user);
      }
    });
    return () => unsubscribe();
  }, []);

  // Firebase Real-Time Firestore Sync when signed in
  useEffect(() => {
    if (!currentUser) return;

    const unsubProjects = subscribeUserProjects(currentUser.uid, (firestoreProjects) => {
      setProjects((localPrev) => {
        // Merge without losing current work
        const merged = [...firestoreProjects];
        localPrev.forEach((lp) => {
          if (!merged.some((mp) => mp.id === lp.id)) {
            merged.push(lp);
          }
        });
        saveProjects(merged);
        return merged;
      });
    });

    const unsubVoices = subscribeUserVoiceProfiles(currentUser.uid, (firestoreVoices) => {
      setVoiceProfiles((localPrev) => {
        const merged = [...firestoreVoices];
        localPrev.forEach((lv) => {
          if (!merged.some((mv) => mv.id === lv.id)) {
            merged.push(lv);
          }
        });
        saveVoiceProfiles(merged);
        return merged;
      });
    });

    return () => {
      unsubProjects();
      unsubVoices();
    };
  }, [currentUser]);

  // Modals
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Playback & Selection
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | undefined>(undefined);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | undefined>(undefined);

  // Active Project
  const currentProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || ({} as Project);

  // Active Voice
  const activeVoice =
    voiceProfiles.find((v) => v.id === activeVoiceId) || voiceProfiles[0];

  // Save projects whenever changed
  const updateProject = useCallback(
    (updates: Partial<Project>) => {
      setProjects((prev) => {
        const updated = prev.map((p) => {
          if (p.id === currentProject.id) {
            const nextProj = { ...p, ...updates, lastModified: Date.now() };
            if (currentUser) {
              saveProjectToFirestore(currentUser.uid, nextProj);
            }
            return nextProj;
          }
          return p;
        });
        saveProjects(updated);
        return updated;
      });
    },
    [currentProject.id, currentUser]
  );

  // Switch project
  const handleSelectProject = (id: string) => {
    setCurrentActiveProjectId(id);
    setActiveProjectId(id);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Create project
  const handleCreateProject = (newProject: Project) => {
    setProjects((prev) => {
      const updated = [newProject, ...prev];
      saveProjects(updated);
      return updated;
    });
    if (currentUser) {
      saveProjectToFirestore(currentUser.uid, newProject);
    }
    handleSelectProject(newProject.id);
  };

  // Delete project
  const handleDeleteProject = (id: string) => {
    setProjects((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      saveProjects(filtered);
      return filtered;
    });
    if (currentUser) {
      deleteProjectFromFirestore(currentUser.uid, id);
    }
    if (activeProjectId === id) {
      const nextProj = projects.find((p) => p.id !== id);
      if (nextProj) handleSelectProject(nextProj.id);
    }
  };

  // Save Voice Profile
  const handleSaveVoiceProfile = (profile: VoiceProfile) => {
    setVoiceProfiles((prev) => {
      const exists = prev.some((v) => v.id === profile.id);
      const updated = exists
        ? prev.map((v) => (v.id === profile.id ? profile : v))
        : [...prev, profile];
      saveVoiceProfiles(updated);
      return updated;
    });
    if (currentUser) {
      saveVoiceProfileToFirestore(currentUser.uid, profile);
    }
  };

  // Delete Voice Profile
  const handleDeleteVoiceProfile = (id: string) => {
    setVoiceProfiles((prev) => {
      const filtered = prev.filter((v) => v.id !== id);
      saveVoiceProfiles(filtered);
      return filtered;
    });
    if (currentUser) {
      deleteVoiceProfileFromFirestore(currentUser.uid, id);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Sign-in error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  // Spacebar hotkey for Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Determine active audio track url to feed into video lip syncer
  const activeVoiceTrackUrl =
    previewAudioUrl ||
    currentProject.customVoiceAudioUrl ||
    currentProject.segments.find((s) => s.swappedAudioUrl)?.swappedAudioUrl;

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const handleSelectSegment = (seg: DialogueSegment) => {
    setSelectedSegmentId(seg.id);
    if (seg.swappedAudioUrl) {
      setPreviewAudioUrl(seg.swappedAudioUrl);
    }
  };

  const handleAudioTakeUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64 = (reader.result as string).replace(/^data:audio\/[a-zA-Z0-9]+;base64,/, '');
      updateProject({
        customVoiceAudioUrl: url,
        customVoiceAudioBase64: base64,
      });
      setPreviewAudioUrl(url);
    };
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* 1. Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentProject={currentProject}
        activeVoice={activeVoice}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        onOpenProjectsModal={() => setIsProjectsModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        user={currentUser}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {/* 2. Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Viewport Content depending on active tab */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'preview' && (
            <VideoLipSyncPreview
              project={currentProject}
              onUpdateProject={updateProject}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              currentTime={currentTime}
              setCurrentTime={setCurrentTime}
              activeAudioUrl={activeVoiceTrackUrl}
            />
          )}

          {activeTab === 'script' && (
            <ScriptDubbingPanel
              project={currentProject}
              onUpdateProject={updateProject}
              activeVoice={activeVoice}
              onPreviewAudio={(url) => {
                setPreviewAudioUrl(url);
                setIsPlaying(true);
              }}
            />
          )}

          {activeTab === 'audio_dsp' && (
            <AudioProcessingRack
              project={currentProject}
              onUpdateProject={updateProject}
              isPlaying={isPlaying}
            />
          )}
        </div>
      </div>

      {/* 3. Bottom Multi-Track Timeline */}
      <TimelineEditor
        project={currentProject}
        onUpdateProject={updateProject}
        currentTime={currentTime}
        onSeek={handleSeek}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onSelectSegment={handleSelectSegment}
        selectedSegmentId={selectedSegmentId}
        onRecordOverdub={() => setIsVoiceModalOpen(true)}
        onUploadCustomVoiceTrack={handleAudioTakeUpload}
      />

      {/* Modals */}
      <VoiceProfileModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        voiceProfiles={voiceProfiles}
        activeVoiceId={activeVoiceId}
        onSelectVoice={(id) => setActiveVoiceId(id)}
        onSaveVoice={handleSaveVoiceProfile}
        onDeleteVoice={handleDeleteVoiceProfile}
      />

      <ProjectManagerModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        voiceProfiles={voiceProfiles}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={currentProject}
      />
    </div>
  );
}
