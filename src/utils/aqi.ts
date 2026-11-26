import type {
  CpcbCategoryKey,
  FamilyMember,
  PollutantKey,
  PollutantReadings,
  RiskSeverity,
  VulnerabilityGroup,
} from '../types/sentinel';

interface Breakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

const CPCB_BREAKPOINTS: Record<PollutantKey, Breakpoint[]> = {
  pm25: [
    { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
    { cLow: 30, cHigh: 60, iLow: 51, iHigh: 100 },
    { cLow: 60, cHigh: 90, iLow: 101, iHigh: 200 },
    { cLow: 90, cHigh: 120, iLow: 201, iHigh: 300 },
    { cLow: 120, cHigh: 250, iLow: 301, iHigh: 400 },
    { cLow: 250, cHigh: 380, iLow: 401, iHigh: 500 },
  ],
  pm10: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 50, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 100, cHigh: 250, iLow: 101, iHigh: 200 },
    { cLow: 250, cHigh: 350, iLow: 201, iHigh: 300 },
    { cLow: 350, cHigh: 430, iLow: 301, iHigh: 400 },
    { cLow: 430, cHigh: 550, iLow: 401, iHigh: 500 },
  ],
  no2: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 40, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 80, cHigh: 180, iLow: 101, iHigh: 200 },
    { cLow: 180, cHigh: 280, iLow: 201, iHigh: 300 },
    { cLow: 280, cHigh: 400, iLow: 301, iHigh: 400 },
    { cLow: 400, cHigh: 550, iLow: 401, iHigh: 500 },
  ],
  o3: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 50, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 100, cHigh: 168, iLow: 101, iHigh: 200 },
    { cLow: 168, cHigh: 208, iLow: 201, iHigh: 300 },
    { cLow: 208, cHigh: 748, iLow: 301, iHigh: 400 },
    { cLow: 748, cHigh: 900, iLow: 401, iHigh: 500 },
  ],
  so2: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 40, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 80, cHigh: 380, iLow: 101, iHigh: 200 },
    { cLow: 380, cHigh: 800, iLow: 201, iHigh: 300 },
    { cLow: 800, cHigh: 1600, iLow: 301, iHigh: 400 },
    { cLow: 1600, cHigh: 2100, iLow: 401, iHigh: 500 },
  ],
  co: [
    { cLow: 0, cHigh: 1.0, iLow: 0, iHigh: 50 },
    { cLow: 1.0, cHigh: 2.0, iLow: 51, iHigh: 100 },
    { cLow: 2.0, cHigh: 10.0, iLow: 101, iHigh: 200 },
    { cLow: 10.0, cHigh: 17.0, iLow: 201, iHigh: 300 },
    { cLow: 17.0, cHigh: 34.0, iLow: 301, iHigh: 400 },
    { cLow: 34.0, cHigh: 46.0, iLow: 401, iHigh: 500 },
  ],
};

export interface PollutantMeta {
  key: PollutantKey;
  label: string;
  formula: string;
  unit: string;
  safeLimit: number;
  sourceHint: string;
}

export const POLLUTANT_META: Record<PollutantKey, PollutantMeta> = {
  pm25: {
    key: 'pm25',
    label: 'Fine Particulate',
    formula: 'PM2.5',
    unit: 'µg/m³',
    safeLimit: 60,
    sourceHint: 'Combustion, crop residue, diesel exhaust',
  },
  pm10: {
    key: 'pm10',
    label: 'Coarse Dust',
    formula: 'PM10',
    unit: 'µg/m³',
    safeLimit: 100,
    sourceHint: 'Road dust, construction, windblown silt',
  },
  no2: {
    key: 'no2',
    label: 'Nitrogen Dioxide',
    formula: 'NO₂',
    unit: 'µg/m³',
    safeLimit: 80,
    sourceHint: 'Vehicular traffic, power generation',
  },
  o3: {
    key: 'o3',
    label: 'Ground Ozone',
    formula: 'O₃',
    unit: 'µg/m³',
    safeLimit: 100,
    sourceHint: 'Photochemical midday smog reaction',
  },
  so2: {
    key: 'so2',
    label: 'Sulfur Dioxide',
    formula: 'SO₂',
    unit: 'µg/m³',
    safeLimit: 80,
    sourceHint: 'Industrial boilers, coal combustion',
  },
  co: {
    key: 'co',
    label: 'Carbon Monoxide',
    formula: 'CO',
    unit: 'mg/m³',
    safeLimit: 2.0,
    sourceHint: 'Incomplete fuel burning, traffic idling',
  },
};

