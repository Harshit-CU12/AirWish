import {
  ArrowRight,
  Lock,
  LockOpen,
  ShieldCheck,
  Wind,
} from 'lucide-react';
import type { MonitoringStation, PurifierMode, RoomMonitor } from '../types/sentinel';
import type { AqiAssessment } from '../utils/aqi';
import { getCpcbCategory, POLLUTANT_META } from '../utils/aqi';
import {
  calculateProtectionPercent,
  estimateMinutesToTargetPm25,
  getRoomIndoorAqi,
  PURIFIER_MODE_SPECS,
} from '../utils/filtration';
import { AqiPill } from './AqiPill';
import { SENTINEL_VISUALS } from './ProtectionVisualGuide';
import { SentinelImage } from './SentinelImage';

interface HeroTelemetryProps {
  station: MonitoringStation;
  assessment: AqiAssessment;
  rooms: RoomMonitor[];
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  onToggleRoomWindow: (roomId: string) => void;
  onSetRoomPurifierMode: (roomId: string, mode: PurifierMode) => void;
  onOpenRoomsView: () => void;
}

function CpcbArcGauge({ aqi, colorHex }: { aqi: number; colorHex: string }) {
  const clamped = Math.max(0, Math.min(500, aqi));
  const ratio = clamped / 500;
  // Semicircle radius 72, center (90, 88)
  const radius = 70;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);

  // Needle endpoint
  const angleRad = Math.PI - ratio * Math.PI;
  const nx = 90 + radius * Math.cos(angleRad);
  const ny = 88 - radius * Math.sin(angleRad);

  return (
    <svg
      viewBox="0 0 180 104"
      className="w-40 sm:w-44 h-auto shrink-0"
      role="img"
      aria-label={`CPCB AQI gauge at ${aqi} out of 500`}
    >
      <defs>
        <linearGradient id="cpcbArcTrack" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="20%" stopColor="#84CC16" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="60%" stopColor="#F97316" />
          <stop offset="80%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
      </defs>
      {/* Background muted track */}
      <path
        d="M 20 88 A 70 70 0 0 1 160 88"
        fill="none"
        stroke="#1E293B"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* Subtle full spectrum guide */}
      <path
        d="M 20 88 A 70 70 0 0 1 160 88"
        fill="none"
        stroke="url(#cpcbArcTrack)"
        strokeWidth="12"
        strokeLinecap="round"
        opacity="0.22"
      />
      {/* Active progress arc */}
      <path
        d="M 20 88 A 70 70 0 0 1 160 88"
        fill="none"
        stroke={colorHex}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.16, 1, 0.3, 1), stroke 300ms ease' }}
      />
      {/* Marker node */}
      <circle
        cx={nx}
        cy={ny}
        r="6"
        fill="#F8FAFC"
        stroke={colorHex}
        strokeWidth="3"
      />
      <text
        x="20"
        y="102"
        fill="#64748B"
        fontSize="10"
        fontFamily="Inter, sans-serif"
      >
        0
      </text>
      <text
        x="90"
        y="102"
        textAnchor="middle"
        fill="#64748B"
        fontSize="10"
        fontFamily="Inter, sans-serif"
      >
        CPCB Scale
      </text>
      <text
        x="160"
        y="102"
        textAnchor="end"
        fill="#64748B"
        fontSize="10"
        fontFamily="Inter, sans-serif"
      >
        500+
      </text>
    </svg>
  );
}

