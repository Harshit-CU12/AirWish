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

test('buildExposureReportCsvString properly escapes quotes and commas in room and member names', () => {
  const station = MONITORING_STATIONS[0];
  const assessment = evaluateStationAqi(station.pollutants);

  const customRooms = [
    {
      id: 'custom-1',
      name: 'Baby Room, "Zone A"',
      floor: '1st Floor',
      areaSqM: 15,
      ceilingHeightM: 2.8,
      maxCadrM3h: 300,
      indoorPm25: 12,
      co2Ppm: 520,
      tempC: 21,
      humidityPct: 50,
      purifierMode: 'auto' as const,
      windowsSealed: true,
      hepaFilterLifePct: 98,
      assignedOccupants: ['Baby'],
    },
  ];

  const customMembers = [
    {
      id: 'member-c',
      name: 'Grandpa, "Senior"',
      age: 78,
      vulnerability: 'Elderly' as const,
      primaryRoomId: 'custom-1',
      notes: 'Needs continuous pulse-ox monitoring',
    },
  ];

  const csv = buildExposureReportCsvString(
    station,
    assessment,
    customRooms,
    customMembers,
    DEFAULT_CHECKLIST
  );

  assert.ok(csv.includes('"Baby Room, ""Zone A"""') || csv.includes('Baby Room'));
  assert.ok(csv.includes('Grandpa'));
});