export function calculatePollutantSubIndex(
  pollutant: PollutantKey,
  concentration: number
): number {
  if (typeof concentration !== 'number' || Number.isNaN(concentration) || !Number.isFinite(concentration)) {
    return 0;
  }
  const c = Math.max(0, concentration);
  const bps = CPCB_BREAKPOINTS[pollutant];
  if (!bps || bps.length === 0) return 0;

  for (const bp of bps) {
    if (c <= bp.cHigh) {
      const span = bp.cHigh - bp.cLow;
      if (span <= 0) return bp.iLow;
      const raw = ((bp.iHigh - bp.iLow) / span) * (c - bp.cLow) + bp.iLow;
      return Math.round(raw);
    }
  }

  // Linearly extrapolate above 500 capped at 600 for standard CPCB display
  const last = bps[bps.length - 1];
  const span = last.cHigh - last.cLow;
  const slope = span > 0 ? (last.iHigh - last.iLow) / span : 1;
  return Math.min(600, Math.round(last.iHigh + slope * (c - last.cHigh)));
}

export interface AqiAssessment {
  aqi: number;
  prominentPollutant: PollutantKey;
  subIndices: Record<PollutantKey, number>;
  category: CpcbCategoryMeta;
}

export interface CpcbCategoryMeta {
  key: CpcbCategoryKey;
  label: string;
  rangeLabel: string;
  colorHex: string;
  textHex: string; // WCAG AA high-contrast text color on dark surfaces
  rimColor: string;
  glowShadow: string;
  washGradient: string;
  pillBg: string;
  pillBorder: string;
  healthImpact: string;
  maskGuidance: string;
  ventilationGuidance: string;
}

