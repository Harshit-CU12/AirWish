import type {
  ChecklistItem,
  FamilyMember,
  ForecastPoint,
  MonitoringStation,
  RoomMonitor,
} from '../types/sentinel';
import { calculatePollutantSubIndex } from '../utils/aqi';

function buildDiurnalForecast(
  basePm25: number,
  baseTemp: number,
  baseWind: number,
  diurnalAmplitude: number
): ForecastPoint[] {
  const hours = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
  ];

  // Start at 06:00 local dawn smog reading
  return Array.from({ length: 24 }, (_, idx) => {
    const hourOfDay = (6 + idx) % 24;
    // Smog peaks at dawn (06:00-08:00) and late night (21:00-00:00); dips mid-afternoon (14:00-16:00)
    const afternoonDispersion = Math.exp(-Math.pow((hourOfDay - 15) / 3.4, 2));
    const morningPeak = Math.exp(-Math.pow((hourOfDay - 7) / 2.6, 2));
    const nightInversion = hourOfDay >= 20 || hourOfDay <= 3 ? 0.16 : 0;

    const factor = 1 + morningPeak * 0.14 + nightInversion - afternoonDispersion * diurnalAmplitude;
    const pm25 = Math.max(8, Math.round(basePm25 * factor));
    const aqi = calculatePollutantSubIndex('pm25', pm25);
    const wind = Math.max(2, Math.round((baseWind + afternoonDispersion * 8.5) * 10) / 10);
    const temp = Math.round((baseTemp + Math.sin(((hourOfDay - 6) / 24) * Math.PI * 2) * 6.5) * 10) / 10;

    return {
      hourLabel: hours[hourOfDay],
      hourOffset: idx,
      outdoorAqi: aqi,
      outdoorPm25: pm25,
      windKmh: wind,
      tempC: temp,
    };
  });
}

export const MONITORING_STATIONS: MonitoringStation[] = [
  {
    id: 'delhi-anand-vihar',
    name: 'Anand Vihar',
    city: 'New Delhi',
    region: 'East Delhi · CPCB Station #DL-AV04',
    stationCode: 'DL-AV04',
    coordinates: { lat: 28.6469, lng: 77.3160 },
    updatedMinutesAgo: 2,
    pollutants: {
      pm25: 298,
      pm10: 446,
      no2: 94,
      o3: 42,
      so2: 28,
      co: 2.6,
    },
    weather: {
      tempC: 14.2,
      humidityPct: 79,
      windKmh: 4.2,
      windDirection: 'NW',
      visibilityKm: 0.4,
      inversionRisk: 'Severe',
    },
    forecast24h: buildDiurnalForecast(285, 16, 4.2, 0.36),
  },
  {
    id: 'gurugram-sec51',
    name: 'Sector 51',
    city: 'Gurugram',
    region: 'Delhi NCR · HSPCB Station #HR-GG51',
    stationCode: 'HR-GG51',
    coordinates: { lat: 28.4312, lng: 77.0725 },
    updatedMinutesAgo: 4,
    pollutants: {
      pm25: 186,
      pm10: 318,
      no2: 72,
      o3: 58,
      so2: 21,
      co: 1.9,
    },
    weather: {
      tempC: 15.8,
      humidityPct: 68,
      windKmh: 6.5,
      windDirection: 'WNW',
      visibilityKm: 1.1,
      inversionRisk: 'High',
    },
    forecast24h: buildDiurnalForecast(180, 17, 6.5, 0.42),
  },
  {
    id: 'kolkata-ballygunge',
    name: 'Ballygunge',
    city: 'Kolkata',
    region: 'South Kolkata · WBPCB Station #WB-BG12',
    stationCode: 'WB-BG12',
    coordinates: { lat: 22.5280, lng: 88.3656 },
    updatedMinutesAgo: 5,
    pollutants: {
      pm25: 108,
      pm10: 214,
      no2: 64,
      o3: 49,
      so2: 19,
      co: 1.4,
    },
    weather: {
      tempC: 22.4,
      humidityPct: 72,
      windKmh: 8.1,
      windDirection: 'NNE',
      visibilityKm: 2.6,
      inversionRisk: 'Moderate',
    },
    forecast24h: buildDiurnalForecast(106, 23, 8.1, 0.38),
  },
  {
    id: 'mumbai-bkc',
    name: 'Bandra Kurla Complex',
    city: 'Mumbai',
    region: 'Western Suburbs · MPCB Station #MH-BKC2',
    stationCode: 'MH-BKC2',
    coordinates: { lat: 19.0662, lng: 72.8687 },
    updatedMinutesAgo: 3,
    pollutants: {
      pm25: 74,
      pm10: 152,
      no2: 52,
      o3: 66,
      so2: 16,
      co: 1.1,
    },
    weather: {
      tempC: 27.6,
      humidityPct: 64,
      windKmh: 14.2,
      windDirection: 'W',
      visibilityKm: 4.8,
      inversionRisk: 'Low',
    },
    forecast24h: buildDiurnalForecast(72, 27, 14.2, 0.34),
  },
  {
    id: 'bengaluru-indiranagar',
    name: 'Indiranagar',
    city: 'Bengaluru',
    region: 'East Bengaluru · KSPCB Station #KA-IN08',
    stationCode: 'KA-IN08',
    coordinates: { lat: 12.9784, lng: 77.6408 },
    updatedMinutesAgo: 1,
    pollutants: {
      pm25: 44,
      pm10: 78,
      no2: 34,
      o3: 41,
      so2: 11,
      co: 0.7,
    },
    weather: {
      tempC: 21.8,
      humidityPct: 58,
      windKmh: 16.4,
      windDirection: 'E',
      visibilityKm: 9.2,
      inversionRisk: 'Low',
    },
    forecast24h: buildDiurnalForecast(42, 22, 16.4, 0.32),
  },
];

