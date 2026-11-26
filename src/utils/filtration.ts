import type { ForecastPoint, PurifierMode, RoomMonitor } from '../types/sentinel';
import { calculatePollutantSubIndex } from './aqi';

export const PURIFIER_MODE_SPECS: Record<
  PurifierMode,
  { label: string; cadrFraction: number; noiseDb: number; watts: number }
> = {
  off: { label: 'Off', cadrFraction: 0, noiseDb: 0, watts: 0 },
  sleep: { label: 'Sleep', cadrFraction: 0.28, noiseDb: 24, watts: 9 },
  auto: { label: 'Auto', cadrFraction: 0.62, noiseDb: 38, watts: 26 },
  turbo: { label: 'Turbo', cadrFraction: 1.0, noiseDb: 54, watts: 52 },
};

export function getRoomVolumeM3(room: Pick<RoomMonitor, 'areaSqM' | 'ceilingHeightM'>): number {
  return Math.max(10, room.areaSqM * room.ceilingHeightM);
}

export function getEffectiveCadrM3h(room: Pick<RoomMonitor, 'maxCadrM3h' | 'purifierMode' | 'hepaFilterLifePct'>): number {
  const spec = PURIFIER_MODE_SPECS[room.purifierMode];
  // Slight efficiency drop if HEPA filter is heavily saturated (< 15%)
  const filterHealthFactor = room.hepaFilterLifePct < 15 ? 0.78 : 1.0;
  return room.maxCadrM3h * spec.cadrFraction * filterHealthFactor;
}

/**
 * Single-zone mass-balance PM2.5 step over `deltaMinutes`.
 * dC/dt = p * ACH_infil * C_out - (ACH_infil + CADR/V + k_dep) * C_in
 */
export function stepRoomPm25(
  room: RoomMonitor,
  outdoorPm25: number,
  deltaMinutes: number
): number {
  const dtHours = Math.max(0, deltaMinutes) / 60;
  if (dtHours === 0) return room.indoorPm25;

  const volumeM3 = getRoomVolumeM3(room);
  const cadr = getEffectiveCadrM3h(room);
  const achPurifier = cadr / volumeM3;
  const achInfiltration = room.windowsSealed ? 0.35 : 2.8;
  const penetrationFactor = room.windowsSealed ? 0.72 : 0.96;
  const naturalDeposition = 0.18;

  const totalLossRate = achInfiltration + achPurifier + naturalDeposition;
  const sourceRate = penetrationFactor * achInfiltration * outdoorPm25 + 1.5; // slight indoor baseline

  const steadyState = sourceRate / totalLossRate;
  const nextPm25 =
    steadyState + (room.indoorPm25 - steadyState) * Math.exp(-totalLossRate * dtHours);

  return Math.max(4, Math.round(nextPm25 * 10) / 10);
}

/**
 * Computes steady-state PM2.5 the room will converge toward under its current settings.
 */
export function getSteadyStatePm25(room: RoomMonitor, outdoorPm25: number): number {
  const volumeM3 = getRoomVolumeM3(room);
  const cadr = getEffectiveCadrM3h(room);
  const achPurifier = cadr / volumeM3;
  const achInfiltration = room.windowsSealed ? 0.35 : 2.8;
  const penetrationFactor = room.windowsSealed ? 0.72 : 0.96;
  const naturalDeposition = 0.18;

  const totalLossRate = achInfiltration + achPurifier + naturalDeposition;
  const sourceRate = penetrationFactor * achInfiltration * outdoorPm25 + 1.5;
  return Math.max(4, Math.round((sourceRate / totalLossRate) * 10) / 10);
}

/**
 * Estimates minutes needed to reach clean air target (PM2.5 <= targetPm25, default 25 µg/m³).
 * Returns 0 if already below target, or null if current purifier/window state cannot reach target.
 */
export function estimateMinutesToTargetPm25(
  room: RoomMonitor,
  outdoorPm25: number,
  targetPm25 = 25
): number | null {
  if (room.indoorPm25 <= targetPm25) return 0;

  const volumeM3 = getRoomVolumeM3(room);
  const cadr = getEffectiveCadrM3h(room);
  const achPurifier = cadr / volumeM3;
  const achInfiltration = room.windowsSealed ? 0.35 : 2.8;
  const penetrationFactor = room.windowsSealed ? 0.72 : 0.96;
  const naturalDeposition = 0.18;

  const totalLossRate = achInfiltration + achPurifier + naturalDeposition;
  const sourceRate = penetrationFactor * achInfiltration * outdoorPm25 + 1.5;
  const steadyState = sourceRate / totalLossRate;

  if (steadyState >= targetPm25) {
    return null; // Cannot reach target without sealing windows or raising CADR
  }

  const ratio = (targetPm25 - steadyState) / (room.indoorPm25 - steadyState);
  if (ratio <= 0) return null;
  const hours = -Math.log(ratio) / totalLossRate;
  return Math.max(1, Math.ceil(hours * 60));
}

export function getRoomIndoorAqi(room: Pick<RoomMonitor, 'indoorPm25'>): number {
  return calculatePollutantSubIndex('pm25', room.indoorPm25);
}

export function calculateProtectionPercent(outdoorAqi: number, indoorAqi: number): number {
  if (outdoorAqi <= 0) return 0;
  const reduction = ((outdoorAqi - indoorAqi) / outdoorAqi) * 100;
  return Math.max(0, Math.min(99, Math.round(reduction)));
}

export function projectIndoorForecastAqi(
  forecast: ForecastPoint[],
  rooms: RoomMonitor[]
): number[] {
  if (rooms.length === 0) return forecast.map((f) => f.outdoorAqi);

  return forecast.map((pt) => {
    const avgSteadyPm25 =
      rooms.reduce((acc, r) => acc + getSteadyStatePm25(r, pt.outdoorPm25), 0) / rooms.length;
    return calculatePollutantSubIndex('pm25', avgSteadyPm25);
  });
}

export interface VentilationWindow {
  startHour: string;
  endHour: string;
  avgAqi: number;
  isSafeToOpen: boolean;
  startIndex: number;
}

/**
 * Finds the lowest-AQI 3-hour contiguous window in a 24h forecast.
 */
export function findBestVentilationWindow(forecast: ForecastPoint[]): VentilationWindow {
  if (forecast.length === 0) {
    return {
      startHour: '14:00',
      endHour: '17:00',
      avgAqi: 0,
      isSafeToOpen: true,
      startIndex: 0,
    };
  }

  const windowSize = Math.min(3, forecast.length);
  let bestStart = 0;
  let bestAvg = Infinity;

  for (let i = 0; i <= forecast.length - windowSize; i++) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += forecast[i + j].outdoorAqi;
    }
    const avg = sum / windowSize;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestStart = i;
    }
  }

  const endIdx = Math.min(forecast.length - 1, bestStart + windowSize - 1);
  const roundedAvg = Math.round(bestAvg);

  return {
    startHour: forecast[bestStart].hourLabel,
    endHour: forecast[endIdx].hourLabel,
    avgAqi: roundedAvg,
    isSafeToOpen: roundedAvg <= 100,
    startIndex: bestStart,
  };
}
