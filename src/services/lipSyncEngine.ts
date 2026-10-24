import { LipSyncConfig, VisemeFrame, VisemeType } from '../types';

export class LipSyncEngine {
  private currentViseme: VisemeType = 'silence';
  private targetIntensity: number = 0;
  private currentIntensity: number = 0;

  // Real-time smoothed parameters for mouth deformation
  private currentOpenY: number = 0;
  private currentStretchX: number = 0;
  private currentRoundness: number = 0;

  public updateVisemeFromAudio(
    currentTime: number,
    visemeFrames: VisemeFrame[],
    audioEnergy: number,
    config: LipSyncConfig
  ): {
    viseme: VisemeType;
    intensity: number;
    openY: number;
    stretchX: number;
  } {
    const adjustedTime = Math.max(0, currentTime + config.audioOffsetMs / 1000);

    // 1. Find the current viseme frame based on time
    let activeViseme: VisemeType = 'silence';
    let frameIntensity = 0;

    if (visemeFrames && visemeFrames.length > 0) {
      for (let i = 0; i < visemeFrames.length; i++) {
        if (visemeFrames[i].time <= adjustedTime) {
          activeViseme = visemeFrames[i].viseme;
          frameIntensity = visemeFrames[i].intensity;
        } else {
          break;
        }
      }
    }

    // 2. Modulate with live audio energy RMS from audio engine
    // If audio is actively playing with high energy, scale up or fall back to phonetic energy
    if (audioEnergy > 0.04) {
      if (activeViseme === 'silence') {
        // Fallback open mouth on audio burst if no viseme frame
        activeViseme = audioEnergy > 0.4 ? 'AA' : audioEnergy > 0.2 ? 'OH' : 'EE';
      }
      this.targetIntensity = Math.min(1.0, (frameIntensity || 0.7) * audioEnergy * config.sensitivity * 2.2);
    } else {
      this.targetIntensity = 0;
      activeViseme = 'silence';
    }

    this.currentViseme = activeViseme;

    // Smooth intensity via lerp
    const lerpRate = 1 - config.smoothing * 0.8;
    this.currentIntensity += (this.targetIntensity - this.currentIntensity) * lerpRate;

    // Viseme specific geometric multipliers
    let targetOpen = 0;
    let targetStretch = 0;
    let targetRound = 0;

    switch (activeViseme) {
      case 'AA':
        targetOpen = 1.0 * config.jawOpenScale;
        targetStretch = 0.2;
        targetRound = 0.3;
        break;
      case 'EE':
        targetOpen = 0.35 * config.jawOpenScale;
        targetStretch = 0.8;
        targetRound = -0.2;
        break;
      case 'OH':
        targetOpen = 0.8 * config.jawOpenScale;
        targetStretch = -0.3;
        targetRound = 0.9;
        break;
      case 'OO':
        targetOpen = 0.4 * config.jawOpenScale;
        targetStretch = -0.5;
        targetRound = 1.0;
        break;
      case 'MM':
        targetOpen = 0.05;
        targetStretch = 0.1;
        targetRound = 0;
        break;
      case 'FF':
        targetOpen = 0.15;
        targetStretch = 0.3;
        targetRound = 0;
        break;
      case 'TH':
        targetOpen = 0.25;
        targetStretch = 0.2;
        targetRound = 0;
        break;
      case 'silence':
      default:
        targetOpen = 0;
        targetStretch = 0;
        targetRound = 0;
        break;
    }

    this.currentOpenY += (targetOpen * this.currentIntensity - this.currentOpenY) * lerpRate;
    this.currentStretchX += (targetStretch * this.currentIntensity - this.currentStretchX) * lerpRate;
    this.currentRoundness += (targetRound * this.currentIntensity - this.currentRoundness) * lerpRate;

    return {
      viseme: this.currentViseme,
      intensity: this.currentIntensity,
      openY: this.currentOpenY,
      stretchX: this.currentStretchX,
    };
  }

  /**
   * Render frame onto target canvas with high-fidelity seamless lip warping and viseme overlay
   */
  public renderLipSyncFrame(
    ctx: CanvasRenderingContext2D,
    videoSource: HTMLVideoElement | HTMLImageElement,
    canvasWidth: number,
    canvasHeight: number,
    config: LipSyncConfig,
    lipState: { viseme: VisemeType; intensity: number; openY: number; stretchX: number }
  ) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 1. Draw source video frame
    ctx.drawImage(videoSource, 0, 0, canvasWidth, canvasHeight);

