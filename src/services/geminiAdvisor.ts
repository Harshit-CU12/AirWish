import { GoogleGenAI } from '@google/genai';
import type { FamilyMember, MonitoringStation, RoomMonitor } from '../types/sentinel';
import type { AqiAssessment } from '../utils/aqi';

const SESSION_KEY = 'airwish_gemini_key';

export function getStoredGeminiKey(): string {
  try {
    const session = window.sessionStorage.getItem(SESSION_KEY);
    if (session) return session;
  } catch {
    // Ignore storage errors
  }
  return (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY ?? '';
}

export function saveStoredGeminiKey(key: string): void {
  try {
    if (key.trim()) {
      window.sessionStorage.setItem(SESSION_KEY, key.trim());
    } else {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export interface AdvisoryRequest {
  station: MonitoringStation;
  assessment: AqiAssessment;
  rooms: RoomMonitor[];
  members: FamilyMember[];
  userQuery?: string;
}

export async function askGeminiAdvisor(
  req: AdvisoryRequest,
  apiKey: string
): Promise<string> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('Please provide a Gemini API key to activate the AI Medical Advisor.');
  }

  const ai = new GoogleGenAI({ apiKey: cleanKey });

  const membersContext = req.members.map((m) => {
    return `- ${m.name} (Age ${m.age}, Condition: ${m.vulnerability}, Room: ${m.primaryRoomId}${m.notes ? `, Note: ${m.notes}` : ''})`;
  }).join('\n');

  const roomsContext = req.rooms.map((r) => {
    return `- ${r.name}: PM2.5 ${r.indoorPm25} µg/m³, CO₂ ${r.co2Ppm} ppm, Window: ${r.windowsSealed ? 'Sealed' : 'OPEN'}, Mode: ${r.purifierMode}, Filter: ${r.hepaFilterLifePct}%`;
  }).join('\n');

  const prompt = `You are the AirWish Clinical Environmental Health & Pulmonology AI Advisor.
Your objective is to evaluate current urban smog telemetry calibrated to CPCB NAAQS standards and generate prioritized medical safeguards for the user's household.

CURRENT ATMOSPHERIC TELEMETRY:
- Station: ${req.station.name}, ${req.station.city} (${req.station.region})
- Outdoor CPCB AQI: ${req.assessment.aqi} (${req.assessment.category.label})
- Prominent Pollutant: ${req.assessment.prominentPollutant.toUpperCase()} (${req.station.pollutants[req.assessment.prominentPollutant]})
- Criteria Pollutants: PM2.5: ${req.station.pollutants.pm25} µg/m³, PM10: ${req.station.pollutants.pm10} µg/m³, NO2: ${req.station.pollutants.no2} µg/m³
- Weather: ${req.station.weather.tempC}°C, Humidity: ${req.station.weather.humidityPct}%, Wind: ${req.station.weather.windKmh} km/h ${req.station.weather.windDirection}
- Thermal Inversion Risk: ${req.station.weather.inversionRisk}

HOUSEHOLD SANCTUARY STATUS:
${roomsContext}

HOUSEHOLD MEMBERS & VULNERABILITIES:
${membersContext}

${req.userQuery ? `USER QUESTION: "${req.userQuery}"` : 'Please provide a structured 4-part assessment: 1) Executive Risk Verdict & Immediate Danger Zones, 2) Vulnerable Member Protection Plan (Asthma, Elderly, Child), 3) Purifier & Window Sealing Recommendations, and 4) Outdoor Transit & School Protocol.'}

Format response concisely with clear markdown bullet points and actionable timelines. Avoid generic disclaimers.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const text = response.text;
  if (!text) {
    throw new Error('Received an empty response from Gemini.');
  }

  return text;
}
