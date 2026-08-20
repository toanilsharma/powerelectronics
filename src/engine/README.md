# Power Electronics Lab Suite — Shared Architecture & Engine Contracts

Welcome to the **Power Electronics Lab Suite** sitemap and architecture specification! This directory defines the reusable core interfaces, Web Worker contracts, theme tokens, and cross-lab communication protocols that power the lab suite.

---

## 🏗️ Architecture Overview

The lab suite is built around 4 modular layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        APP CONTAINER (App.tsx)                        │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
        ┌───────────▼───────────┐        ┌───────────▼───────────┐
        │  SOFT STARTER LAB     │        │  HARMONICS & APF LAB  │
        │  (Solid-State SCR)    │        │  (IEEE 519 / FFT)     │
        └───────────┬───────────┘        └───────────┬───────────┘
                    │                                │
┌───────────────────▼────────────────────────────────▼───────────────────┐
│                      SHARED ARCHITECTURAL LAYER                        │
├────────────────────────────────────────────────────────────────────────┤
│ 1. engine/types.ts       : ILabEngine<TParams, TState> & WorkerContract│
│ 2. theme/                : Colors, IndustrialPanel, StatusLamp, Scope │
│ 3. components/shared/    : SpotlightTour Overlay                       │
│ 4. utils/waveformBus.ts  : Cross-Lab Waveform & Spectrum Bus           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ 1. Core Engine Contract (`src/engine/types.ts`)

All simulation labs (Soft Starter, Harmonics, VFD, ATS/STS, Battery Charger) implement the unified `ILabEngine<TParams, TState>` interface:

```typescript
export interface ILabEngine<TParams, TState extends ILabStateBase> {
  init(initialParams?: Partial<TParams>): void;
  start(): void;
  stop(): void;
  reset(): void;
  updateParams(params: Partial<TParams>): void;
  getState(): TState;
  tick(dtSec: number): TState;
  subscribe(callback: (state: TState) => void): () => void;
}
```

### Web Worker `postMessage` Protocol
For high-frequency or multi-phase physics computations, engines run in dedicated Web Workers communicating via standard JSON messages:

```typescript
export interface WorkerMessageContract<TParams, TState> {
  type: 'INIT' | 'START' | 'STOP' | 'RESET' | 'TICK' | 'UPDATE_PARAMS' | 'STATE_UPDATE';
  payload?: {
    params?: Partial<TParams>;
    dtSec?: number;
    state?: TState;
  };
}
```

---

## 🎨 2. Design System Tokens & UI Primitives (`src/theme/`)

The design system enforces a sleek, cyber-industrial dark aesthetic across all lab modules:

### Color Palette (`src/theme/colors.ts`)
- **Cyber Green / Emerald**: `#00e5a0` (Primary active, operational state)
- **Slate Dark**: `#0d131f` / `#070a10` (Chassis background)
- **Amber Warning**: `#f59e0b` (Starting, current limit active)
- **Rose Trip**: `#f43f5e` (Overload trip, emergency stop)
- **Cyan Accent**: `#06b6d4` / `#38bdf8` (Oscilloscope traces, telemetries)

### Reusable UI Primitives (`src/theme/primitives.tsx`)
- `<IndustrialPanel title="..." icon={...}>`: Standardized glass panel card.
- `<StatusLamp label="..." state="STOPPED" />`: 6-state industrial annunciator status lamp.
- `<ScopeCRTContainer>`: Dark CRT oscilloscope container with grid lines.

---

## 🎓 3. Shared Spotlight Tour (`src/components/shared/SpotlightTour.tsx`)

A single reusable spotlight tour component powers guided learning mode across all labs:

```tsx
<SpotlightTour
  steps={MY_LAB_TOUR_STEPS}
  isOpen={isTourActive}
  onClose={() => setIsTourActive(false)}
/>
```

Features:
- **60% Dim Backdrop**: `bg-slate-950/60`
- **Target Cutout Ring**: `ring-4 ring-cyan-400/40 animate-pulse`
- **SVG Pointer Arrow**: Dynamic SVG line connecting spotlight target to tutorial modal card.
- **Auto-Scrolling**: Smoothly scrolls target element into view.

---

## 🌊 4. Cross-Lab Data Bus (`src/utils/waveformBus.ts`)

Connects independent labs together in real time:

```typescript
// Export live waveform from Soft Starter
exportWaveformToHarmonicsLab({
  sourceName: "Soft Starter SCR Current (α = 67°)",
  samples: [...],
  firingAngleDeg: 67,
  currentLimitPct: 300,
  fundamentalAmp: 269,
  peakAmps: 380,
  thdPercent: 34.2,
  harmonicSpectrum: [{ order: 1, magnitude: 269 }, ...]
});

// Subscribe in Harmonics / APF Lab
const unsubscribe = subscribeWaveformBus((payload) => {
  // Run IEEE 519 FFT Analysis
});
```

---

## 🚀 Step-by-Step: Adding a New Lab Module (e.g. VFD / ATS)

To add a new lab (e.g., **VFD Variable Frequency Drive Lab**):

1. **Define Types**: Create `src/types/vfd.ts` implementing `ILabStateBase`.
2. **Implement Engine**: Create `src/utils/vfdEngine.ts` implementing `ILabEngine<VfdParams, VfdState>`.
3. **Build UI Components**: Use `<IndustrialPanel>`, `<StatusLamp>`, and `<ScopeCRTContainer>` from `src/theme/primitives.tsx`.
4. **Create Guided Tour**: Define steps in `vfdTourSteps.ts` and wrap with `<SpotlightTour>`.
5. **Connect Waveform Bus**: Export VFD PWM carrier switching waveforms to `waveformBus`.
6. **Register Tab**: Add tab in `App.tsx`!