export const CPCB_CATEGORIES: Record<CpcbCategoryKey, CpcbCategoryMeta> = {
  good: {
    key: 'good',
    label: 'Good',
    rangeLabel: '0–50',
    colorHex: '#10B981',
    textHex: '#6EE7B7',
    rimColor: '#10B981',
    glowShadow: '0 0 36px -10px rgba(16, 185, 129, 0.28)',
    washGradient: 'linear-gradient(180deg, rgba(16, 185, 129, 0.14) 0%, rgba(19, 27, 46, 0) 62%)',
    pillBg: 'rgba(16, 185, 129, 0.15)',
    pillBorder: 'rgba(16, 185, 129, 0.40)',
    healthImpact: 'Minimal impact. Clean air suitable for all outdoor activity and natural cross-ventilation.',
    maskGuidance: 'No mask required',
    ventilationGuidance: 'Safe to open windows for natural air exchange',
  },
  satisfactory: {
    key: 'satisfactory',
    label: 'Satisfactory',
    rangeLabel: '51–100',
    colorHex: '#84CC16',
    textHex: '#BEF264',
    rimColor: '#84CC16',
    glowShadow: '0 0 36px -10px rgba(132, 204, 22, 0.24)',
    washGradient: 'linear-gradient(180deg, rgba(132, 204, 22, 0.13) 0%, rgba(19, 27, 46, 0) 62%)',
    pillBg: 'rgba(132, 204, 22, 0.15)',
    pillBorder: 'rgba(132, 204, 22, 0.40)',
    healthImpact: 'Minor breathing discomfort possible only for unusually sensitive respiratory patients.',
    maskGuidance: 'Optional for sensitive individuals',
    ventilationGuidance: 'Brief afternoon ventilation acceptable',
  },
  moderate: {
    key: 'moderate',
    label: 'Moderate',
    rangeLabel: '101–200',
    colorHex: '#F59E0B',
    textHex: '#FCD34D',
    rimColor: '#F59E0B',
    glowShadow: '0 0 36px -10px rgba(245, 158, 11, 0.26)',
    washGradient: 'linear-gradient(180deg, rgba(245, 158, 11, 0.15) 0%, rgba(19, 27, 46, 0) 62%)',
    pillBg: 'rgba(245, 158, 11, 0.15)',
    pillBorder: 'rgba(245, 158, 11, 0.40)',
    healthImpact: 'Breathing discomfort for people with asthma, lungs, or heart disease during exertion.',
    maskGuidance: 'N95 advised for asthma & commuters',
    ventilationGuidance: 'Keep bedroom windows closed; run HEPA on Auto',
  },
  poor: {
    key: 'poor',
    label: 'Poor',
    rangeLabel: '201–300',
    colorHex: '#F97316',
    textHex: '#FDBA74',
    rimColor: '#F97316',
    glowShadow: '0 0 38px -10px rgba(249, 115, 22, 0.30)',
    washGradient: 'linear-gradient(180deg, rgba(249, 115, 22, 0.16) 0%, rgba(19, 27, 46, 0) 62%)',
    pillBg: 'rgba(249, 115, 22, 0.15)',
    pillBorder: 'rgba(249, 115, 22, 0.40)',
    healthImpact: 'Breathing discomfort for most people on prolonged exposure; avoid vigorous outdoor exercise.',
    maskGuidance: 'Fitted N95 mask required outdoors',
    ventilationGuidance: 'Seal perimeter windows; run HEPA continuously',
  },
  very_poor: {
    key: 'very_poor',
    label: 'Very Poor',
    rangeLabel: '301–400',
    colorHex: '#EF4444',
    textHex: '#FCA5A5',
    rimColor: '#EF4444',
    glowShadow: '0 0 40px -10px rgba(239, 68, 68, 0.34)',
    washGradient: 'linear-gradient(180deg, rgba(239, 68, 68, 0.18) 0%, rgba(19, 27, 46, 0) 65%)',
    pillBg: 'rgba(239, 68, 68, 0.15)',
    pillBorder: 'rgba(239, 68, 68, 0.40)',
    healthImpact: 'Respiratory illness on prolonged exposure. High risk for children, elderly, and asthma patients.',
    maskGuidance: 'N95 / N99 mandatory for any outdoor step',
    ventilationGuidance: 'Seal all windows & balcony doors immediately',
  },
  severe: {
    key: 'severe',
    label: 'Severe',
    rangeLabel: '401–500+',
    colorHex: '#991B1B',
    textHex: '#FECACA',
    rimColor: '#DC2626',
    glowShadow: '0 0 40px -10px rgba(153, 27, 27, 0.45)',
    washGradient: 'linear-gradient(180deg, rgba(153, 27, 27, 0.28) 0%, rgba(127, 29, 29, 0.08) 45%, rgba(19, 27, 46, 0) 75%)',
    pillBg: 'rgba(153, 27, 27, 0.35)',
    pillBorder: 'rgba(239, 68, 68, 0.55)',
    healthImpact: 'Health emergency: affects healthy people and seriously impacts those with existing diseases.',
    maskGuidance: 'Avoid outdoors; N99 sealed respirator if unavoidable',
    ventilationGuidance: 'Full indoor sanctuary lockdown + Turbo HEPA',
  },
};

