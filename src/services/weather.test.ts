import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchLiveStationWeather } from './weather';
import { MONITORING_STATIONS } from '../data/stations';

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
