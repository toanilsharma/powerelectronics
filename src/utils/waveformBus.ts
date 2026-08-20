/**
 * waveformBus.ts - Shared Waveform Bus Store between Soft Starter Lab & Harmonics/APF Lab
 * 
 * Enables exporting phase-angle chopped SCR current waveforms (with firing angle α notches,
 * inrush peaks, and harmonic distortion) from the Soft Starter lab directly into the
 * Harmonics & APF lab for IEEE 519 FFT spectrum analysis and APF filter compensation!
 */

export interface SharedWaveformPayload {
  sourceLab: 'SOFT_STARTER';
  timestamp: number;
  sourceName: string;
  samples: number[];
  firingAngleDeg: number;
  currentLimitPct: number;
  fundamentalAmp: number;
  peakAmps: number;
  thdPercent: number;
  harmonicSpectrum: { order: number; magnitude: number }[];
}

const LOCAL_STORAGE_KEY = 'pe_lab_shared_waveform_bus';
const EVENT_NAME = 'pe_waveform_bus_update';

/**
 * Exports captured waveform sample buffer + metadata to shared bus & localStorage
 */
export function exportWaveformToHarmonicsLab(
  payload: Omit<SharedWaveformPayload, 'timestamp' | 'sourceLab'>
): void {
  const fullPayload: SharedWaveformPayload = {
    ...payload,
    sourceLab: 'SOFT_STARTER',
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fullPayload));
  } catch (err) {
    console.warn('WaveformBus: Failed to write to localStorage:', err);
  }

  // Dispatch custom browser window event for instant reactive updates
  const event = new CustomEvent<SharedWaveformPayload>(EVENT_NAME, { detail: fullPayload });
  window.dispatchEvent(event);
}

/**
 * Reads shared waveform payload from bus store / localStorage
 */
export function loadWaveformFromBus(): SharedWaveformPayload | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SharedWaveformPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Subscribes to live updates on the waveform bus
 */
export function subscribeWaveformBus(callback: (payload: SharedWaveformPayload) => void): () => void {
  const handler = (e: Event) => {
    const customEvt = e as CustomEvent<SharedWaveformPayload>;
    if (customEvt.detail) {
      callback(customEvt.detail);
    }
  };

  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
