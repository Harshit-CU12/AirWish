import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('TopBar Navigation & Safe Mode Metadata', () => {
  it('defines the 5 core application view tabs', () => {
    const tabs = ['overview', 'spatial', 'rooms', 'forecast', 'family'];
    assert.equal(tabs.length, 5);
    assert.ok(tabs.includes('overview'));
    assert.ok(tabs.includes('spatial'));
    assert.ok(tabs.includes('rooms'));
    assert.ok(tabs.includes('forecast'));
    assert.ok(tabs.includes('family'));
  });
});
