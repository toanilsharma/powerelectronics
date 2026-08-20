import React from 'react';
import { usePowerQuality } from '../context/PowerQualityContext';
import { SpotlightTour } from './shared/SpotlightTour';
import { TourStepSpec } from '../engine/types';

export const GuidedTourOverlay: React.FC = () => {
  const { isTourActive, endTour, tourSteps } = usePowerQuality();

  const mappedSteps: TourStepSpec[] = (tourSteps || []).map((s) => ({
    id: s.id,
    title: s.title,
    targetId: s.targetId || '#harmonics-chart',
    description: s.content || s.description || '',
    teachingPoint: s.presetNote || s.teachingPoint || 'IEEE 519 Power Quality Compliance Evaluation.',
    presetAction: s.presetAction,
  }));

  return (
    <SpotlightTour
      steps={mappedSteps}
      isOpen={isTourActive}
      onClose={endTour}
    />
  );
};
