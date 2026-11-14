import tests from '../../../tests/fixtures/tests.json';
import investigations from '../../../tests/fixtures/investigations.json';
import detector from '../../../tests/fixtures/detector.json';
import extinction from '../../../tests/fixtures/extinction.json';
import literature from '../../../tests/fixtures/literature.json';
import summaries from '../../../tests/fixtures/summaries.json';
import manifest from '../../../tests/fixtures/manifest.json';
import { parseHaloData } from './schema';
import type { HaloData } from '@/lib/engine/types';

/** Small hand-made dataset for engine unit tests. Throws if a fixture violates the schemas. */
export function loadFixtureData(): HaloData {
  return parseHaloData({ tests, investigations, detector, extinction, literature, summaries, manifest });
}
