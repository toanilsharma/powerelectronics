/**
 * SoftStarterEngine.js - Physically Accurate Web Worker Engine for Induction Motor Soft Starter
 * 
 * PHYSICS & ELECTRICAL MODELING INCLUDED:
 * 1. Per-Phase Induction Motor Equivalent Circuit Solved per Slip (Rs, Xs, Xm, Rr/s, Xr)
 * 2. Newton-Euler Mechanical Dynamics (dω/dt = (Te - Tload) * Tbase / J_total)
 * 3. Non-Linear Load Torque Models (Pump, Fan, Conveyor, Crusher, Compressor)
 * 4. Soft Start Modes (Voltage Ramp, Current Limit, Kickstart Pulse, Jog)
 * 5. Phase-Angle Thyristor Waveform Chopping (dt_e = 0.1ms, 2kHz Ring Buffer Scope)
 * 6. Bypass Contactor KM1 Transition & SCR Conduction Losses (P_scr = 3 * 2 * 1.2V * I_scr)
 * 7. Soft Stop Ramp & Controlled Hydraulic Deceleration
 * 8. Thermal Overload Protection Model (IEC 60947-4-2 Class 10/20/30) & Start Counter
 * 9. Utility Bus Voltage Dip (dipPercent = I_line / I_sc * 100%) & Flicker Visualizer
 * 10. Hydraulic Joukowsky Water Hammer Pressure Surge Head Calculation (ΔH = c * Δv / g)
 * 11. Topology Configuration (Inline vs. Inside-Delta SCR Rating)
 */

