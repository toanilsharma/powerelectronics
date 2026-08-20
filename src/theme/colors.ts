/**
 * src/theme/colors.ts
 * 
 * Shared Industrial Color Palette Tokens for Power Electronics Labs
 */

export const PE_COLORS = {
  // Primary Cyber Industrial Green
  CYBER_GREEN: '#00e5a0',
  CYBER_GREEN_BG: 'rgba(0, 229, 160, 0.15)',
  
  // Backgrounds & Chassis
  CHASSIS_DARK: '#0d131f',
  CHASSIS_DEEP: '#070a10',
  CARD_BG: '#121a29',
  BORDER_DARK: '#1e293b',
  
  // Annunciator & Protection Status Colors
  STOPPED_SLATE: '#64748b',
  STARTING_AMBER: '#f59e0b',
  RUNNING_CYAN: '#06b6d4',
  BYPASSED_GREEN: '#10b981',
  STOPPING_AMBER: '#d97706',
  TRIPPED_RED: '#f43f5e',
  
  // Oscilloscope & Telemetry Traces
  PHASE_A_CYAN: '#00f0ff',
  PHASE_B_AMBER: '#f59e0b',
  PHASE_C_ROSE: '#f43f5e',
  TORQUE_GREEN: '#00e5a0',
  SPEED_PURPLE: '#c084fc',
};

export type PeStatusColorKey = keyof typeof PE_COLORS;
