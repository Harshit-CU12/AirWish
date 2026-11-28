import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_FAMILY_MEMBERS } from '../data/stations';
import { evaluateMemberGuidance } from '../utils/aqi';

describe('FamilyCarePanel Triage Evaluation', () => {
  it('flags emergency sensitive alert for asthma patient under severe outdoor AQI', () => {
    const asthmaMember = DEFAULT_FAMILY_MEMBERS.find((m) => m.vulnerability === 'Asthma')!;
    assert.ok(asthmaMember);

    const guidance = evaluateMemberGuidance(asthmaMember, 450, 45);
    assert.equal(guidance.isSensitiveGroupAlert, true);
    assert.equal(guidance.severity, 'critical');
    assert.equal(guidance.maxOutdoorMinutes, 0);
  });

  it('permits outdoor activity when both outdoor and indoor air are clean', () => {
    const generalMember = DEFAULT_FAMILY_MEMBERS.find((m) => m.vulnerability === 'General Adult')!;
    assert.ok(generalMember);

    const guidance = evaluateMemberGuidance(generalMember, 40, 20);
    assert.equal(guidance.isSensitiveGroupAlert, false);
    assert.equal(guidance.severity, 'low');
    assert.ok(guidance.maxOutdoorMinutes >= 180);
  });
});
