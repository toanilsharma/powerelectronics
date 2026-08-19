import React from 'react';
import { ThermalGauge as ThermalGaugeTsx } from './ThermalGauge';

/**
 * ThermalGauge.jsx - JS Wrapper for ThermalGauge component
 */
export const ThermalGauge = (props) => {
  return <ThermalGaugeTsx {...props} />;
};

export default ThermalGauge;
