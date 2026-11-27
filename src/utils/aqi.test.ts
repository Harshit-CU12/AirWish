import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePollutantSubIndex,
  evaluateMemberGuidance,
  evaluateStationAqi,
  getCpcbCategory,
} from './aqi';

test('CPCB PM2.5 breakpoints match statutory scale boundaries', () => {
  assert.equal(calculatePollutantSubIndex('pm25', 0), 0);
  assert.equal(calculatePollutantSubIndex('pm25', 30), 50);
  assert.equal(calculatePollutantSubIndex('pm25', 60), 100);
  assert.equal(calculatePollutantSubIndex('pm25', 90), 200);
  assert.equal(calculatePollutantSubIndex('pm25', 120), 300);
  assert.equal(calculatePollutantSubIndex('pm25', 250), 400);
  assert.equal(calculatePollutantSubIndex('pm25', 380), 500);
});

test('calculatePollutantSubIndex handles invalid and edge-case inputs gracefully', () => {
  assert.equal(calculatePollutantSubIndex('pm25', NaN), 0);
  assert.equal(calculatePollutantSubIndex('pm25', -50), 0);
  assert.equal(calculatePollutantSubIndex('pm25', Infinity), 0);
  assert.equal(calculatePollutantSubIndex('pm25', 500), 591);
  assert.equal(calculatePollutantSubIndex('pm25', 1000), 600);
});

test('calculatePollutantSubIndex covers all criteria pollutants and thresholds', () => {
  // PM10 (0-50: 0-50, 51-100: 51-100, 101-250: 101-200, 251-350: 201-300, 351-430: 301-400, 431+: 401-500)
  assert.equal(calculatePollutantSubIndex('pm10', 0), 0);
  assert.equal(calculatePollutantSubIndex('pm10', 50), 50);
  assert.equal(calculatePollutantSubIndex('pm10', 100), 100);
  assert.equal(calculatePollutantSubIndex('pm10', 250), 200);
  assert.equal(calculatePollutantSubIndex('pm10', 350), 300);
  assert.equal(calculatePollutantSubIndex('pm10', 430), 400);

  // NO2
  assert.equal(calculatePollutantSubIndex('no2', 40), 50);
  assert.equal(calculatePollutantSubIndex('no2', 80), 100);

  // SO2
  assert.equal(calculatePollutantSubIndex('so2', 40), 50);
  assert.equal(calculatePollutantSubIndex('so2', 80), 100);

  // CO (in mg/m3)
  assert.equal(calculatePollutantSubIndex('co', 1.0), 50);
  assert.equal(calculatePollutantSubIndex('co', 2.0), 100);

  // O3
  assert.equal(calculatePollutantSubIndex('o3', 50), 50);
  assert.equal(calculatePollutantSubIndex('o3', 100), 100);
});

test('evaluateStationAqi selects PM10 when PM10 sub-index dominates', () => {
  const result = evaluateStationAqi({
    pm25: 15, // Low
    pm10: 450, // High dust / construction storm
    no2: 20,
    so2: 10,
    co: 0.5,
    o3: 30,
  });
  assert.equal(result.prominentPollutant, 'pm10');
  assert.equal(result.category.key, 'severe');
  assert.ok(result.aqi >= 400);
});

test('CPCB category mapping returns exact semantic tiers', () => {
  assert.equal(getCpcbCategory(35).key, 'good');
  assert.equal(getCpcbCategory(88).key, 'satisfactory');
  assert.equal(getCpcbCategory(165).key, 'moderate');
  assert.equal(getCpcbCategory(248).key, 'poor');
  assert.equal(getCpcbCategory(356).key, 'very_poor');
  assert.equal(getCpcbCategory(438).key, 'severe');
});

test('evaluateStationAqi selects maximum sub-index and prominent pollutant', () => {
  const result = evaluateStationAqi({
    pm25: 294,
    pm10: 412,
    no2: 76,
    o3: 48,
    so2: 24,
    co: 2.1,
  });
  assert.equal(result.prominentPollutant, 'pm25');
  assert.equal(result.category.key, 'severe');
  assert.ok(result.aqi >= 430 && result.aqi <= 450);
});

test('evaluateMemberGuidance escalates sensitive groups and produces dynamic risk badges', () => {
  const asthmaChild = {
    id: 'm1',
    name: 'Aarav',
    age: 7,
    vulnerability: 'Asthma' as const,
    primaryRoomId: 'kids',
  };
  const elderlyMember = {
    id: 'm2',
    name: 'Meera',
    age: 71,
    vulnerability: 'Elderly' as const,
    primaryRoomId: 'elderly',
  };

  const severeAsthma = evaluateMemberGuidance(asthmaChild, 438, 28);
  assert.equal(severeAsthma.severity, 'critical');
  assert.equal(severeAsthma.riskBadgeLabel, 'Critical: Asthma Emergency');
  assert.equal(severeAsthma.isSensitiveGroupAlert, true);
  assert.equal(severeAsthma.maxOutdoorMinutes, 0);

  const highAsthma = evaluateMemberGuidance(asthmaChild, 185, 32);
  assert.equal(highAsthma.severity, 'high');
  assert.equal(highAsthma.riskBadgeLabel, 'High-Risk for Asthma');
  assert.equal(highAsthma.isSensitiveGroupAlert, true);

  const highElderly = evaluateMemberGuidance(elderlyMember, 185, 32);
  assert.equal(highElderly.severity, 'high');
  assert.equal(highElderly.riskBadgeLabel, 'Sensitive Group Alert · Elderly');

  const cleanGuidance = evaluateMemberGuidance(asthmaChild, 42, 18);
  assert.equal(cleanGuidance.severity, 'low');
  assert.equal(cleanGuidance.riskBadgeLabel, 'Low Asthma Risk');
  assert.equal(cleanGuidance.isSensitiveGroupAlert, false);
  assert.ok(cleanGuidance.maxOutdoorMinutes >= 180);
});
