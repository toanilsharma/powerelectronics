import React from 'react';
import { TorqueSpeedCurve as TorqueSpeedCurveTsx } from './TorqueSpeedCurve';

/**
 * TorqueSpeedCurve.jsx - JS Wrapper for TorqueSpeedCurve component
 */
export const TorqueSpeedCurve = (props) => {
  return <TorqueSpeedCurveTsx {...props} />;
};

export default TorqueSpeedCurve;
