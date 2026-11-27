import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MONITORING_STATIONS } from './stations';

describe('Monitoring Station Telemetry Integrity', () => {
  it('contains exactly 5 metropolitan stations with unique identifiers', () => {
    assert.equal(MONITORING_STATIONS.length, 5);
    const ids = new Set(MONITORING_STATIONS.map((s) => s.id));
    assert.equal(ids.size, 5);
  });

  it('all stations have valid Indian geographic coordinates', () => {
    MONITORING_STATIONS.forEach((station) => {
      assert.ok(station.coordinates, `Station ${station.name} missing coordinates`);
      const { lat, lng } = station.coordinates!;
      // India bounds: lat 8°N - 37°N, lng 68°E - 97°E
      assert.ok(lat >= 8 && lat <= 37, `Latitude out of range for ${station.name}: ${lat}`);
      assert.ok(lng >= 68 && lng <= 97, `Longitude out of range for ${station.name}: ${lng}`);
    });
  });

  it('all stations report valid CPCB criteria pollutants', () => {
    MONITORING_STATIONS.forEach((station) => {
      const p = station.pollutants;
      assert.ok(p.pm25 >= 0, `Invalid PM2.5 for ${station.name}`);
      assert.ok(p.pm10 >= 0, `Invalid PM10 for ${station.name}`);
      assert.ok(p.no2 >= 0, `Invalid NO2 for ${station.name}`);
      assert.ok(p.so2 >= 0, `Invalid SO2 for ${station.name}`);
      assert.ok(p.co >= 0, `Invalid CO for ${station.name}`);
      assert.ok(p.o3 >= 0, `Invalid O3 for ${station.name}`);
    });
  });

  it('all stations provide complete 24-hour forecast data arrays', () => {
    MONITORING_STATIONS.forEach((station) => {
      assert.equal(station.forecast24h.length, 24, `Station ${station.name} must have 24 hourly forecast points`);
      station.forecast24h.forEach((point) => {
        assert.ok(typeof point.hourLabel === 'string');
        assert.ok(point.outdoorAqi >= 0 && point.outdoorAqi <= 600);
        assert.ok(point.outdoorPm25 >= 0);
      });
    });
  });

  it('all stations define weather metrics and valid thermal inversion risk tiers', () => {
    const validTiers = new Set(['Low', 'Moderate', 'High', 'Severe']);
    MONITORING_STATIONS.forEach((station) => {
      const w = station.weather;
      assert.ok(w.humidityPct >= 0 && w.humidityPct <= 100);
      assert.ok(w.windKmh >= 0);
      assert.ok(w.visibilityKm >= 0);
      assert.ok(validTiers.has(w.inversionRisk), `Invalid inversion risk: ${w.inversionRisk}`);
    });
  });
});
