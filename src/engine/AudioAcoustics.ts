/**
 * Real Physics Power Electronics Acoustic Synthesizer (Rec 19)
 * Synthesizes physical substation & converter sounds directly via Web Audio API.
 * Zero external audio files required. Safe, non-blocking, and starts muted by default.
 */

class AudioAcousticsEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private masterGain: GainNode | null = null;

  // Active continuous synthesizers
  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private humHarmonicOsc: OscillatorNode | null = null;

  private pwmOsc: OscillatorNode | null = null;
  private pwmGain: GainNode | null = null;

  constructor() {
    // Check localStorage preference if available
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('pe_lab_audio_muted');
        if (saved !== null) {
          this.isMuted = saved === 'true';
        }
      }
    } catch {
      this.isMuted = true;
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pe_lab_audio_muted', String(muted));
      }
    } catch {}

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.35, this.ctx.currentTime, 0.05);
    }
    if (!muted) {
      this.initCtx();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Mechanical Switchgear Breaker Impulse (52-Q1 / 52-Q2 / KM1 Contact)
   * Synthesizes realistic tactile mechanical "clack-thud" with spring rebound.
   */
  public playBreakerClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // 1. Initial mechanical impact (Metallic high burst)
    const impactOsc = this.ctx.createOscillator();
    const impactGain = this.ctx.createGain();
    impactOsc.type = 'triangle';
    impactOsc.frequency.setValueAtTime(480, now);
    impactOsc.frequency.exponentialRampToValueAtTime(120, now + 0.035);

    impactGain.gain.setValueAtTime(0.6, now);
    impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    impactOsc.connect(impactGain);
    impactGain.connect(this.masterGain);
    impactOsc.start(now);
    impactOsc.stop(now + 0.045);

    // 2. Heavy solenoid latch thud (Low resonance box)
    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(140, now + 0.015);
    thudOsc.frequency.exponentialRampToValueAtTime(45, now + 0.09);

    thudGain.gain.setValueAtTime(0.8, now + 0.015);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    thudOsc.connect(thudGain);
    thudGain.connect(this.masterGain);
    thudOsc.start(now + 0.015);
    thudOsc.stop(now + 0.12);
  }

  /**
   * Continuous Transformer / Core Magnetostriction Buzz (50Hz / 100Hz / 300Hz)
   * Characteristic hum of industrial battery chargers, soft starters, and reactors.
   */
  public updateTransformerHum(isActive: boolean, freqHz: number = 100, volume: number = 0.08) {
    if (this.isMuted || !isActive) {
      this.stopTransformerHum();
      return;
    }
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    if (!this.humOsc) {
      this.humOsc = this.ctx.createOscillator();
      this.humGain = this.ctx.createGain();
      this.humHarmonicOsc = this.ctx.createOscillator();

      this.humOsc.type = 'sawtooth';
      this.humHarmonicOsc.type = 'sine';

      this.humOsc.frequency.setValueAtTime(freqHz, now);
      this.humHarmonicOsc.frequency.setValueAtTime(freqHz * 3, now); // 3rd harmonic magnetostriction

      this.humGain.gain.setValueAtTime(0.001, now);
      this.humGain.gain.linearRampToValueAtTime(Math.min(0.2, volume), now + 0.1);

      this.humOsc.connect(this.humGain);
      this.humHarmonicOsc.connect(this.humGain);
      this.humGain.connect(this.masterGain);

      this.humOsc.start(now);
      this.humHarmonicOsc.start(now);
    } else if (this.humGain) {
      this.humOsc.frequency.setTargetAtTime(freqHz, now, 0.05);
      if (this.humHarmonicOsc) {
        this.humHarmonicOsc.frequency.setTargetAtTime(freqHz * 3, now, 0.05);
      }
      this.humGain.gain.setTargetAtTime(Math.min(0.2, volume), now, 0.05);
    }
  }

  public stopTransformerHum() {
    if (this.humGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.humGain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
      setTimeout(() => {
        try {
          this.humOsc?.stop();
          this.humHarmonicOsc?.stop();
          this.humOsc?.disconnect();
          this.humHarmonicOsc?.disconnect();
          this.humGain?.disconnect();
        } catch {}
        this.humOsc = null;
        this.humHarmonicOsc = null;
        this.humGain = null;
      }, 60);
    }
  }

  /**
   * PWM Switching Whine (High frequency MOSFET / IGBT inverter switching tone)
   */
  public updatePwmWhine(isActive: boolean, fswHz: number = 5000, volume: number = 0.04) {
    if (this.isMuted || !isActive) {
      this.stopPwmWhine();
      return;
    }
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    // Keep audible between 800Hz and 12kHz
    const clampedFsw = Math.max(800, Math.min(12000, fswHz));

    if (!this.pwmOsc) {
      this.pwmOsc = this.ctx.createOscillator();
      this.pwmGain = this.ctx.createGain();

      this.pwmOsc.type = 'sine';
      this.pwmOsc.frequency.setValueAtTime(clampedFsw, now);

      this.pwmGain.gain.setValueAtTime(0.001, now);
      this.pwmGain.gain.linearRampToValueAtTime(Math.min(0.08, volume), now + 0.1);

      this.pwmOsc.connect(this.pwmGain);
      this.pwmGain.connect(this.masterGain);

      this.pwmOsc.start(now);
    } else if (this.pwmGain) {
      this.pwmOsc.frequency.setTargetAtTime(clampedFsw, now, 0.05);
      this.pwmGain.gain.setTargetAtTime(Math.min(0.08, volume), now, 0.05);
    }
  }

  public stopPwmWhine() {
    if (this.pwmGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.pwmGain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
      setTimeout(() => {
        try {
          this.pwmOsc?.stop();
          this.pwmOsc?.disconnect();
          this.pwmGain?.disconnect();
        } catch {}
        this.pwmOsc = null;
        this.pwmGain = null;
      }, 60);
    }
  }

  public stopAll() {
    this.stopTransformerHum();
    this.stopPwmWhine();
  }
}

export const audioAcoustics = new AudioAcousticsEngine();
