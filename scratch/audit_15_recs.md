# Comprehensive Deep-Dive Audit: Pulse Width Modulation (PWM) Module

A thorough audit of the **Pulse Width Modulation (PWM)** module (spanning Topic 6 in [`PowerSimFoundationLab.tsx`](file:///e:/GOOGLE%20AI%20STUDIO/PE%20Training%20LAB/PE%20LAB/src/components/PowerSimFoundationLab.tsx), the dedicated [`SinglePhaseInverter.tsx`](file:///e:/GOOGLE%20AI%20STUDIO/PE%20Training%20LAB/PE%20LAB/src/pages/SinglePhaseInverter.tsx) page, and [`InverterPhysics.ts`](file:///e:/GOOGLE%20AI%20STUDIO/PE%20Training%20LAB/PE%20LAB/src/engine/InverterPhysics.ts)) was conducted across all engineering, pedagogical, physical, and UI/UX dimensions.

---

## Executive Summary & Critical Codebase Disconnects Discovered

While the platform boasts rich sub-labs for SCRs (12 labs) and Controlled Rectifiers (10 labs), the **Pulse Width Modulation (PWM)** module has significant gaps and architectural defects:

| Defect / Audit Point | Current Codebase State in `PowerSimFoundationLab.tsx` | Impact on Student Learning |
| :--- | :--- | :--- |
| **1. Missing Step Guide** | In [`getStepGuide()`](file:///e:/GOOGLE%20AI%20STUDIO/PE%20Training%20LAB/PE%20LAB/src/components/PowerSimFoundationLab.tsx#L308-L485), `case 'pwm':` is **100% missing**. | Students clicking the guided simulation zone see broken generic default steps. |
| **2. Progress Bar Math Error** | Line 515: `const progressPct = (completedCount / 5) * 100;` divides by 5 instead of 6. | Completing all 6 foundation topics causes a progress bar overflow to 120%. |
| **3. Empty Theory Notebook** | [`showTheoryDrawer`](file:///e:/GOOGLE%20AI%20STUDIO/PE%20Training%20LAB/PE%20LAB/src/components/PowerSimFoundationLab.tsx#L9152-L9800) has zero theory/formulas block for `activeTopic === 'pwm'`. | Clicking `📖 THEORY NOTEBOOK` renders an empty panel. |
| **4. Unipolar PWM Disabled** | Line 5137: `id: 'unipolar'` is hardcoded to `disabled: true`. | Students cannot compare 2-Level Bipolar vs 3-Level Unipolar PWM (a primary academic exam topic). |
| **5. Fake SVPWM Mode** | Space Vector PWM button is selectable, but switches to identical half-bridge SPWM with no hexagonal vector plane. | Students miss space vector modulation physics and the 15.5% DC voltage boost principle. |
| **6. Blank IV Canvas** | Lines 520–1030 draw IV curves for Diode, Transistor, Rectifier, SCR, but **nothing** for PWM. | The left scope canvas displays blank axes with no educational curve. |
| **7. Time-Scale Disconnect** | Scope uses an artificial scaling factor `* 0.15` on carrier frequency to fit pulses. | Real switching physics ($5\,\text{kHz} = 200\,\mu\text{s}$) cannot be analyzed in true microsecond slow-motion. |
| **8. Layout Overflow** | The page scrolls vertically through multiple large panels, breaking single-screen situational awareness. | Requires constant scrolling between sliders and waveform results. |

---

# The 15 Most Required Implementation Suggestions

```
                                  PWM MODULE ARCHITECTURAL BLUEPRINT
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [TOP BAR] Topic 6: Pulse Width Modulation | 6-Stage Curriculum Stepper | 100% Fit-to-Screen Cockpit    │
├──────────────────────────────────────────┬────────────────────────────────────────────────────────────┤
│  LEFT DOCK: INTERACTIVE LAB SELECTOR     │  CENTER WORKSPACE: SPLIT-VIEW VISUAL ENGINE                │
│  1. Half-Bridge 2-Level SPWM             │  ┌──────────────────────────────────────────────────────┐  │
│  2. Full-Bridge Bipolar vs Unipolar      │  │ VIEW A: Precision Dual Carrier-Modulation Scope      │  │
│  3. Dead-Time & Shoot-Through Lab        │  │ (vref vs vtri, microsecond zoom, t_dead blanking)    │  │
│  4. Overmodulation & Square-Wave         │  ├──────────────────────────────────────────────────────┤  │
│  5. Space Vector PWM (SVPWM) Hexagon     │  │ VIEW B: Animated High-Fidelity IEC 60617 Schematic   │  │
│  6. LC Filter & Harmonic FFT Analyzer    │  │ (Dynamic current vectors, e- drift, diode freewheel) │  │
│  7. Professor Classroom Drills           │  └──────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────┴────────────────────────────────────────────────────────────┤
│  BOTTOM CONTROLS & TELEMETRY DOCK (Zero Page Scroll)                                                  │
│  [Sliders + Steppers: Ma, fc, f1, t_dead] | [Time Dilation: 1x, 0.1x, 0.01x, Freeze, Single-Step]     │
│  [Telemetry HUD: V1(rms), THD %, f0 Cutoff, Psw vs Pcond, η%, Volt-Sec Balance, Shoot-Through Status]  │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Pedagogy & Step-Wise Learning Architecture

### 1. Progressive 5-Stage Step-by-Step Guided Curriculum
Implement the missing `case 'pwm':` in [`getStepGuide()`](file:///e:/GOOGLE%20AI%20STUDIO/PE%20Training%20LAB/PE%20LAB/src/components/PowerSimFoundationLab.tsx#L308-L485) with a structured pedagogical progression:
- **Step 1 (Carrier & Reference Foundations):** Adjust fundamental frequency $f_1$ ($50\,\text{Hz}$) and triangle carrier $f_c$ ($5\,\text{kHz}$). Learn frequency modulation ratio $m_f = f_c / f_1$.
- **Step 2 (Modulation Index & Voltage Control):** Sweep $M_a$ from $0.1$ to $1.0$ in the linear zone. Observe that fundamental AC voltage satisfies $V_{1(rms)} = M_a \cdot \frac{V_{dc}}{2\sqrt{2}}$.
- **Step 3 (Dead-Time Insertion & Shoot-Through Defense):** Reduce dead-time $t_{\text{dead}}$ from $2.5\,\mu\text{s}$ down to $0.0\,\mu\text{s}$. Observe upper/lower bridge cross-conduction, DC bus crowbar short-circuit, and diode freewheeling dead-time distortion.
- **Step 4 (Overmodulation to Square Wave Transition):** Increase $M_a > 1.0$ up to $3.24$. Observe pulse-dropping phenomenon at the peaks, harmonic sideband generation, and convergence to the square-wave voltage limit $\frac{4}{\pi} \frac{V_{dc}}{2}$.
- **Step 5 (LC Filter Attenuation & Harmonic Elimination):** Tune filter choke $L$ and capacitor $C$ to set cutoff frequency $f_0 \ll f_c$. Verify that raw switching pulses $V_{sw}$ are filtered into a pure sinusoidal output with $\text{THD} < 5\%$ complying with IEEE 519.

### 2. Interactive "Professor Classroom Drills" Challenge System
Create a dedicated component `PWMProfessorClassroomDrillsLab.tsx` (mirroring `SCRProfessorClassroomDrillsLab` and `PhaseControlProfessorDrillsLab`):
- **Drill 1 (Voltage Target Challenge):** *"Set $M_a$ and $V_{dc}$ to produce exactly $230\,\text{V}_{\text{RMS}} \pm 1\,\text{V}$ AC output on the load."*
- **Drill 2 (Harmonic Elimination Challenge):** *"Given an inverter switching at $f_c = 10\,\text{kHz}$, select $L$ and $C$ to suppress carrier ripple below $3\%$ THD without causing resonant peaking."*
- **Drill 3 (Dead-Time Crossover Compensation):** *"Identify the zero-crossing voltage error $\Delta V_{dt} = 4 f_c t_{\text{dead}} V_{dc}$ and calculate the software compensation offset."*
- **Drill 4 (Shoot-Through Interlock Test):** *"Diagnose why the bridge tripped on overcurrent at $t_{\text{dead}} = 0.2\,\mu\text{s}$ with an IGBT turn-off fall time $t_f = 0.45\,\mu\text{s}$."*
- **Drill 5 (Bipolar vs Unipolar Ripple Test):** *"Configure both modulators and measure why Unipolar modulation doubles effective output ripple frequency to $2 f_c$, requiring a filter 4x smaller."*

### 3. Integrated Academic Theory Notebook Drawer with Interactive LaTeX Math
Fill the empty [`showTheoryDrawer`](file:///e:/GOOGLE%20AI%20STUDIO/PE%20Training%20LAB/PE%20LAB/src/components/PowerSimFoundationLab.tsx#L9152-L9800) block for PWM with interactive equations linked to live state variables:

$$\begin{aligned}
\text{Linear Modulation Range } (M_a \le 1.0): & \quad V_{1(rms)} = M_a \cdot \frac{V_{dc}}{2\sqrt{2}} \\
\text{Overmodulation Range } (1.0 < M_a \le 3.24): & \quad V_{1(rms)} = \frac{V_{dc}}{2\sqrt{2}} \cdot \left[ \frac{2}{\pi} \arcsin\left(\frac{1}{M_a}\right) + \frac{2}{\pi} M_a \sqrt{1 - \left(\frac{1}{M_a}\right)^2} \right] \\
\text{Square-Wave Peak Limit } (M_a \to \infty): & \quad V_{1(rms)} = \frac{4}{\pi} \frac{V_{dc}}{2\sqrt{2}} \approx 0.450 V_{dc} \\
\text{Dead-Time Voltage Drop}: & \quad \Delta V_{out} = \text{sign}(i_L) \cdot f_c \cdot t_{\text{dead}} \cdot V_{dc} \\
\text{LC Resonant Cutoff}: & \quad f_0 = \frac{1}{2\pi \sqrt{L C}} \quad \text{Condition: } 10 f_1 < f_0 < \frac{1}{5} f_c
\end{aligned}$$

---

## Part 2: Visual & Diagrammatic Excellence (Teaching-Centric Animations)

### 4. Dual Carrier-Modulation Comparator Scope with Microsecond Zoom
Replace the compressed static sine/triangle drawing with a dual-view oscilloscope:
- **Macro View (AC Fundamental Period $20\,\text{ms}$):** Shows the full $50\,\text{Hz}$ reference envelope, synthesized PWM pulse train, and sinusoidal load voltage.
- **Micro View (Carrier Period Zoom $100\,\mu\text{s}$):** An expanded microscope visualizer showing:
  - Exact reference sine slice $v_{\text{ref}}(t)$ intersecting triangle carrier $v_{\text{tri}}(t)$.
  - Upper gate signal $G_1$ going LOW.
  - **Dead-time blanking gap ($t_{\text{dead}}$):** Highlighted in glowing amber during which *both* $G_1$ and $G_2$ are LOW.
  - Lower gate signal $G_2$ going HIGH only after $t_{\text{dead}}$ elapses.
  - Resulting pole voltage $V_A(t)$ transitioning between $+V_{dc}/2$ and $-V_{dc}/2$.

### 5. Multi-Topology Switching Matrix (Half-Bridge, Full-Bridge Bipolar, Unipolar 3-Level)
Enable students to toggle between all 3 standard inverter topologies on the fly:

| Topology | Number of Switches | Leg Voltages | Output Voltage Levels | Dominant Harmonic Ripple Peak |
| :--- | :--- | :--- | :--- | :--- |
| **Half-Bridge SPWM** | 2 Switches ($Q_1, Q_2$), Split DC Rail | $V_A \in \{+V_{dc}/2, -V_{dc}/2\}$ | 2 Levels ($\pm V_{dc}/2$) | Centered at $f_c$ |
| **Full-Bridge Bipolar** | 4 Switches ($Q_1-Q_4$), Complementary | $V_A, V_B$ switched out of phase | 2 Levels ($\pm V_{dc}$) | Centered at $f_c$ |
| **Full-Bridge Unipolar** | 4 Switches ($Q_1-Q_4$), Phase-Shifted | Leg A & Leg B modulated independently | **3 Levels** ($+V_{dc}, 0, -V_{dc}$) | **Doubled to $2f_c$** |

*Pedagogical visual:* When switching to Unipolar, show how the zero-voltage state ($0\,\text{V}$) freewheels current through $Q_1 / D_3$ or $Q_2 / D_4$, keeping inductor current ripple significantly smaller.

### 6. Dynamic Charge & Current Conduction Vectors
Animate electron drift and current paths directly inside the SVG schematic:
- **Active Conduction:** When $Q_1$ is ON, draw high-intensity green flux lines flowing from $+V_{dc}$ through the MOSFET channel to switching node $V_{sw}$.
- **Freewheeling Diode Conduction:** When switches turn OFF during inductive lag or dead-time, show current being forced through anti-parallel diode $D_2$ against $-V_{dc}$ (highlighting diode forward voltage drop $V_F$ and reverse recovery charge $Q_{rr}$).
- **Inductor Magnetic Energy Field:** Display an expanding/contracting flux halo around inductor $L$ proportional to instantaneous inductor energy $E = \frac{1}{2} L i_L^2$.

### 7. Interactive Space Vector PWM (SVPWM) Hexagon Plane
Implement the complete SVPWM engine:
- Visual display of the **Hexagonal Complex Voltage Plane** with 6 active voltage vectors ($V_1[100]$ to $V_6[101]$) of length $\frac{2}{3}V_{dc}$, and 2 zero vectors ($V_0[000], V_7[111]$).
- Rotating continuous reference vector $\vec{V}^*$ tracking circular trajectory.
- Real-time **Sector Detection (Sector I through VI)** with animated dwell-time bars showing volt-second decomposition:
  $$\vec{V}^* \cdot T_s = \vec{V}_\alpha T_a + \vec{V}_\beta T_b + \vec{V}_0 T_0$$
- Clear educational readout demonstrating why SVPWM yields $\frac{2}{\sqrt{3}} \approx 1.155$ (15.5% higher fundamental voltage) compared to traditional SPWM.

---

## Part 3: Physics Engine & Mathematical Correctness

### 8. 100% Real Piecewise Modulation Physics Engine
Upgrade the physics engine from empirical approximations to the exact closed-form analytical equations:
- **Linear Zone ($0 < M_a \le 1.0$):**
  $$V_{1(peak)} = M_a \cdot \frac{V_{dc}}{2}, \quad V_{1(rms)} = \frac{M_a V_{dc}}{2\sqrt{2}}$$
- **Overmodulation Zone 1 ($1.0 < M_a \le 3.24$):**
  Calculate exact crossover angle $\alpha_r = \arcsin(1 / M_a)$. The reference wave is clipped at the carrier peak, resulting in pulse dropping at center of half-cycle.
- **Square-Wave Zone ($M_a \ge 3.24$):**
  The inverter ceases to switch at high frequency and operates as a fundamental square wave:
  $$V_{1(rms)} = \frac{4}{\pi} \frac{V_{dc}}{2\sqrt{2}} \approx 0.4502 V_{dc}$$
- **IV Characteristic Transfer Curve:** Implement the transfer curve on the left canvas showing $V_1(rms)$ vs $M_a$, displaying the live operating point moving along the curve as the user moves the slider.

### 9. Exact Dead-Time Physics & Shoot-Through Interlock Simulation
Model real power semiconductor switching times:
- If $t_{\text{dead}} < t_{\text{off(delay)}} + t_{\text{fall}}$ (e.g. $t_{\text{dead}} = 0\,\mu\text{s}$):
  - Trigger **Catastrophic Shoot-Through Short-Circuit**.
  - Calculate fault current: $I_{sc} = \frac{V_{dc}}{R_{ds(on),Q1} + R_{ds(on),Q2} + R_{bus}} \approx 2000\,\text{A}$.
  - Animate fuse melting, bus capacitor voltage collapsing to $0\,\text{V}$, and trigger alarm annunciator.
- If $t_{\text{dead}} > 0$:
  - Calculate real zero-crossing crossover distortion.
  - When load current $I_{\text{out}}$ crosses zero, dead-time delays polarity reversal, creating a flat-spot zero-clamp in the fundamental current waveform and increasing 3rd and 5th harmonic content.

### 10. High-Fidelity LC Filter Resonance & Attenuation Engine
Model the full second-order low-pass filter transfer function:
$$H(s) = \frac{V_{out}(s)}{V_{sw}(s)} = \frac{1}{L C s^2 + \frac{L}{R_{load}} s + 1}$$
- Calculate damping factor $\zeta = \frac{1}{2 R_{load}} \sqrt{\frac{L}{C}}$ and resonant frequency $f_0 = \frac{1}{2\pi\sqrt{LC}}$.
- If $f_0$ approaches $f_c$ or $f_1$, show resonant amplification and voltage ringing.
- Verify **Volt-Second Inductor Balance**:
  $$\int_0^{T_s} v_L(t) \, dt = 0 \iff \langle v_{sw} \rangle_{T_s} = v_{out}(t)$$
  Display dynamic color-coded volt-second balance bars ($+V\cdot s$ charging area vs $-V\cdot s$ discharging area).

### 11. Real-Time Dynamic FFT Harmonic Spectrum Analyzer
Display an interactive bar chart of harmonic orders:
- **Fundamental ($f_1$):** Peak at order 1 ($50\,\text{Hz}$).
- **Switching Sidebands:** Harmonics grouped around multiples of carrier ratio $m_f$:
  $$\text{Harmonics at: } h = j \cdot m_f \pm k$$
  - For Bipolar SPWM: Sidebands appear around $m_f, 2m_f, 3m_f$.
  - For Unipolar SPWM: First carrier cluster at $m_f$ cancels out completely; harmonics only appear at $2m_f, 4m_f$, proving why output filter size can be halved.
- **Odd / Even Carrier Ratio Rule ($m_f$):** Demonstrate why $m_f$ must be an odd integer to enforce half-wave quarter-wave symmetry ($f(t) = -f(t + T/2)$), which mathematically eliminates all even harmonics ($h = 2, 4, 6...$).

---

## Part 4: Slow-Motion Visuals & Time-Dilation Engine

### 12. Multi-Timescale Physics & Carrier Phase-Locked Freeze Engine
A major limitation in simulating high-frequency PWM ($5\,\text{kHz} - 20\,\text{kHz}$) on a browser screen is that carrier cycles occur too quickly ($200\,\mu\text{s}$) to observe smoothly alongside the $50\,\text{Hz}$ envelope ($20\,\text{ms}$).

Implement a dual-clock simulation runner:
- **Real-Time Mode (1.0x):** Smooth audio acoustics and steady-state RMS readings.
- **Slow-Motion Speeds (0.1x, 0.01x, 0.001x):** Time-dilated execution where individual carrier triangles sweep smoothly across the canvas over 2–5 seconds.
- **Phase-Locked Freeze & Manual Stepper (Step $\Delta t = 1\,\mu\text{s}$):**
  - Allows students to freeze the inverter at any electrical angle (e.g. $\theta = 45^\circ$, $\theta = 90^\circ$, or zero-crossing $\theta = 0^\circ$).
  - Click `[STEP +1µs]` or `[STEP +10µs]` to advance the carrier triangle step-by-step and witness the exact instant when $v_{\text{ref}} > v_{\text{tri}}$, triggering gate drive fire pulses.

---

## Part 5: UI/UX & Fit-to-Screen / Zero-Scroll Layout

### 13. "Fit-to-Screen" Ergonomic Single-Screen Cockpit (`100vh`)
Eliminate vertical scrolling by adopting an industrial split-pane layout:
- Height locked to `h-screen` (`100vh`) with `overflow-hidden`.
- **Top 6%:** Compact header with topic tabs, curriculum progress indicator (fixed to $\div 6$), and operating mode pill.
- **Center 64%:** Split-screen visual stage:
  - Left panel (40% width): Live Transfer Characteristic Curve / Scope Microscope / SVPWM Hexagon.
  - Right panel (60% width): Interactive Animated IEC 60617 Schematic with active heat dissipation halos.
- **Bottom 30%:** Unified Controls & Telemetry Dock (parameter sliders on the left, live digital readouts on the right).

---

## Part 6: Button & Control Section Audit

### 14. Industrial Precision Control Surface & Quick-Presets
Replace loose sliders with a dedicated control panel:
- **Direct Numeric Steppers:** Increment/decrement buttons beside every slider:
  - $M_a$: Stepper $\pm 0.01$ (range $0.05 - 1.50$).
  - $f_c$: Stepper $\pm 500\,\text{Hz}$ (range $1\,\text{kHz} - 20\,\text{kHz}$).
  - $t_{\text{dead}}$: Stepper $\pm 0.1\,\mu\text{s}$ (range $0.0\,\mu\text{s} - 5.0\,\mu\text{s}$).
  - $V_{dc}$: Stepper $\pm 10\,\text{V}$ (range $48\,\text{V} - 800\,\text{V}$).
- **One-Click Industrial Presets:**
  - ⚡ *Grid-Tied Solar Inverter:* $V_{dc} = 400\,\text{V}, M_a = 0.85, f_c = 16\,\text{kHz}, t_{\text{dead}} = 1.2\,\mu\text{s}$ (High efficiency, low THD).
  - 🚗 *EV Traction Inverter:* $V_{dc} = 800\,\text{V}, M_a = 0.95, f_c = 8\,\text{kHz}, t_{\text{dead}} = 2.0\,\mu\text{s}$ (SiC MOSFET high-power).
  - 🏭 *VFD Motor Drive (Low Speed):* $V_{dc} = 560\,\text{V}, M_a = 0.30, f_1 = 15\,\text{Hz}$ (Constant $V/f$ ratio).
  - ⚠️ *Extreme Shoot-Through:* $t_{\text{dead}} = 0.0\,\mu\text{s}$ (Demonstrates instant breaker trip).
  - 💥 *Overmodulation Saturation:* $M_a = 1.40$ (Visualizes pulse-dropping and 5th/7th harmonic spikes).

---

## Part 7: Results & Telemetry Readouts Section Audit

### 15. Comprehensive Power Quality & Efficiency Telemetry Dashboard
Upgrade the current 3-item badge list into a high-density industrial telemetry bar:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🟢 NORMAL LINEAR │ V1(rms): 120.2 V │ I1(rms): 12.0 A │ Pout: 1442 W │ THD: 1.84% │ f0: 1125 Hz │ Psw: 24.2 W │ Pcond: 18.6 W │ η: 97.1% │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

The telemetry dashboard should feature real-time metrics calculated from active physics:
1. **$V_{1(rms)}$ (Fundamental Output Voltage):** Measured in Volts RMS.
2. **$\text{THD}_v$ (Total Harmonic Distortion):** Calculated across 50 harmonic orders against IEEE 519 5% limits:
   $$\text{THD} = \frac{\sqrt{\sum_{h=2}^{50} V_h^2}}{V_1} \times 100\%$$
3. **LC Cutoff Ratio ($f_c / f_0$):** Displays filter attenuation factor.
4. **Inductor Current Ripple ($\Delta I_{L(p-p)}$):**
   $$\Delta I_L = \frac{V_{dc} - V_{out}}{L} \cdot \frac{D}{f_c}$$
5. **Loss Breakdown ($P_{\text{cond}}$ vs $P_{\text{sw}}$):**
   - Conduction Loss: $P_{\text{cond}} = 2 \cdot I_{rms}^2 \cdot R_{ds(on)}$
   - Switching Loss: $P_{\text{sw}} = 2 \cdot f_c \cdot V_{dc} \cdot I_{avg} \cdot (t_r + t_f)$
6. **Total Converter Efficiency ($\eta\%$):**
   $$\eta = \frac{P_{out}}{P_{out} + P_{\text{cond}} + P_{\text{sw}} + P_{\text{core}}} \times 100\%$$
7. **Dead-Time Distortion Index ($\Delta V_{dt}\%$):** Displays output voltage loss percentage caused by blanking intervals.

---

## Suggested Implementation Roadmap

To execute these suggestions effectively, implementation should be carried out in two focused steps:

1. **Step 1: Fix Core Codebase Bugs & Layout in `PowerSimFoundationLab.tsx`**
   - Correct the 5-topic progress divisor to 6 (`progressPct = (completedCount / 6) * 100`).
   - Add the missing `case 'pwm':` inside `getStepGuide()` with the 5 curriculum steps.
   - Populate the empty `showTheoryDrawer` for PWM with interactive LaTeX formulas.
   - Fix viewport styling to ensure zero vertical scrolling (`fit-to-screen`).
   - Connect the blank left IV Canvas to draw the active $V_{1(rms)}$ vs $M_a$ characteristic curve.

2. **Step 2: Build the Dedicated Interactive Sub-Lab Module (`PWMCarrierModulationLab.tsx`)**
   - Implement the dual microsecond zoom scope ($v_{\text{ref}}$ vs $v_{\text{tri}}$ with $t_{\text{dead}}$ amber gap).
   - Implement Unipolar 3-Level and Bipolar full-bridge modulation toggle.
   - Implement the interactive SVPWM Hexagonal sector plane.
   - Implement the Professor Classroom Drills with interactive verification.