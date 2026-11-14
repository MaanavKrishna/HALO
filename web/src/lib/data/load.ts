import tests from '@/data/tests.json';
import investigations from '@/data/investigations.json';
import detector from '@/data/detector.json';
import extinction from '@/data/extinction.json';
import literature from '@/data/literature.json';
import summaries from '@/data/summaries.json';
import manifest from '@/data/manifest.json';
import { parseHaloData } from './schema';
import type { HaloData } from '@/lib/engine/types';

/** All generated data, bundled statically and validated once at module load. */
export const HALO_DATA: HaloData = parseHaloData({
  tests, investigations, detector, extinction, literature, summaries, manifest,
});
