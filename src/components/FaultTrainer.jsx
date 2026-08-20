import React from 'react';
import { FaultTrainer as FaultTrainerTsx, FAULT_CASES as FAULT_CASES_TSX } from './FaultTrainer';

/**
 * FaultTrainer.jsx - JS Wrapper for FaultTrainer component
 */
export const FAULT_CASES = FAULT_CASES_TSX;

export const FaultTrainer = (props) => {
  return <FaultTrainerTsx {...props} />;
};

export default FaultTrainer;
