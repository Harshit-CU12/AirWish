import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProtectionPercent,
  estimateMinutesToTargetPm25,
  findBestVentilationWindow,
  stepRoomPm25,
} from './filtration';
import type { ForecastPoint, RoomMonitor } from '../types/sentinel';

const sampleRoom: RoomMonitor = {
  id: 'living',
  name: 'Living Room',
  floor: 'Ground Floor',
  areaSqM: 28,
  ceilingHeightM: 3.0,
  maxCadrM3h: 480,
  indoorPm25: 92,
  co2Ppm: 680,
  tempC: 22.5,
  humidityPct: 48,
  purifierMode: 'turbo',
  windowsSealed: true,
  hepaFilterLifePct: 78,
  assignedOccupants: ['Rohan', 'Priya'],
};

test('Sealed room with Turbo HEPA reduces indoor PM2.5 rapidly', () => {
  const after15m = stepRoomPm25(sampleRoom, 290, 15);
  assert.ok(after15m < sampleRoom.indoorPm25, 'PM2.5 should decrease under Turbo HEPA');

  const mins = estimateMinutesToTargetPm25(sampleRoom, 290, 25);
  assert.ok(mins !== null && mins > 0 && mins < 120, 'Should reach clean target within 2 hours');
});

test('Open windows with purifier off infiltrates outdoor smog rapidly', () => {
  const openRoom: RoomMonitor = {
    ...sampleRoom,
    indoorPm25: 22,
    purifierMode: 'off',
    windowsSealed: false,
  };
  const after15m = stepRoomPm25(openRoom, 290, 15);
  assert.ok(after15m > 100, 'Open window under severe smog should cause rapid PM2.5 rise');

  const mins = estimateMinutesToTargetPm25(openRoom, 290, 25);
  assert.equal(mins, 0); // already <= 25 before stepping

  const dirtyOpenRoom: RoomMonitor = { ...openRoom, indoorPm25: 120 };
  assert.equal(estimateMinutesToTargetPm25(dirtyOpenRoom, 290, 25), null);
});

test('Protection percentage clamps between 0 and 99', () => {
  assert.equal(calculateProtectionPercent(438, 26), 94);
  assert.equal(calculateProtectionPercent(50, 65), 0);
});

test('findBestVentilationWindow identifies lowest 3-hour AQI trough', () => {
  const forecast: ForecastPoint[] = [
    { hourLabel: '06:00', hourOffset: 0, outdoorAqi: 380, outdoorPm25: 220, windKmh: 4, tempC: 12 },
    { hourLabel: '09:00', hourOffset: 3, outdoorAqi: 310, outdoorPm25: 150, windKmh: 7, tempC: 16 },
    { hourLabel: '12:00', hourOffset: 6, outdoorAqi: 90, outdoorPm25: 54, windKmh: 15, tempC: 23 },
    { hourLabel: '13:00', hourOffset: 7, outdoorAqi: 82, outdoorPm25: 48, windKmh: 16, tempC: 24 },
    { hourLabel: '14:00', hourOffset: 8, outdoorAqi: 86, outdoorPm25: 51, windKmh: 15, tempC: 24 },
    { hourLabel: '18:00', hourOffset: 12, outdoorAqi: 240, outdoorPm25: 105, windKmh: 6, tempC: 19 },
  ];

  const best = findBestVentilationWindow(forecast);
  assert.equal(best.startHour, '12:00');
  assert.equal(best.endHour, '14:00');
  assert.equal(best.isSafeToOpen, true);
});
