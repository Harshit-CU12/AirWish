import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MONITORING_STATIONS } from '../data/stations';
import { calculatePollutantSubIndex, evaluateStationAqi } from '../utils/aqi';

describe('PollutantGrid Sub-Index Precision', () => {
  it('computes sub-indices for all 6 statutory CPCB criteria pollutants', () => {
    const station = MONITORING_STATIONS[0];
    const p = station.pollutants;

    const pm25Sub = calculatePollutantSubIndex('pm25', p.pm25);
    const pm10Sub = calculatePollutantSubIndex('pm10', p.pm10);
    const no2Sub = calculatePollutantSubIndex('no2', p.no2);
    const so2Sub = calculatePollutantSubIndex('so2', p.so2);
    const coSub = calculatePollutantSubIndex('co', p.co);
    const o3Sub = calculatePollutantSubIndex('o3', p.o3);

    assert.ok(pm25Sub > 0);
    assert.ok(pm10Sub > 0);
    assert.ok(no2Sub > 0);
    assert.ok(so2Sub > 0);
    assert.ok(coSub > 0);
    assert.ok(o3Sub > 0);

    const assessment = evaluateStationAqi(p);
    assert.equal(assessment.aqi, Math.max(pm25Sub, pm10Sub, no2Sub, so2Sub, coSub, o3Sub));
  });
});