export function getCpcbCategory(aqi: number): CpcbCategoryMeta {
  if (aqi <= 50) return CPCB_CATEGORIES.good;
  if (aqi <= 100) return CPCB_CATEGORIES.satisfactory;
  if (aqi <= 200) return CPCB_CATEGORIES.moderate;
  if (aqi <= 300) return CPCB_CATEGORIES.poor;
  if (aqi <= 400) return CPCB_CATEGORIES.very_poor;
  return CPCB_CATEGORIES.severe;
}

export function evaluateStationAqi(readings: PollutantReadings): AqiAssessment {
  const keys: PollutantKey[] = ['pm25', 'pm10', 'no2', 'o3', 'so2', 'co'];
  const subIndices = {} as Record<PollutantKey, number>;
  let maxAqi = 0;
  let prominent: PollutantKey = 'pm25';

  for (const key of keys) {
    const sub = calculatePollutantSubIndex(key, readings[key]);
    subIndices[key] = sub;
    if (sub >= maxAqi) {
      maxAqi = sub;
      prominent = key;
    }
  }

  return {
    aqi: maxAqi,
    prominentPollutant: prominent,
    subIndices,
    category: getCpcbCategory(maxAqi),
  };
}

export interface FamilyMemberGuidance {
  severity: RiskSeverity;
  severityLabel: string;
  riskBadgeLabel: string;
  isSensitiveGroupAlert: boolean;
  maskGrade: string;
  maxOutdoorMinutes: number;
  headline: string;
  actionTip: string;
}

const HIGH_SENSITIVITY_GROUPS: VulnerabilityGroup[] = [
  'Asthma',
  'Elderly',
  'Infant',
  'Cardiac',
  'Pregnant',
];

function buildDynamicRiskBadge(
  vulnerability: VulnerabilityGroup,
  severity: RiskSeverity,
  outdoorAqi: number
): string {
  switch (vulnerability) {
    case 'Asthma':
      if (severity === 'critical') return 'Critical: Asthma Emergency';
      if (severity === 'high') return 'High-Risk for Asthma';
      if (severity === 'moderate') return 'Sensitive Group Alert · Asthma';
      return 'Low Asthma Risk';
    case 'Infant':
      if (severity === 'critical') return 'Critical: Infant Air Alert';
      if (severity === 'high') return 'High-Risk for Infants';
      if (severity === 'moderate') return 'Sensitive Group Alert · Infant';
      return 'Safe Nursery Air';
    case 'Elderly':
      if (severity === 'critical') return 'Severe Risk for Elderly';
      if (severity === 'high') return 'Sensitive Group Alert · Elderly';
      if (severity === 'moderate') return 'Elderly Air Precaution';
      return 'Low Respiratory Risk';
    case 'Cardiac':
      if (severity === 'critical') return 'Critical: Cardiac Smog Alert';
      if (severity === 'high') return 'Sensitive Group Alert · Cardiac';
      if (severity === 'moderate') return 'Cardiac Air Precaution';
      return 'Low Exposure Risk';
    case 'Pregnant':
      if (severity === 'critical') return 'Critical: Prenatal Air Alert';
      if (severity === 'high') return 'Sensitive Group Alert · Prenatal';
      if (severity === 'moderate') return 'Prenatal Air Precaution';
      return 'Low Exposure Risk';
    case 'Outdoor Commuter':
      if (severity === 'critical') return 'Severe Transit Hazard';
      if (severity === 'high') return 'High-Risk Commute';
      if (severity === 'moderate') return 'Commuter Mask Alert';
      return 'Safe Transit Air';
    case 'General Adult':
    default:
      if (severity === 'critical') {
        return outdoorAqi > 400 ? 'Severe Smog Emergency' : 'Critical Air Alert';
      }
      if (severity === 'high') return 'Unhealthy Exposure Risk';
      if (severity === 'moderate') return 'Moderate Exposure';
      return 'Low Risk';
  }
}

