import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Project, VoiceProfile } from '../types';

export async function syncUserProfile(user: User) {
  const path = `users/${user.uid}`;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(
      userDocRef,
      {
        userId: user.uid,
        displayName: user.displayName || 'Creator',
        email: user.email || '',
        photoURL: user.photoURL || '',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserProjects(
  userId: string,
  onProjectsUpdated: (projects: Project[]) => void
) {
  const path = `users/${userId}/projects`;
  try {
    const collRef = collection(db, 'users', userId, 'projects');
    const q = query(collRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const projects: Project[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          projects.push({
            id: docSnap.id,
            title: data.title || 'Untitled Project',
            videoUrl: data.videoUrl || '',
            videoPoster: data.videoPoster,
            videoType: data.videoType || 'custom',
            videoDuration: data.videoDuration || 10,
            userVoiceProfileId: data.userVoiceProfileId || '',
            transcript: data.transcript || '',
            segments: data.segments || [],
            visemeFrames: data.visemeFrames || [],
            lipSyncConfig: data.lipSyncConfig || {
              mouthRegion: { centerX: 0.5, centerY: 0.5, width: 0.16, height: 0.13, rotation: 0 },
              sensitivity: 1.25,
              jawOpenScale: 1.35,
              smoothing: 0.35,
              audioOffsetMs: 0,
              blendMode: 'warp',
              showAnchorWireframe: true,
            },
            audioDspConfig: data.audioDspConfig || {
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
            customVoiceAudioUrl: data.customVoiceAudioUrl,
            lastModified: data.lastModified || Date.now(),
          });
        });

        if (projects.length > 0) {
          onProjectsUpdated(projects);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function saveProjectToFirestore(userId: string, project: Project) {
  const path = `users/${userId}/projects/${project.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'projects', project.id);
    await setDoc(
      docRef,
      {
        ...project,
        userId,
        lastModified: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProjectFromFirestore(userId: string, projectId: string) {
  const path = `users/${userId}/projects/${projectId}`;
  try {
    const docRef = doc(db, 'users', userId, 'projects', projectId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeUserVoiceProfiles(
  userId: string,
  onProfilesUpdated: (profiles: VoiceProfile[]) => void
) {
  const path = `users/${userId}/voiceProfiles`;
  try {
    const collRef = collection(db, 'users', userId, 'voiceProfiles');
    const q = query(collRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const profiles: VoiceProfile[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          profiles.push({
            id: docSnap.id,
            name: data.name || 'My Voice',
            genderEstimate: data.genderEstimate || 'neutral',
            fundamentalPitchHz: data.fundamentalPitchHz || 160,
            timbre: data.timbre || 'warm',
            speakingRateWpm: data.speakingRateWpm || 140,
            suggestedPrebuiltVoice: data.suggestedPrebuiltVoice || 'Kore',
            pitchFineTuneSemitones: data.pitchFineTuneSemitones || 0,
            formantShift: data.formantShift || 0,
            resonanceFactor: data.resonanceFactor || 1.0,
            clarityScore: data.clarityScore || 90,
            description: data.description || '',
            stylePrompt: data.stylePrompt || '',
            sampleAudioUrl: data.sampleAudioUrl,
            createdAt: data.createdAt || Date.now(),
          });
        });

        if (profiles.length > 0) {
          onProfilesUpdated(profiles);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function saveVoiceProfileToFirestore(userId: string, profile: VoiceProfile) {
  const path = `users/${userId}/voiceProfiles/${profile.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'voiceProfiles', profile.id);
    await setDoc(
      docRef,
      {
        ...profile,
        userId,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteVoiceProfileFromFirestore(userId: string, profileId: string) {
  const path = `users/${userId}/voiceProfiles/${profileId}`;
  try {
    const docRef = doc(db, 'users', userId, 'voiceProfiles', profileId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