    // If mouth is relaxed or quiet, don't need heavy warp
    const { mouthRegion } = config;
    const mx = mouthRegion.centerX * canvasWidth;
    const my = mouthRegion.centerY * canvasHeight;
    const mw = mouthRegion.width * canvasWidth;
    const mh = mouthRegion.height * canvasHeight;

    const openAmount = lipState.openY * (mh * 0.42);
    const stretchAmount = lipState.stretchX * (mw * 0.2);

    if (openAmount > 1.0) {
      // Create seamless natural oral cavity blend
      ctx.save();

      // Elliptical mouth mask path
      ctx.beginPath();
      const mouthRadiusX = Math.max(8, (mw * 0.38) + stretchAmount);
      const mouthRadiusY = Math.max(4, (mh * 0.22) + openAmount);

      ctx.ellipse(mx, my, mouthRadiusX, mouthRadiusY, 0, 0, Math.PI * 2);
      ctx.clip();

      // Deep natural mouth cavity shading
      const grad = ctx.createRadialGradient(mx, my - 2, 2, mx, my, mouthRadiusY * 1.2);
      grad.addColorStop(0, 'rgba(42, 12, 16, 0.96)'); // inner oral dark tone
      grad.addColorStop(0.5, 'rgba(64, 18, 22, 0.92)');
      grad.addColorStop(0.85, 'rgba(110, 36, 42, 0.7)');
      grad.addColorStop(1, 'rgba(140, 50, 56, 0.2)');

      ctx.fillStyle = grad;
      ctx.fill();

      // Teeth visibility for open visemes (AA, EE, OH, TH)
      if (lipState.viseme === 'EE' || lipState.viseme === 'AA' || lipState.viseme === 'TH') {
        const teethY = my - mouthRadiusY * 0.45;
        const teethW = mouthRadiusX * 1.1;
        const teethH = Math.min(openAmount * 0.35, 7);

        ctx.fillStyle = 'rgba(245, 243, 238, 0.88)';
        ctx.beginPath();
        ctx.roundRect(mx - teethW / 2, teethY, teethW, teethH, [1, 1, 3, 3]);
        ctx.fill();
      }

      // Tongue hint inside mouth for open vowels
      if (openAmount > 8 && (lipState.viseme === 'AA' || lipState.viseme === 'OH')) {
        ctx.fillStyle = 'rgba(172, 70, 78, 0.85)';
        ctx.beginPath();
        ctx.ellipse(mx, my + mouthRadiusY * 0.35, mouthRadiusX * 0.6, mouthRadiusY * 0.35, 0, 0, Math.PI);
        ctx.fill();
      }

      ctx.restore();

      // Soft upper & lower lip contour highlights
      ctx.save();
      ctx.lineWidth = Math.max(2, mh * 0.08);
      ctx.lineCap = 'round';

      // Upper lip contour
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(165, 78, 82, 0.35)';
      ctx.ellipse(mx, my - mouthRadiusY * 0.85, mouthRadiusX * 1.05, Math.max(3, mouthRadiusY * 0.3), 0, Math.PI, 0);
      ctx.stroke();

      // Lower lip contour
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(180, 88, 92, 0.4)';
      ctx.ellipse(mx, my + mouthRadiusY * 0.85, mouthRadiusX * 0.95, Math.max(4, mouthRadiusY * 0.4), 0, 0, Math.PI);
      ctx.stroke();

      ctx.restore();
    }

    // 3. Draw Mouth Anchor Box / Wireframe if enabled by user
    if (config.showAnchorWireframe) {
      ctx.save();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);

      // Box
      const bx = mx - mw / 2;
      const by = my - mh / 2;
      ctx.strokeRect(bx, by, mw, mh);

      // Center crosshair
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.95)';
      ctx.beginPath();
      ctx.moveTo(mx - 8, my);
      ctx.lineTo(mx + 8, my);
      ctx.moveTo(mx, my - 8);
      ctx.lineTo(mx, my + 8);
      ctx.stroke();

      // Label
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#3b82f6';
      ctx.fillText(`LIP-SYNC ANCHOR (${lipState.viseme})`, bx, by - 6);
      ctx.restore();
    }
  }
}

export const lipSyncEngine = new LipSyncEngine();
