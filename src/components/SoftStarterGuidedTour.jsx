import React from 'react';
import { SoftStarterGuidedTour as SoftStarterGuidedTourTsx, SOFT_STARTER_TOUR_STEPS as SOFT_STARTER_TOUR_STEPS_TSX } from './SoftStarterGuidedTour';

/**
 * SoftStarterGuidedTour.jsx - JS Wrapper for SoftStarterGuidedTour component
 */
export const SOFT_STARTER_TOUR_STEPS = SOFT_STARTER_TOUR_STEPS_TSX;

export const SoftStarterGuidedTour = (props) => {
  return <SoftStarterGuidedTourTsx {...props} />;
};

export default SoftStarterGuidedTour;
