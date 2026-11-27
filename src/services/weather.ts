import type { MonitoringStation, WeatherConditions } from '../types/sentinel';

export function degreesToCompass(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(deg / 22.5) % 16;
  return directions[idx];
}

export function computeInversionRisk(tempC: number, windKmh: number, humidityPct: number): 'Low' | 'Moderate' | 'High' | 'Severe' {
  // Stagnant cold moist air produces severe radiation inversion in urban winter
  if (windKmh < 5 && tempC < 16 && humidityPct > 70) return 'Severe';
  if (windKmh < 8 && tempC < 20) return 'High';
  if (windKmh < 12) return 'Moderate';
  return 'Low';
}

export async function fetchLiveStationWeather(
  station: MonitoringStation
): Promise<WeatherConditions | null> {
  const coords = station.coordinates;
  if (!coords) return null;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&timezone=auto`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    const data = await res.json();
    const current = data.current;
    if (!current) return null;

    const tempC = Math.round(current.temperature_2m * 10) / 10;
    const humidityPct = Math.round(current.relative_humidity_2m);
    const windKmh = Math.round(current.wind_speed_10m * 10) / 10;
    const windDirection = degreesToCompass(current.wind_direction_10m);
    const inversionRisk = computeInversionRisk(tempC, windKmh, humidityPct);

    // Approximate visibility from humidity & wind if not directly reported
    const visibilityKm = Math.max(0.5, Math.min(10, Math.round((10 - (humidityPct / 100) * 6 + (windKmh / 20) * 2) * 10) / 10));

    return {
      tempC,
      humidityPct,
      windKmh,
      windDirection,
      visibilityKm,
      inversionRisk,
      isLive: true,
      lastFetchedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  } catch {
    // Graceful offline fallback
    return null;
  }
}
