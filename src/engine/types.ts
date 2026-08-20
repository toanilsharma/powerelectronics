/**
 * src/engine/types.ts
 * 
 * Shared Engine Interface & Contract Specification for the Power Electronics Lab Suite
 * Provides a unified architecture for simulation engines across all labs (Soft Starter,
 * Harmonics & APF, VFD, ATS/STS, and Battery Charger).
 */

/**
 * Generic Engine State Base Interface
 */
export interface ILabStateBase {
  timestampSec: number;
  isRunning: boolean;
  isTrip: boolean;
  tripReason?: string | null;
}

/**
 * Unified Core Engine Interface for all Power Electronics Simulation Labs
 */
export interface ILabEngine<TParams, TState extends ILabStateBase> {
  /** Initializes physics engine with default parameters */
  init(initialParams?: Partial<TParams>): void;
  
  /** Starts simulation execution loop */
  start(): void;
  
  /** Stops simulation execution loop */
  stop(): void;
  
  /** Resets engine state back to initial stopped state */
  reset(): void;
  
  /** Updates simulation physics parameters dynamically */
  updateParams(params: Partial<TParams>): void;
  
  /** Gets current instantaneous engine state snapshot */
  getState(): TState;
  
  /** Advances engine physics simulation by dt seconds */
  tick(dtSec: number): TState;
  
  /** Subscribes to real-time engine state updates */
  subscribe(callback: (state: TState) => void): () => void;
}

/**
 * Standard Web Worker postMessage Contract for Off-Thread Engine Computation
 */
export type WorkerMessageType = 'INIT' | 'START' | 'STOP' | 'RESET' | 'TICK' | 'UPDATE_PARAMS' | 'STATE_UPDATE';

export interface WorkerMessageContract<TParams = any, TState = any> {
  type: WorkerMessageType;
  payload?: {
    params?: Partial<TParams>;
    dtSec?: number;
    state?: TState;
    timestamp?: number;
    error?: string;
  };
}

/**
 * Shared Guided Tour Step Specification
 */
export interface TourStepSpec {
  id: string;
  title: string;
  targetId: string; // DOM Element selector ID (e.g. "#ss-strip-chart")
  description: string;
  teachingPoint: string;
  presetAction?: () => void;
}
