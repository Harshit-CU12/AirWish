import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ROOMS } from '../data/stations';

describe('ProtectionVisualGuide Room Analytics', () => {
  it('correctly identifies lowest filter life room among default rooms', () => {
    let lowest = DEFAULT_ROOMS[0];
    for (const room of DEFAULT_ROOMS) {
      if (room.hepaFilterLifePct < lowest.hepaFilterLifePct) {
        lowest = room;
      }
    }
    assert.ok(lowest);
    assert.ok(lowest.hepaFilterLifePct >= 0 && lowest.hepaFilterLifePct <= 100);
  });
});
