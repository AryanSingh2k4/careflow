import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCitationIds } from '../src/lib/citation-markers.ts';

test('extracts single and grouped citation markers', () => {
  assert.deepEqual(
    [...extractCitationIds('Single [S1]; grouped [S1, S2, S4]; compact [S3,S5].')],
    ['S1', 'S2', 'S4', 'S3', 'S5'],
  );
});

test('ignores malformed or out-of-range citation markers', () => {
  assert.deepEqual(
    [...extractCitationIds('[S0] [S1, X] [S2,,S3] [[S4]] [S-1] [S5,]')],
    [],
  );
});
