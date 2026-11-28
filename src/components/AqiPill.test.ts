import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCpcbCategory } from '../utils/aqi';

describe('AqiPill Visual & Accessible Component Helpers', () => {
  it('maps good AQI to Emerald tokens and proper labels', () => {
    const cat = getCpcbCategory(35);
    assert.equal(cat.key, 'good');
    assert.equal(cat.label, 'Good');
    assert.ok(cat.colorHex);
    assert.ok(cat.textHex);
  });

  it('maps severe AQI to Wine/Crimson emergency tokens', () => {
    const cat = getCpcbCategory(440);
    assert.equal(cat.key, 'severe');
    assert.equal(cat.label, 'Severe');
    assert.ok(cat.colorHex);
  });

  it('boundary values 50, 100, 200, 300, 400 correctly categorize', () => {
    assert.equal(getCpcbCategory(50).key, 'good');
    assert.equal(getCpcbCategory(100).key, 'satisfactory');
    assert.equal(getCpcbCategory(200).key, 'moderate');
    assert.equal(getCpcbCategory(300).key, 'poor');
    assert.equal(getCpcbCategory(400).key, 'very_poor');
    assert.equal(getCpcbCategory(401).key, 'severe');
  });
});
