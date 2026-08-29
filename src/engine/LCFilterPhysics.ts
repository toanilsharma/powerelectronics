/**
 * LCFilterPhysics.ts
 * 
 * TypeScript wrapper and type declarations for LCFilterPhysics.js engine.
 */

export interface SpectrumItem {
  order: number;
  magnitude: number;
}

export interface PostHarmonicItem extends SpectrumItem {
  preMagnitude: number;
  reductionPct: number;
}

export interface FilterImpedance {
  R: number;
  Xf: number;
  magnitude: number;
}

export interface GridImpedanceInfo {
  Zs_ohms: number;
  Zs_mOhm: number;
  Ls: number;
}

export interface THD_TDD_Result {
  thdPercent: number;
  tddPercent: number;
}

import {
  calculateCapacitance,
  calculateFilterImpedance,
  calculateGridImpedance,
  calculatePostFilterHarmonics,
  calculateTHD_TDD,
  calculateKFactorPost,
  runSMPSTestCase,
} from './LCFilterPhysics.js';

export {
  calculateCapacitance,
  calculateFilterImpedance,
  calculateGridImpedance,
  calculatePostFilterHarmonics,
  calculateTHD_TDD,
  calculateKFactorPost,
  runSMPSTestCase,
};