class SoftStarterEngine {
  constructor() {
    // -------------------------------------------------------------------------
    // 1. MOTOR EQUIVALENT CIRCUIT PARAMETERS (160 kW / 415 V / 269 A / 4-pole)
    // -------------------------------------------------------------------------
    this.motorParams = {
      P_rated_kW: 160,       // Rated Mechanical Output Power (kW)
      V_line_V: 415,         // Rated Line-to-Line RMS Voltage (V)
      I_fla_A: 269,          // Full Load Amperes (A)
      freq_Hz: 50,           // Rated Grid Frequency (Hz)
      poles: 4,              // Number of Stator Poles
      
      // Per-Unit Equivalent Circuit Parameters (Stator Referred)
      Rs: 0.025,             // Stator Resistance (pu)
      Xs: 0.080,             // Stator Leakage Reactance (pu)
      Xm: 3.500,             // Magnetizing Reactance (pu)
      Rr: 0.022,             // Rotor Resistance (pu)
      Xr: 0.090,             // Rotor Leakage Reactance (pu)
    };

    // Derived Motor Constants
    this.w_sync_rad = (2 * Math.PI * this.motorParams.freq_Hz) / (this.motorParams.poles / 2); // 157.08 rad/s
    this.T_base_Nm = (this.motorParams.P_rated_kW * 1000) / this.w_sync_rad;                     // 1018.6 N·m

    // -------------------------------------------------------------------------
    // 2. SCENARIO & MECHANICAL LOAD PARAMETERS
    // -------------------------------------------------------------------------
    this.scenarios = {
      pump: { name: 'Centrifugal Pump', J: 2.5, type: 'pump', flowVelRated_ms: 2.5 },
      fan: { name: 'High-Inertia Fan', J: 28.0, type: 'fan', flowVelRated_ms: 0.0 },
      conveyor: { name: 'Loaded Belt Conveyor', J: 8.5, type: 'conveyor', flowVelRated_ms: 0.0 },
      crusher: { name: 'Rock Crusher', J: 14.0, type: 'crusher', flowVelRated_ms: 0.0 },
      compressor: { name: 'Reciprocating Compressor', J: 6.0, type: 'compressor', flowVelRated_ms: 0.0 },
    };

    this.currentScenario = 'pump';
    this.J_total = this.scenarios.pump.J; // Total System Inertia (kg·m²)

    // -------------------------------------------------------------------------
    // 3. SOFT STARTER CONTROL CONFIGURATION
    // -------------------------------------------------------------------------
    this.config = {
      startMode: 'ramp',     // 'ramp' | 'currentLimit' | 'kickstart' | 'jog'
      vStartPct: 30,         // Initial Ramp Starting Voltage (%)
      tRampSec: 10,          // Acceleration Voltage Ramp Time (s)
      iLimitPu: 3.5,         // Current Limit Threshold (pu of FLA)
      vKickPct: 70,          // Kickstart Pulse Voltage (%)
      tKickSec: 0.5,         // Kickstart Pulse Duration (s)
      tStopSec: 10,          // Soft Stop Voltage Deceleration Ramp Time (s)
      
      tripClass: 'Class10',  // 'Class10' (120s) | 'Class20' (240s) | 'Class30' (360s)
      maxStartsPerHour: 6,   // Max Cold Starts Allowed per Hour
      iScRatio: 20,          // Utility Short Circuit Ratio (I_sc / I_FLA)
      topology: 'inline',    // 'inline' | 'insideDelta'
    };

    // -------------------------------------------------------------------------
    // 4. ENGINE STATE VARIABLES
    // -------------------------------------------------------------------------
    this.state = 'STOPPED';  // 'STOPPED' | 'STARTING' | 'RUNNING' | 'BYPASSED' | 'STOPPING' | 'TRIPPED'
    this.w_pu = 0.0;         // Motor Rotor Speed (pu of synchronous speed)
    this.slip = 1.0;         // Motor Slip s = 1.0 - w_pu
    this.timerSec = 0.0;     // State Elapsed Timer (s)
    
    this.V_rms_pct = 0.0;    // Output RMS Voltage (% of Rated)
    this.I_rms_pu = 0.0;     // Line RMS Current (pu of FLA)
    this.alpha_deg = 180.0;  // Thyristor Firing Angle α (degrees)
    
    this.Te_pu = 0.0;        // Developed Electromagnetic Torque (pu)
    this.Tl_pu = 0.0;        // Load Resistance Torque (pu)
    
    this.thermalCapPct = 0.0; // IEC Thermal Capacity Accumulator (% of trip limit)
    this.startsCount = 0;     // Number of starts performed in current hour
    this.cooldownSec = 0.0;   // Cooldown Timer remaining (s)
    
    this.dipPct = 0.0;        // Bus Voltage Dip Percentage (%)
    this.surgeHead_m = 0.0;   // Joukowsky Water Hammer Pressure Surge Head (m)
    this.scrLossW = 0.0;      // Total SCR Conduction Power Loss (W)

    // -------------------------------------------------------------------------
    // 5. WAVEFORM & PROFILE RING BUFFERS FOR SCOPE VISUALIZATION
    // -------------------------------------------------------------------------
    this.waveformBufferSize = 160; // 2 full electrical cycles (40ms) sampled at 4kHz (160 points)
    this.waveformBuffer = {
      time: new Float32Array(this.waveformBufferSize),
      v_grid: new Float32Array(this.waveformBufferSize),
      v_out: new Float32Array(this.waveformBufferSize),
      i_line: new Float32Array(this.waveformBufferSize),
    };

    this.profileBuffer = {
      time: [],
      speed: [],
      current: [],
      torque: [],
      voltage: [],
    };

    this.dt_mech = 0.001; // Mechanical integration step dt = 1 ms
    this.electricalTime = 0.0;
  }

  // ===========================================================================
  // 1. MOTOR EQUIVALENT CIRCUIT SOLVER
  // ===========================================================================
  /**
   * Solves per-phase equivalent circuit impedance for slip s.
   * Z_eq(s) = Rs + jXs + (jXm || (Rr/s + jXr))
   * 
   * Physics: As motor accelerates (s drops from 1 -> 0.02), Rr/s increases from Rr to ~50*Rr.
   * This reduces rotor current drawn and increases overall input motor impedance.
   */
  calculateMotorImpedance(slip) {
    const s = Math.max(0.001, Math.min(1.0, slip));
    const { Rs, Xs, Xm, Rr, Xr } = this.motorParams;

    // Rotor branch impedance: Z_r = (Rr / s) + j Xr
    const A = Rr / s;
    const B = Xr;
    const M = Xm;

    // Parallel combination Z_parallel = (jM * (A + jB)) / (A + j(B + M))
    const denom = A * A + (B + M) * (B + M);
    const R_parallel = (M * M * A) / denom;
    const X_parallel = (M * (A * A + B * (B + M))) / denom;

    // Total Equivalent Motor Impedance: Z_eq = (Rs + R_parallel) + j (Xs + X_parallel)
    const R_total = Rs + R_parallel;
    const X_total = Xs + X_parallel;
    const Z_mag = Math.sqrt(R_total * R_total + X_total * X_total);

    // Rotor current fraction: I_r = I_line * (Xm / |Rr/s + j(Xr + Xm)|)
    const Z_rotor_mag = Math.sqrt(A * A + (B + M) * (B + M));
    const rotorCurrentRatio = Xm / Z_rotor_mag;

    return { Z_mag, R_parallel, A_rotor: A, rotorCurrentRatio };
  }

