export type CpcbCategoryKey =
  | 'good'
  | 'satisfactory'
  | 'moderate'
  | 'poor'
  | 'very_poor'
  | 'severe';

export type PollutantKey = 'pm25' | 'pm10' | 'no2' | 'o3' | 'so2' | 'co';

export interface PollutantReadings {
  pm25: number; // µg/m³ (24-hr avg)
  pm10: number; // µg/m³ (24-hr avg)
  no2: number;  // µg/m³ (24-hr avg)
  o3: number;   // µg/m³ (8-hr avg)
  so2: number;  // µg/m³ (24-hr avg)
  co: number;   // mg/m³ (8-hr avg)
}

export interface WeatherConditions {
  tempC: number;
  humidityPct: number;
  windKmh: number;
  windDirection: string;
  visibilityKm: number;
  inversionRisk: 'Low' | 'Moderate' | 'High' | 'Severe';
  isLive?: boolean;
  lastFetchedAt?: string;
}

export interface ForecastPoint {
  hourLabel: string; // e.g. "06:00"
  hourOffset: number; // 0..23
  outdoorAqi: number;
  outdoorPm25: number;
  windKmh: number;
  tempC: number;
}

export interface MonitoringStation {
  id: string;
  name: string;
  city: string;
  region: string;
  stationCode: string;
  updatedMinutesAgo: number;
  pollutants: PollutantReadings;
  weather: WeatherConditions;
  coordinates?: { lat: number; lng: number };
  forecast24h: ForecastPoint[];
}

export type PurifierMode = 'off' | 'sleep' | 'auto' | 'turbo';

export interface RoomMonitor {
  id: string;
  name: string;
  floor: string;
  areaSqM: number;
  ceilingHeightM: number;
  maxCadrM3h: number;
  indoorPm25: number;
  co2Ppm: number;
  tempC: number;
  humidityPct: number;
  purifierMode: PurifierMode;
  windowsSealed: boolean;
  hepaFilterLifePct: number;
  assignedOccupants: string[];
}

export type VulnerabilityGroup =
  | 'Asthma'
  | 'Elderly'
  | 'Infant'
  | 'Cardiac'
  | 'Pregnant'
  | 'Outdoor Commuter'
  | 'General Adult';

export type RiskSeverity = 'critical' | 'high' | 'moderate' | 'low';

export interface FamilyMember {
  id: string;
  name: string;
  age: number;
  vulnerability: VulnerabilityGroup;
  primaryRoomId: string;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  detail: string;
  category: 'Sealing' | 'Protection' | 'Indoor Air' | 'Health';
  completed: boolean;
}

export type ViewTab = 'overview' | 'spatial' | 'rooms' | 'forecast' | 'family';