export function evaluateMemberGuidance(
  member: FamilyMember,
  outdoorAqi: number,
  indoorAqi: number
): FamilyMemberGuidance {
  const isSensitive = HIGH_SENSITIVITY_GROUPS.includes(member.vulnerability);
  const effectiveExposure = Math.max(outdoorAqi, indoorAqi * 1.4);

  if (outdoorAqi > 400 || (isSensitive && outdoorAqi > 300) || indoorAqi > 150) {
    const severity: RiskSeverity = 'critical';
    return {
      severity,
      severityLabel: 'Critical Risk',
      riskBadgeLabel: buildDynamicRiskBadge(member.vulnerability, severity, outdoorAqi),
      isSensitiveGroupAlert: isSensitive,
      maskGrade: isSensitive ? 'Stay Indoors (N99 only if emergency)' : 'Fitted N99',
      maxOutdoorMinutes: isSensitive ? 0 : 15,
      headline:
        member.vulnerability === 'Asthma'
          ? 'Zero outdoor exposure; keep rescue inhaler within reach'
          : member.vulnerability === 'Infant'
            ? 'Keep strictly inside HEPA-purified nursery (< 25 µg/m³)'
            : member.vulnerability === 'Elderly' || member.vulnerability === 'Cardiac'
              ? 'Strictly indoors; monitor SpO₂ and avoid exertion'
              : 'Cancel outdoor errands; maintain sealed indoor sanctuary',
      actionTip:
        indoorAqi > 60
          ? `Assigned room AQI is elevated (${indoorAqi}). Seal windows and engage Turbo HEPA.`
          : `Assigned room is protected (AQI ${indoorAqi}). Keep doors latched.`,
    };
  }

  if (outdoorAqi > 250 || (isSensitive && outdoorAqi > 140)) {
    const severity: RiskSeverity = 'high';
    return {
      severity,
      severityLabel: 'High Risk',
      riskBadgeLabel: buildDynamicRiskBadge(member.vulnerability, severity, outdoorAqi),
      isSensitiveGroupAlert: isSensitive,
      maskGrade: 'Fitted N95',
      maxOutdoorMinutes: isSensitive ? 15 : 45,
      headline:
        member.vulnerability === 'Outdoor Commuter'
          ? 'Wear sealed N95 during transit; avoid open-air waiting'
          : member.vulnerability === 'Asthma'
            ? 'High bronchospasm risk outdoors; restrict to HEPA-filtered rooms'
            : 'Restrict outdoor trips to essential errands only',
      actionTip:
        indoorAqi > 50
          ? `Run room purifier on Auto or Turbo until indoor AQI drops under 50.`
          : `Indoor air is well controlled (AQI ${indoorAqi}); limit outdoor stay.`,
    };
  }

  if (effectiveExposure > 100) {
    const severity: RiskSeverity = 'moderate';
    return {
      severity,
      severityLabel: 'Moderate',
      riskBadgeLabel: buildDynamicRiskBadge(member.vulnerability, severity, outdoorAqi),
      isSensitiveGroupAlert: isSensitive,
      maskGrade: isSensitive ? 'N95 outdoors' : 'Optional N95',
      maxOutdoorMinutes: isSensitive ? 45 : 120,
      headline: isSensitive
        ? 'Avoid morning smog peaks; prefer midday outdoor intervals'
        : 'Reduce prolonged strenuous outdoor cardio',
      actionTip: 'Keep purifier on Auto mode overnight when inversion traps smog.',
    };
  }

  const severity: RiskSeverity = 'low';
  return {
    severity,
    severityLabel: 'Low Risk',
    riskBadgeLabel: buildDynamicRiskBadge(member.vulnerability, severity, outdoorAqi),
    isSensitiveGroupAlert: false,
    maskGrade: 'No mask needed',
    maxOutdoorMinutes: 240,
    headline: 'Normal outdoor activity safe across daytime hours',
    actionTip: 'Standard ventilation acceptable; monitor evening AQI shift.',
  };
}