  /**
   * Calculates Stator Line Current and Electromagnetic Torque Te.
   * Te_pu = (3 * Ir^2 * Rr/s) / w_sync (in per-unit = Ir^2 * (Rr/s))
   */
  calculateMotorPerformance(V_applied_pu, slip) {
    const { Z_mag, A_rotor, rotorCurrentRatio } = this.calculateMotorImpedance(slip);
    
    // Line Current (pu): I_line = V_applied / |Z_eq|
    const I_line_pu = V_applied_pu / Math.max(0.05, Z_mag);
    
    // Rotor Current (pu): Ir = I_line * rotorCurrentRatio
    const I_rotor_pu = I_line_pu * rotorCurrentRatio;
    
    // Developed Torque (pu): Te = Ir^2 * (Rr / s)
    const Te_pu = I_rotor_pu * I_rotor_pu * A_rotor;

    return { I_line_pu, Te_pu };
  }

  // ===========================================================================
  // 2. NON-LINEAR LOAD TORQUE MODELS
  // ===========================================================================
  /**
   * Computes load counter-torque T_load (pu) based on scenario type and rotor speed w_pu.
   */
  calculateLoadTorque(w_pu) {
    const w = Math.max(0.0, Math.min(1.0, w_pu));
    const type = this.scenarios[this.currentScenario].type;

    switch (type) {
      case 'pump':
        // Centrifugal Pump: T = 0.05 (stiction) + 0.95 * w^2 (Affinity Law)
        return 0.05 + 0.95 * w * w;

      case 'fan':
        // High-Inertia Fan: T = 0.10 + 0.90 * w^2 (Quadratic Aerodynamic Torque)
        return 0.10 + 0.90 * w * w;

      case 'conveyor':
        // Belt Conveyor: High breakaway stiction (1.30 pu) at zero speed -> constant friction (0.90 pu)
        return w < 0.02 ? 1.30 : 0.90;

      case 'crusher':
        // Rock Crusher: Heavy base load (0.90 pu) + 0.35 * sin(6*pi*w) periodic crushing impact load
        return 0.90 + 0.35 * Math.sin(6 * Math.PI * w);

      case 'compressor':
        // Reciprocating Compressor: T = 0.20 + 0.80 * w (Linear Displacement Pressure Load)
        return 0.20 + 0.80 * w;

      default:
        return 0.05 + 0.95 * w * w;
    }
  }

  // ===========================================================================
  // 3. THYRISTOR FIRING ANGLE ALGEBRA & CONDUCTION LOSSES
  // ===========================================================================
  /**
   * Converts desired RMS Voltage V_rms_pct to Thyristor Firing Angle α (degrees).
   * V_rms(α) = V_peak * sqrt( (1/pi) * [ (pi - α) + sin(2α)/2 ] )
   */
  vRmsToAlphaDeg(vRmsPct) {
    const vNorm = Math.max(0.0, Math.min(1.0, vRmsPct / 100.0));
    if (vNorm >= 0.999) return 0.0;
    if (vNorm <= 0.001) return 180.0;

    // Newton-Raphson Solver to find alpha for desired V_rms
    let alpha = (1.0 - vNorm) * Math.PI; // Initial guess
    for (let iter = 0; iter < 10; iter++) {
      const f = (1.0 / Math.PI) * (Math.PI - alpha + Math.sin(2 * alpha) / 2.0) - vNorm * vNorm;
      const df = (1.0 / Math.PI) * (-1.0 + Math.cos(2 * alpha));
      if (Math.abs(df) < 1e-6) break;
      alpha = alpha - f / df;
      alpha = Math.max(0.0, Math.min(Math.PI, alpha));
    }
    return (alpha * 180.0) / Math.PI;
  }

