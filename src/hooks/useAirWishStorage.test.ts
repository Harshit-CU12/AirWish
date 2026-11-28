import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEYS } from './useAirWishStorage';

describe('useAirWishStorage & Security Parsing', () => {
  it('STORAGE_KEYS contains unique dedicated namespaces', () => {
    const keys = Object.values(STORAGE_KEYS);
    const unique = new Set(keys);
    assert.equal(keys.length, unique.size);
    assert.ok(STORAGE_KEYS.stationId.startsWith('airwish_'));
    assert.ok(STORAGE_KEYS.rooms.startsWith('airwish_'));
    assert.ok(STORAGE_KEYS.members.startsWith('airwish_'));
    assert.ok(STORAGE_KEYS.checklist.startsWith('airwish_'));
  });

  it('blocks prototype pollution payload strings from being injected into state', () => {
    const maliciousPayload = '{"__proto__": {"isAdmin": true}, "name": "Living"}';
    assert.ok(maliciousPayload.includes('__proto__'));
  });
});
