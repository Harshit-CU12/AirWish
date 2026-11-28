import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MONITORING_STATIONS } from '../data/stations';
import { evaluateStationAqi } from '../utils/aqi';
import { calculateProtectionPercent, getRoomIndoorAqi } from '../utils/filtration';

describe('HeroTelemetry & Station Aggregate Calculations', () => {
  it('computes protection percentage across all active household rooms', () => {
    const station = MONITORING_STATIONS[0];
    const assessment = evaluateStationAqi(station.pollutants);
    const outdoorAqi = assessment.aqi;

    const sampleRoom = {
      id: 'living',
      name: 'Living Room',
      floor: 'Ground',
      areaSqM: 30,
      ceilingHeightM: 3,
      maxCadrM3h: 500,
      indoorPm25: 15,
      co2Ppm: 550,
      tempC: 22,
      humidityPct: 50,
      purifierMode: 'turbo' as const,
      windowsSealed: true,
      hepaFilterLifePct: 90,
      assignedOccupants: ['All'],
    };

    const indoorAqi = getRoomIndoorAqi(sampleRoom);
    const protection = calculateProtectionPercent(outdoorAqi, indoorAqi);

    assert.ok(protection >= 85, `Expected protection >= 85%, got ${protection}%`);
  });
});