  /**
   * Calculates SCR Conduction Power Losses (Watts).
   * P_scr = 3 * 2 * V_forward * I_scr_RMS
   * For Inline: I_scr = I_line. For Inside-Delta: I_scr = I_line / sqrt(3).
   */
  calculateScrLosses(I_line_RMS_A) {
    if (this.state === 'BYPASSED' || this.state === 'STOPPED' || this.state === 'TRIPPED') {
      return 0.0;
    }

    const V_forward = 1.2; // Thyristor Forward Voltage Drop ~1.2V
    const I_scr_A = this.config.topology === 'insideDelta' ? I_line_RMS_A / Math.sqrt(3) : I_line_RMS_A;
    
    // 3 phases * 2 antiparallel SCRs per phase * V_forward * I_scr
    return 3 * 2 * V_forward * I_scr_A;
  }

  // ===========================================================================
  // 4. THERMAL OVERLOAD & WATER HAMMER MODELS
  // ===========================================================================
  /**
   * IEC 60947-4-2 Thermal Overload Capacity Model.
   * dC/dt = (I_pu^2 - 1.0) / tau_class when I > 1.0 pu
   * Cools exponentially toward 0 when I <= 1.0 pu.
   */
  updateThermalCapacity(dtSec) {
    let tau_class = 120.0; // Class 10
    if (this.config.tripClass === 'Class20') tau_class = 240.0;
    if (this.config.tripClass === 'Class30') tau_class = 360.0;

    if (this.I_rms_pu > 1.0) {
      // Heating: C += (I^2 - 1) / tau_class * dt * 100%
      const dC = ((this.I_rms_pu * this.I_rms_pu - 1.0) / tau_class) * dtSec * 100.0;
      this.thermalCapPct = Math.min(150.0, this.thermalCapPct + dC);
    } else {
      // Cooling: C cools toward 0% with cooling time constant (4 * tau_class)
      const tau_cool = 4.0 * tau_class;
      this.thermalCapPct = Math.max(0.0, this.thermalCapPct * Math.exp(-dtSec / tau_cool));
    }

    // Thermal Overload Trip Condition
    if (this.thermalCapPct >= 100.0 && this.state !== 'TRIPPED') {
      this.state = 'TRIPPED';
      this.cooldownSec = 300.0; // 5-minute thermal lockout cooldown
    }
  }

  /**
   * Joukowsky Water Hammer Pressure Surge Head ΔH = (c * Δv) / g (meters of water head).
   * Evaluated during pump soft stop deceleration.
   */
  calculateWaterHammerSurge(dw_dt) {
    if (this.currentScenario !== 'pump') return 0.0;
    
    const c = 1000.0; // Speed of sound in water pipe (m/s)
    const g = 9.81;   // Acceleration due to gravity (m/s²)
    const v_rated = this.scenarios.pump.flowVelRated_ms;

    // Δv = v_rated * |dw/dt| * dt_stop_factor
    const decelerationRate = Math.abs(dw_dt);
    const delta_v = v_rated * Math.min(1.0, decelerationRate * 2.0);

    // Joukowsky surge head equation
    return (c * delta_v) / g;
  }

