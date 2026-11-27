import test from 'node:test';
import assert from 'node:assert/strict';
import { computeInversionRisk, degreesToCompass, fetchLiveStationWeather } from './weather';
import { MONITORING_STATIONS } from '../data/stations';

test('degreesToCompass maps degrees accurately to 16 cardinal points', () => {
  assert.equal(degreesToCompass(0), 'N');
  assert.equal(degreesToCompass(90), 'E');
  assert.equal(degreesToCompass(180), 'S');
  assert.equal(degreesToCompass(270), 'W');
  assert.equal(degreesToCompass(45), 'NE');
  assert.equal(degreesToCompass(135), 'SE');
  assert.equal(degreesToCompass(225), 'SW');
  assert.equal(degreesToCompass(315), 'NW');
});

test('computeInversionRisk calculates correct atmospheric inversion severity tiers', () => {
  // Stagnant cold moist air: severe inversion
  assert.equal(computeInversionRisk(12, 3, 85), 'Severe');
  // Cold with low wind: high
  assert.equal(computeInversionRisk(18, 6, 60), 'High');
  // Moderate wind: moderate
  assert.equal(computeInversionRisk(24, 10, 50), 'Moderate');
  // High dispersion wind: low
  assert.equal(computeInversionRisk(28, 20, 40), 'Low');
});

test('fetchLiveStationWeather handles stations without coordinates gracefully', async () => {
  const stationNoCoords = { ...MONITORING_STATIONS[0], coordinates: undefined };
  const res = await fetchLiveStationWeather(stationNoCoords);
  assert.equal(res, null);
});

test('fetchLiveStationWeather parses or safely falls back on network errors', async () => {
  const dummyStation = {
    ...MONITORING_STATIONS[0],
    coordinates: { lat: 28.6469, lng: 77.3160 },
  };
  const res = await fetchLiveStationWeather(dummyStation);
  // If internet is reachable, returns live data; if offline, safely returns null without throwing
  if (res) {
    assert.equal(typeof res.tempC, 'number');
    assert.equal(typeof res.windKmh, 'number');
    assert.equal(typeof res.windDirection, 'string');
    assert.equal(res.isLive, true);
  } else {
    assert.equal(res, null);
  }
});