export function HeroTelemetry({
  station,
  assessment,
  rooms,
  selectedRoomId,
  onSelectRoom,
  onToggleRoomWindow,
  onSetRoomPurifierMode,
  onOpenRoomsView,
}: HeroTelemetryProps) {
  const { category } = assessment;
  const prominentMeta = POLLUTANT_META[assessment.prominentPollutant];

  const activeRoom = rooms.find((r) => r.id === selectedRoomId) ?? rooms[0];
  const indoorAqi = getRoomIndoorAqi(activeRoom);
  const indoorCategory = getCpcbCategory(indoorAqi);
  const protectionPct = calculateProtectionPercent(assessment.aqi, indoorAqi);
  const minutesToClean = estimateMinutesToTargetPm25(
    activeRoom,
    station.pollutants.pm25,
    25
  );

  const isSanctuarySafe = indoorAqi <= 60;

  return (
    <section
      aria-label="Primary outdoor and indoor air quality telemetry"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
    >
      {/* Left 7 columns: Dynamic Outdoor AQI Hero Card */}
      <div
        className="sentinel-card relative overflow-hidden rounded-2xl p-6 sm:p-7 lg:col-span-7 flex flex-col justify-between"
        style={{
          borderTopColor: category.rimColor,
          borderTopWidth: '2px',
          boxShadow: category.glowShadow,
        }}
      >
        {/* Dynamic Urban Skyline Photographic Backdrop (switches between Smog Haze & Clear Twilight by live AQI) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <SentinelImage
            src={
              assessment.aqi > 200
                ? SENTINEL_VISUALS.smogSkyline
                : SENTINEL_VISUALS.clearSkyline
            }
            alt=""
            className="h-full w-full object-cover opacity-28 transition-opacity duration-500"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(9, 13, 22, 0.72) 0%, rgba(19, 27, 46, 0.92) 60%, rgba(13, 20, 36, 0.97) 100%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: category.washGradient }}
          />
        </div>

        <div className="relative space-y-6">
          {/* Header Metadata Row */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#94A3B8]">
                {station.region} · Updated {station.updatedMinutesAgo} min ago
              </p>
              <h1 className="mt-1 font-display text-2xl sm:text-[28px] font-bold tracking-tight text-[#F8FAFC] [text-wrap:balance]">
                {station.name}, {station.city}
              </h1>
            </div>
            <AqiPill aqi={assessment.aqi} />
          </div>

          {/* Primary Numeric Readout + Semicircle Gauge */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="text-xs font-semibold text-[#94A3B8]">
                Outdoor National AQI (CPCB)
              </div>
              <div className="mt-1 flex items-baseline gap-3">
                <span
                  data-testid="outdoor-aqi-value"
                  className="font-display text-5xl sm:text-[56px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-[#F8FAFC]"
                >
                  {assessment.aqi}
                </span>
                <span
                  className="text-base font-semibold"
                  style={{ color: category.textHex }}
                >
                  {category.label} ({category.rangeLabel})
                </span>
              </div>
              <p className="mt-2.5 text-sm text-[#94A3B8]">
                Prominent pollutant:{' '}
                <span className="font-semibold text-[#F8FAFC]">
                  {prominentMeta.formula}
                </span>{' '}
                at{' '}
                <span className="font-mono text-[#F8FAFC] tabular-nums">
                  {station.pollutants[assessment.prominentPollutant]} {prominentMeta.unit}
                </span>{' '}
                <span className="text-[#64748B]">
                  (CPCB 24h safe limit: {prominentMeta.safeLimit} {prominentMeta.unit})
                </span>
              </p>
            </div>

            <CpcbArcGauge aqi={assessment.aqi} colorHex={category.rimColor} />
          </div>

          {/* Health & Protective Directives */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#2A364F]/80 pt-5">
            <div>
              <div className="text-xs font-semibold text-[#94A3B8]">
                Respirator &amp; Exposure Guidance
              </div>
              <p className="mt-1 text-sm font-medium text-[#F8FAFC]">
                {category.maskGuidance}
              </p>
              <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">
                {category.healthImpact}
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#94A3B8]">
                Ventilation Directive
              </div>
              <p className="mt-1 text-sm font-medium text-[#F8FAFC]">
                {category.ventilationGuidance}
              </p>
              <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">
                Thermal inversion risk is{' '}
                <span className="font-semibold text-[#F8FAFC]">
                  {station.weather.inversionRisk}
                </span>
                ; surface wind dispersion at{' '}
                <span className="font-mono tabular-nums text-[#F8FAFC]">
                  {station.weather.windKmh} km/h {station.weather.windDirection}
                </span>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Clean Unboxed Atmospheric Strip */}
        <div className="relative mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#1A2438] pt-4 text-xs text-[#94A3B8] tabular-nums">
          {station.weather.isLive && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/35 px-2.5 py-0.5 text-[11px] font-semibold text-[#6EE7B7]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" aria-hidden="true" />
              <span>Live Open-Meteo ({station.weather.lastFetchedAt})</span>
            </span>
          )}
          <span>
            Temp <strong className="text-[#F8FAFC]">{station.weather.tempC}°C</strong>
          </span>
          <span aria-hidden="true" className="text-[#2A364F]">·</span>
          <span>
            Humidity <strong className="text-[#F8FAFC]">{station.weather.humidityPct}%</strong>
          </span>
          <span aria-hidden="true" className="text-[#2A364F]">·</span>
          <span>
            Wind{' '}
            <strong className="text-[#F8FAFC]">
              {station.weather.windKmh} km/h {station.weather.windDirection}
            </strong>
          </span>
          <span aria-hidden="true" className="text-[#2A364F]">·</span>
          <span>
            Visibility <strong className="text-[#F8FAFC]">{station.weather.visibilityKm} km</strong>
          </span>
        </div>
      </div>

      {/* Right 5 columns: Indoor Sanctuary Card */}
      <div
        className="sentinel-card relative overflow-hidden rounded-2xl lg:col-span-5 flex flex-col justify-between"
        style={{
          borderTopColor: isSanctuarySafe ? '#06B6D4' : indoorCategory.rimColor,
          borderTopWidth: '2px',
          boxShadow: isSanctuarySafe
            ? '0 0 32px -8px rgba(6, 182, 212, 0.25)'
            : indoorCategory.glowShadow,
        }}
      >
        {/* Indoor Sanctuary Architectural Header Visual */}
        <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-[#070C16]">
          <SentinelImage
            src={SENTINEL_VISUALS.sanctuaryInterior}
            alt="Sealed modern living room sanctuary with glowing cyan cylindrical HEPA air purifier overlooking city dusk"
            fallbackTitle="Indoor Air Sanctuary"
            className="h-full w-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#131B2E] via-[#131B2E]/55 to-[#090D16]/45"
          />
          <div className="absolute inset-x-5 bottom-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#CBD5E1]">
                Indoor Air Sanctuary · {activeRoom.floor}
              </p>
              <h2 className="mt-0.5 font-display text-xl font-bold text-[#F8FAFC]">
                {activeRoom.name}
              </h2>
            </div>
            <AqiPill aqi={indoorAqi} prefix="Indoor" size="sm" />
          </div>
        </div>

        <div className="relative flex flex-1 flex-col justify-between p-5 sm:p-6 pt-4 space-y-5">
          <div className="space-y-5">

          {/* Room Switcher Segmented Bar */}
          <div
            role="tablist"
            aria-label="Select monitored room"
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-1.5"
          >
            {rooms.map((room) => {
              const isSelected = room.id === activeRoom.id;
              const rAqi = getRoomIndoorAqi(room);
              return (
                <button
                  key={room.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => onSelectRoom(room.id)}
                  className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4] ${
                    isSelected
                      ? 'bg-[#06B6D4]/15 text-[#F8FAFC] border border-[#06B6D4]/60'
                      : 'bg-[#0E1524]/70 text-[#94A3B8] border border-[#2A364F] hover:text-[#F8FAFC]'
                  }`}
                >
                  <span className="truncate">{room.name}</span>
                  <span className="font-mono font-semibold tabular-nums text-[#F8FAFC]">
                    {rAqi}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Indoor Numeric Readout + Protection Delta */}
          <div className="flex items-end justify-between gap-4 pt-1">
            <div>
              <div className="text-xs font-medium text-[#94A3B8]">
                Indoor PM2.5 Concentration
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  data-testid="indoor-pm25-value"
                  className="font-display text-4xl sm:text-[48px] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-[#F8FAFC]"
                >
                  {activeRoom.indoorPm25}
                </span>
                <span className="font-mono text-xs text-[#94A3B8]">µg/m³</span>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#4EDEA3] tabular-nums">
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{protectionPct}% cleaner</span>
              </div>
              <div className="mt-1 text-xs text-[#94A3B8] tabular-nums">
                {minutesToClean === 0
                  ? 'Target <25 µg/m³ achieved'
                  : minutesToClean !== null
                    ? `~${minutesToClean}m to clean air`
                    : 'Seal window / boost HEPA'}
              </div>
            </div>
          </div>

          {/* Direct Room Controls (Window Seal + Purifier Speed) */}
          <div className="space-y-3 border-t border-[#2A364F]/80 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                {activeRoom.windowsSealed ? (
                  <Lock className="h-3.5 w-3.5 text-[#06B6D4]" aria-hidden="true" />
                ) : (
                  <LockOpen className="h-3.5 w-3.5 text-[#F97316]" aria-hidden="true" />
                )}
                <span>
                  Window Perimeter:{' '}
                  <strong className="text-[#F8FAFC]">
                    {activeRoom.windowsSealed ? 'Sealed' : 'Unsealed'}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={activeRoom.windowsSealed}
                aria-label={`Seal windows in ${activeRoom.name}`}
                onClick={() => onToggleRoomWindow(activeRoom.id)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4] ${
                  activeRoom.windowsSealed
                    ? 'border-[#06B6D4] bg-[#06B6D4]'
                    : 'border-[#2A364F] bg-[#1E293B]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-[#FFFFFF] transition-transform ${
                    activeRoom.windowsSealed ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                <Wind className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
                <span>HEPA Mode</span>
              </span>
              <div
                role="group"
                aria-label={`Purifier mode for ${activeRoom.name}`}
                className="flex items-center gap-1 rounded-lg bg-[#0E1524] p-1 border border-[#2A364F]"
              >
                {(['off', 'sleep', 'auto', 'turbo'] as PurifierMode[]).map((mode) => {
                  const active = activeRoom.purifierMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onSetRoomPurifierMode(activeRoom.id, mode)}
                      aria-pressed={active}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-[#06B6D4] text-[#090D16]'
                          : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                      }`}
                    >
                      {PURIFIER_MODE_SPECS[mode].label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer link to full Rooms view */}
        <div className="relative flex items-center justify-between border-t border-[#1A2438] pt-4 text-xs text-[#94A3B8]">
          <span className="tabular-nums">
            CO₂ <strong className="text-[#F8FAFC]">{activeRoom.co2Ppm} ppm</strong> · HEPA{' '}
            <strong
              className={
                activeRoom.hepaFilterLifePct < 20 ? 'text-[#FDBA74]' : 'text-[#F8FAFC]'
              }
            >
              {activeRoom.hepaFilterLifePct}%
            </strong>
          </span>
          <button
            type="button"
            onClick={onOpenRoomsView}
            className="inline-flex items-center gap-1 font-semibold text-[#38BDF8] hover:text-[#4CD7F6] transition-colors whitespace-nowrap"
          >
            <span>All {rooms.length} Rooms</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        </div>
      </div>
    </section>
  );
}
