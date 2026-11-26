import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateStationAqi } from './aqi';
import { buildExposureReportCsvString } from './exportReport';
import {
  DEFAULT_CHECKLIST,
  DEFAULT_FAMILY_MEMBERS,
  DEFAULT_ROOMS,
  MONITORING_STATIONS,
} from '../data/stations';

test('buildExposureReportCsvString constructs valid formatted CSV report', () => {
  const station = MONITORING_STATIONS[0];
  const assessment = evaluateStationAqi(station.pollutants);

  const csv = buildExposureReportCsvString(
    station,
    assessment,
    DEFAULT_ROOMS,
    DEFAULT_FAMILY_MEMBERS,
    DEFAULT_CHECKLIST
  );

  assert.ok(csv.includes('AIRWISH — HOUSEHOLD RESPIRATORY & SMOG EXPOSURE CLINICAL REPORT'));
  assert.ok(csv.includes(station.name));
  assert.ok(csv.includes('--- MONITORED HOUSEHOLD AIR ZONES ---'));
  assert.ok(csv.includes('--- HOUSEHOLD MEMBERS & CLINICAL EXPOSURE TRIAGE ---'));
  assert.ok(csv.includes('--- HOUSEHOLD SAFEGUARDS VERIFICATION ---'));
});
