import React from 'react';
import { CompareStarters as CompareStartersTsx, STARTING_METHODS as STARTING_METHODS_TSX } from './CompareStarters';

/**
 * CompareStarters.jsx - JS Wrapper for CompareStarters component
 */
export const STARTING_METHODS = STARTING_METHODS_TSX;

export const CompareStarters = (props) => {
  return <CompareStartersTsx {...props} />;
};

export default CompareStarters;
