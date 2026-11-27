import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clampNumber, sanitizeAdvisorQuery, sanitizeInput } from './sanitization';

describe('Sanitization & Security Utilities', () => {
  it('sanitizeInput strips dangerous HTML tags and encodes special characters', () => {
    const malicious = '<script>alert("xss")</script>Living Room & Balcony';
    const clean = sanitizeInput(malicious);
    assert.ok(!clean.includes('<script>'));
    assert.ok(!clean.includes('</script>'));
    assert.ok(clean.includes('&amp;'));
    assert.ok(clean.includes('&quot;'));
  });

  it('sanitizeInput limits character length to prevent buffer bloat', () => {
    const longString = 'A'.repeat(500);
    const clean = sanitizeInput(longString, 50);
    assert.equal(clean.length, 50);
  });

  it('sanitizeInput handles non-string inputs gracefully', () => {
    assert.equal(sanitizeInput(null), '');
    assert.equal(sanitizeInput(undefined), '');
    assert.equal(sanitizeInput(12345), '');
    assert.equal(sanitizeInput({}), '');
  });

  it('sanitizeAdvisorQuery removes unprintable ASCII control characters and limits length', () => {
    const messyQuery = 'Is it safe\x00\x1F to exercise outside?\n\nHigh smog today!   ';
    const clean = sanitizeAdvisorQuery(messyQuery);
    assert.ok(!clean.includes('\x00'));
    assert.ok(!clean.includes('\x1F'));
    assert.ok(clean.startsWith('Is it safe to exercise outside?'));

    const hugeQuery = 'Smog alert? '.repeat(100);
    const clamped = sanitizeAdvisorQuery(hugeQuery);
    assert.ok(clamped.length <= 400);
  });

  it('clampNumber correctly restricts numbers within bounds', () => {
    assert.equal(clampNumber(45, 10, 100, 20), 45);
    assert.equal(clampNumber(5, 10, 100, 20), 10);
    assert.equal(clampNumber(150, 10, 100, 20), 100);
    assert.equal(clampNumber(NaN, 10, 100, 20), 20);
    assert.equal(clampNumber('invalid', 10, 100, 20), 20);
    assert.equal(clampNumber(Infinity, 10, 100, 20), 20);
  });
});
