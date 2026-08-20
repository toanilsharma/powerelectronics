import React from 'react';
import { ScenarioPresets as ScenarioPresetsTsx, SOFT_STARTER_PRESETS as SOFT_STARTER_PRESETS_TSX } from './ScenarioPresets';

/**
 * ScenarioPresets.jsx - JS Wrapper for ScenarioPresets component
 */
export const SOFT_STARTER_PRESETS = SOFT_STARTER_PRESETS_TSX;

export const ScenarioPresets = (props) => {
  return <ScenarioPresetsTsx {...props} />;
};

export default ScenarioPresets;
