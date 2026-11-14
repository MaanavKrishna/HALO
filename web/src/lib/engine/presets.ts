import type { Habitat } from './types';

const base = { materials: ['kapton', 'teflon', 'cotton'] as Habitat['materials'], detectors: ['scatter'] as Habitat['detectors'], liquids: false };

export const PRESETS: Record<'iss' | 'artemis' | 'moon' | 'rover' | 'suit', Habitat> = {
  iss: { name: 'ISS', o2Pct: 21, pressurePsia: 14.7, flowCmS: 10, ...base },
  artemis: { name: 'Artemis Base', o2Pct: 34, pressurePsia: 8.2, flowCmS: 10, ...base },
  moon: { name: 'Moon Envelope', o2Pct: 30, pressurePsia: 10.2, flowCmS: 10, ...base },
  rover: { name: 'Pressurized Rover', o2Pct: 30, pressurePsia: 10.2, flowCmS: 5, ...base },
  suit: { name: 'EVA Suit', o2Pct: 100, pressurePsia: 4.3, flowCmS: 0, ...base },
};