  // ===========================================================================
  // 5. MAIN MECHANICAL INTEGRATION STEP (dt = 1 ms)
  // ===========================================================================
  step(dtSec) {
    if (this.cooldownSec > 0) {
      this.cooldownSec = Math.max(0.0, this.cooldownSec - dtSec);
    }

    if (this.state === 'TRIPPED' || this.state === 'STOPPED') {
      this.V_rms_pct = 0.0;
      this.I_rms_pu = 0.0;
      this.Te_pu = 0.0;
      this.alpha_deg = 180.0;
      this.updateThermalCapacity(dtSec);
      this.scrLossW = 0.0;
      this.dipPct = 0.0;
      return;
    }

    this.timerSec += dtSec;

    // -------------------------------------------------------------------------
    // A. DETERMINE DESIRED TARGET VOLTAGE V_target BY START/STOP MODE
    // -------------------------------------------------------------------------
    let V_target_pct = 0.0;

    if (this.state === 'STARTING') {
      if (this.config.startMode === 'kickstart' && this.timerSec < this.config.tKickSec) {
        // Kickstart High Voltage Pulse
        V_target_pct = this.config.vKickPct;
      } else if (this.config.startMode === 'jog') {
        // Fixed Low Voltage Jog Mode (~10% speed)
        V_target_pct = 30.0;
      } else {
        // Linear Acceleration Voltage Ramp
        const rampProgress = Math.min(1.0, this.timerSec / Math.max(0.1, this.config.tRampSec));
        V_target_pct = this.config.vStartPct + (100.0 - this.config.vStartPct) * rampProgress;
      }
    } else if (this.state === 'RUNNING' || this.state === 'BYPASSED') {
      V_target_pct = 100.0;
    } else if (this.state === 'STOPPING') {
      // Linear Deceleration Soft Stop Ramp
      const stopProgress = Math.min(1.0, this.timerSec / Math.max(0.1, this.config.tStopSec));
      V_target_pct = 100.0 * (1.0 - stopProgress);

      if (stopProgress >= 1.0 || this.w_pu <= 0.01) {
        this.state = 'STOPPED';
        this.V_rms_pct = 0.0;
        this.I_rms_pu = 0.0;
        this.Te_pu = 0.0;
        return;
      }
    }

    // -------------------------------------------------------------------------
    // B. CLOSED-LOOP CURRENT LIMIT OVERRIDE REGULATOR
    // -------------------------------------------------------------------------
    let V_applied_pct = V_target_pct;
    
    // Evaluate motor performance at current voltage and slip
    let { I_line_pu, Te_pu } = this.calculateMotorPerformance(V_applied_pct / 100.0, this.slip);

    if (this.state === 'STARTING' && (this.config.startMode === 'currentLimit' || I_line_pu > this.config.iLimitPu)) {
      // If line current exceeds current limit, dynamically reduce applied voltage
      if (I_line_pu > this.config.iLimitPu) {
        const reductionRatio = this.config.iLimitPu / Math.max(0.1, I_line_pu);
        V_applied_pct = Math.max(this.config.vStartPct, V_applied_pct * reductionRatio);
        
        // Recalculate motor performance at current-limited voltage
        const perf = this.calculateMotorPerformance(V_applied_pct / 100.0, this.slip);
        I_line_pu = perf.I_line_pu;
        Te_pu = perf.Te_pu;
      }
    }

    this.V_rms_pct = V_applied_pct;
    this.I_rms_pu = I_line_pu;
    this.Te_pu = Te_pu;
    this.alpha_deg = this.vRmsToAlphaDeg(this.V_rms_pct);

    // -------------------------------------------------------------------------
    // C. BYPASS CONTACTOR KM1 TRANSITION LOGIC
    // -------------------------------------------------------------------------
    if (this.state === 'STARTING' && this.w_pu >= 0.95 && this.timerSec >= this.config.tRampSec) {
      this.state = 'BYPASSED';
      this.V_rms_pct = 100.0;
      this.alpha_deg = 0.0;
    }

    // -------------------------------------------------------------------------
    // D. MECHANICAL NEWTON-EULER INTEGRATION (dw/dt = (Te - Tl) * Tbase / J)
    // -------------------------------------------------------------------------
    this.Tl_pu = this.calculateLoadTorque(this.w_pu);
    const dw_dt = ((this.Te_pu - this.Tl_pu) * this.T_base_Nm) / (this.J_total * this.w_sync_rad);

    this.w_pu = Math.max(0.0, Math.min(1.05, this.w_pu + dw_dt * dtSec));
    this.slip = 1.0 - this.w_pu;

    // -------------------------------------------------------------------------
    // E. AUXILIARY METRICS (Bus Dip, SCR Loss, Water Hammer)
    // -------------------------------------------------------------------------
    const I_line_A = this.I_rms_pu * this.motorParams.I_fla_A;
    const I_sc_A = this.config.iScRatio * this.motorParams.I_fla_A;
    this.dipPct = (I_line_A / Math.max(1, I_sc_A)) * 100.0;

    this.scrLossW = this.calculateScrLosses(I_line_A);
    this.surgeHead_m = this.calculateWaterHammerSurge(dw_dt);

    this.updateThermalCapacity(dtSec);
  }