export const DEFAULT_ROOMS: RoomMonitor[] = [
  {
    id: 'living-room',
    name: 'Living Room',
    floor: 'Main Level',
    areaSqM: 32,
    ceilingHeightM: 3.0,
    maxCadrM3h: 520,
    indoorPm25: 58,
    co2Ppm: 640,
    tempC: 22.4,
    humidityPct: 49,
    purifierMode: 'auto',
    windowsSealed: false, // One unsealed room at startup makes Safe Mode immediately impactful
    hepaFilterLifePct: 76,
    assignedOccupants: ['Rohan', 'Priya'],
  },
  {
    id: 'kids-room',
    name: 'Kids Bedroom',
    floor: 'Upper Level',
    areaSqM: 18,
    ceilingHeightM: 2.9,
    maxCadrM3h: 410,
    indoorPm25: 19,
    co2Ppm: 590,
    tempC: 21.8,
    humidityPct: 51,
    purifierMode: 'turbo',
    windowsSealed: true,
    hepaFilterLifePct: 84,
    assignedOccupants: ['Aarav'],
  },
  {
    id: 'elderly-suite',
    name: 'Elderly Suite',
    floor: 'Main Level',
    areaSqM: 21,
    ceilingHeightM: 3.0,
    maxCadrM3h: 440,
    indoorPm25: 22,
    co2Ppm: 620,
    tempC: 23.1,
    humidityPct: 47,
    purifierMode: 'auto',
    windowsSealed: true,
    hepaFilterLifePct: 14, // Low filter warning demo
    assignedOccupants: ['Meera'],
  },
  {
    id: 'master-bedroom',
    name: 'Master Bedroom',
    floor: 'Upper Level',
    areaSqM: 24,
    ceilingHeightM: 2.9,
    maxCadrM3h: 460,
    indoorPm25: 31,
    co2Ppm: 675,
    tempC: 21.5,
    humidityPct: 50,
    purifierMode: 'sleep',
    windowsSealed: true,
    hepaFilterLifePct: 62,
    assignedOccupants: ['Rohan', 'Priya'],
  },
];

export const DEFAULT_FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: 'member-aarav',
    name: 'Aarav Sharma',
    age: 7,
    vulnerability: 'Asthma',
    primaryRoomId: 'kids-room',
    notes: 'School bus suspended during GRAP-IV; keep budesonide inhaler packed.',
  },
  {
    id: 'member-meera',
    name: 'Meera Sharma',
    age: 71,
    vulnerability: 'Elderly',
    primaryRoomId: 'elderly-suite',
    notes: 'Morning walk moved indoors; check SpO₂ before sleep.',
  },
  {
    id: 'member-rohan',
    name: 'Rohan Sharma',
    age: 38,
    vulnerability: 'Outdoor Commuter',
    primaryRoomId: 'living-room',
    notes: 'Metro + 15-min walk commute; requires fitted N95 with nose clip.',
  },
  {
    id: 'member-priya',
    name: 'Priya Sharma',
    age: 35,
    vulnerability: 'General Adult',
    primaryRoomId: 'master-bedroom',
    notes: 'Working from home; manages HEPA pre-filter vacuuming.',
  },
];

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  {
    id: 'chk-seal',
    label: 'Seal balcony & main entry door drafts',
    detail: 'Use silicone weatherstripping or damp door-sweep towels when AQI exceeds 300.',
    category: 'Sealing',
    completed: true,
  },
  {
    id: 'chk-n95',
    label: 'Verify N95 / N99 mask stock at entryway',
    detail: 'Confirm child-size N95 masks and valveless respirators are clean and sealed.',
    category: 'Protection',
    completed: false,
  },
  {
    id: 'chk-wetmop',
    label: 'Wet-mop floors instead of dry sweeping',
    detail: 'Dry brooms re-suspend settled PM2.5 and PM10 particulates into breathing zones.',
    category: 'Indoor Air',
    completed: false,
  },
  {
    id: 'chk-prefilter',
    label: 'Check Elderly Suite HEPA filter replacement',
    detail: 'Filter life is at 14% — vacuum pre-filter mesh and order H13 replacement cartridge.',
    category: 'Indoor Air',
    completed: false,
  },
  {
    id: 'chk-saline',
    label: 'Evening saline nasal rinse & hydration',
    detail: 'Helps clear trapped fine particulates from upper airways after any outdoor transit.',
    category: 'Health',
    completed: false,
  },
];
