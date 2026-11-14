import type { MaterialId } from './types';

/**
 * Habitat material -> SAME detector-run material.
 * sameClass is the material name used in the SAME smoke-detector runs, or null
 * when SAME has no analog. literatureMaterial names the material in the
 * literature table when SAME has none.
 */
export const MATERIALS: Record<MaterialId, { label: string; sameClass: string | null; literatureMaterial: string | null }> = {
  kapton: { label: 'Kapton', sameClass: 'Kapton', literatureMaterial: null },
  teflon: { label: 'Teflon', sameClass: 'Teflon', literatureMaterial: null },
  silicone: { label: 'Silicone', sameClass: 'Silicone', literatureMaterial: null },
  cotton: { label: 'Cotton (lampwick)', sameClass: 'Lampwick', literatureMaterial: null },
  pyrell: { label: 'Pyrell', sameClass: 'Pyrell', literatureMaterial: null },
  dbp: { label: 'Plasticizer aerosol (DBP)', sameClass: 'DBP', literatureMaterial: null },
  pmma: { label: 'PMMA', sameClass: null, literatureMaterial: 'PMMA' },
  nomex: { label: 'Nomex', sameClass: null, literatureMaterial: 'Nomex' },
};