  // ===========================================================================
  // 6. SYNTHESIZE 2kHz OSCILLOSCOPE WAVEFORM RING BUFFER
  // ===========================================================================
  generateScopeWaveforms() {
    const f = this.motorParams.freq_Hz; // 50 Hz
    const period = 1.0 / f;             // 20 ms
    const dt_scope = (2.0 * period) / this.waveformBufferSize; // Sample step for 2 full cycles (40ms)

    const alpha_rad = (this.alpha_deg * Math.PI) / 180.0;
    const V_peak = (this.motorParams.V_line_V * Math.sqrt(2)) / Math.sqrt(3);

    for (let i = 0; i < this.waveformBufferSize; i++) {
      const t = this.electricalTime + i * dt_scope;
      const theta = (2 * Math.PI * f * t) % (2 * Math.PI);

      // Grid Voltage Sine Wave
      const v_g = V_peak * Math.sin(theta);

      // Chopped Output Voltage & Discontinuous Line Current Waveform
      let v_o = 0.0;
      let i_l = 0.0;

      if (this.state === 'BYPASSED') {
        v_o = v_g;
        i_l = (this.I_rms_pu * Math.sqrt(2)) * Math.sin(theta - Math.PI / 6);
      } else if (this.state === 'STARTING' || this.state === 'RUNNING' || this.state === 'STOPPING') {
        const theta_mod = theta % Math.PI;
        if (theta_mod >= alpha_rad && theta_mod < alpha_rad + 0.75 * Math.PI) {
          v_o = v_g;
          i_l = (this.I_rms_pu * Math.sqrt(2)) * Math.sin(theta - alpha_rad);
        }
      }

      this.waveformBuffer.time[i] = t;
      this.waveformBuffer.v_grid[i] = v_g;
      this.waveformBuffer.v_out[i] = v_o;
      this.waveformBuffer.i_line[i] = i_l;
    }

    this.electricalTime += dt_scope * 10;
  }

  // ===========================================================================
  // 7. PUBLIC ENGINE CONTROL COMMANDS
  // ===========================================================================
  start() {
    if (this.state === 'TRIPPED') return false;
    if (this.startsCount >= this.config.maxStartsPerHour) return false;

    this.state = 'STARTING';
    this.timerSec = 0.0;
    this.startsCount += 1;
    return true;
  }

  stop() {
    if (this.state === 'STOPPED' || this.state === 'TRIPPED') return;
    this.state = 'STOPPING';
    this.timerSec = 0.0;
  }

  jog() {
    if (this.state === 'TRIPPED') return;
    this.state = 'STARTING';
    this.config.startMode = 'jog';
    this.timerSec = 0.0;
  }

  setScenario(name) {
    if (this.scenarios[name]) {
      this.currentScenario = name;
      this.J_total = this.scenarios[name].J;
    }
  }

  setParams(newParams) {
    Object.assign(this.config, newParams);
  }

  getState() {
    return {
      state: this.state,
      w: this.w_pu,
      slip: this.slip,
      VrmsPct: this.V_rms_pct,
      IrmsPu: this.I_rms_pu,
      IrmsA: this.I_rms_pu * this.motorParams.I_fla_A,
      alphaDeg: this.alpha_deg,
      Te: this.Te_pu,
      Tl: this.Tl_pu,
      thermalCapPct: this.thermalCapPct,
      startsLeft: Math.max(0, this.config.maxStartsPerHour - this.startsCount),
      cooldownSec: this.cooldownSec,
      dipPct: this.dipPct,
      surgeHead_m: this.surgeHead_m,
      scrLossW: this.scrLossW,
      scenario: this.currentScenario,
      topology: this.config.topology,
      waveformBuffer: this.waveformBuffer,
    };
  }
}

// =============================================================================
// 8. WEB WORKER MESSAGE DISPATCHER & 60Hz TICK LOOP
// =============================================================================
const engine = new SoftStarterEngine();

// 60 Hz Background Simulation Worker Interval (16.6ms)
setInterval(() => {
  // Execute 16 mechanical integration substeps (1ms each) per 60Hz frame
  for (let i = 0; i < 16; i++) {
    engine.step(0.001);
  }
  engine.generateScopeWaveforms();

  // Post State Broadcast to Main React UI Thread
  if (typeof self !== 'undefined' && self.postMessage) {
    self.postMessage({
      type: 'STATE_UPDATE',
      payload: engine.getState(),
    });
  }
}, 16.6);

// Handle Incoming Commands from Main Thread
if (typeof self !== 'undefined') {
  self.onmessage = (e) => {
    const { type, scenario, params } = e.data || {};

    switch (type) {
      case 'START':
        engine.start();
        break;
      case 'STOP':
        engine.stop();
        break;
      case 'JOG':
        engine.jog();
        break;
      case 'SET_SCENARIO':
        engine.setScenario(scenario);
        break;
      case 'SET_PARAMS':
        engine.setParams(params);
        break;
      case 'GET_STATE':
        self.postMessage({ type: 'STATE_UPDATE', payload: engine.getState() });
        break;
    }
  };
}

export default SoftStarterEngine;
