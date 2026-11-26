import type { ChecklistItem, FamilyMember, MonitoringStation, RoomMonitor } from '../types/sentinel';
import type { AqiAssessment } from './aqi';
import { evaluateMemberGuidance } from './aqi';
import { calculateProtectionPercent, getRoomIndoorAqi } from './filtration';

export function buildExposureReportCsvString(
  station: MonitoringStation,
  assessment: AqiAssessment,
  rooms: RoomMonitor[],
  members: FamilyMember[],
  checklist: ChecklistItem[]
): string {
  const timestamp = new Date().toISOString();

  const lines: string[] = [];

  // Header Metadata
  lines.push('AIRWISH — HOUSEHOLD RESPIRATORY & SMOG EXPOSURE CLINICAL REPORT');
  lines.push(`Generated At,${timestamp}`);
  lines.push(`Station,${station.name} (${station.stationCode})`);
  lines.push(`City / Region,"${station.city}, ${station.region}"`);
  lines.push(`Outdoor CPCB AQI,${assessment.aqi}`);
  lines.push(`Category,${assessment.category.label} (${assessment.category.rangeLabel})`);
  lines.push(`Prominent Pollutant,${assessment.prominentPollutant.toUpperCase()}`);
  lines.push(`Outdoor PM2.5,${station.pollutants.pm25} µg/m³`);
  lines.push(`Outdoor PM10,${station.pollutants.pm10} µg/m³`);
  lines.push(`Thermal Inversion Risk,${station.weather.inversionRisk}`);
  lines.push(`Weather,"${station.weather.tempC}°C, Humidity: ${station.weather.humidityPct}%, Wind: ${station.weather.windKmh} km/h ${station.weather.windDirection}"`);
  lines.push('');

  // Section 1: Monitored Indoor Zones
  lines.push('--- MONITORED HOUSEHOLD AIR ZONES ---');
  lines.push('Room Name,Floor,Area (sqm),Indoor PM2.5 (ug/m3),Indoor AQI,Cleaner vs Outdoor (%),Window Status,HEPA Mode,Filter Health (%)');
  rooms.forEach((r) => {
    const indoorAqi = getRoomIndoorAqi(r);
    const protectionPct = calculateProtectionPercent(assessment.aqi, indoorAqi);
    lines.push(
      `"${r.name}","${r.floor}",${r.areaSqM},${r.indoorPm25},${indoorAqi},${protectionPct}%,${r.windowsSealed ? 'Sealed' : 'OPEN'},${r.purifierMode.toUpperCase()},${r.hepaFilterLifePct}%`
    );
  });
  lines.push('');

  // Section 2: Family Vulnerability Triage
  lines.push('--- HOUSEHOLD MEMBERS & CLINICAL EXPOSURE TRIAGE ---');
  lines.push('Name,Age,Condition,Assigned Zone,Risk Tier,Max Safe Outdoor (min),Prescribed Mask,Clinical Action Directive');
  members.forEach((m) => {
    const room = rooms.find((r) => r.id === m.primaryRoomId) ?? rooms[0];
    const indoorAqi = room ? getRoomIndoorAqi(room) : 40;
    const g = evaluateMemberGuidance(m, assessment.aqi, indoorAqi);
    lines.push(
      `"${m.name}",${m.age},"${m.vulnerability}","${room ? room.name : 'Unknown'}",${g.severityLabel},${g.maxOutdoorMinutes},"${g.maskGrade}","${g.headline.replace(/"/g, '""')} — ${g.actionTip.replace(/"/g, '""')}"`
    );
  });
  lines.push('');

  // Section 3: Safeguards Checklist
  lines.push('--- HOUSEHOLD SAFEGUARDS VERIFICATION ---');
  lines.push('Category,Safeguard Label,Status,Detail');
  checklist.forEach((c) => {
    lines.push(
      `"${c.category}","${c.label}",${c.completed ? 'VERIFIED' : 'PENDING'},"${c.detail.replace(/"/g, '""')}"`
    );
  });

  return lines.join('\n');
}

export function exportExposureReportCsv(
  station: MonitoringStation,
  assessment: AqiAssessment,
  rooms: RoomMonitor[],
  members: FamilyMember[],
  checklist: ChecklistItem[]
): void {
  const csvContent = buildExposureReportCsvString(station, assessment, rooms, members, checklist);
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const dateFormatted = new Date().toISOString().slice(0, 10);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `AirWish_Exposure_Report_${dateFormatted}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
