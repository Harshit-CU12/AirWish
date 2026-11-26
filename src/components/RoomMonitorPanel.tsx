import {
  AlertCircle,
  Lock,
  LockOpen,
  RotateCcw,
  Wind,
} from 'lucide-react';
import type { PurifierMode, RoomMonitor } from '../types/sentinel';
import { getCpcbCategory } from '../utils/aqi';
import {
  calculateProtectionPercent,
  estimateMinutesToTargetPm25,
  getEffectiveCadrM3h,
  getRoomIndoorAqi,
  getSteadyStatePm25,
  PURIFIER_MODE_SPECS,
} from '../utils/filtration';
import { AqiPill } from './AqiPill';

interface RoomMonitorPanelProps {
  rooms: RoomMonitor[];
  outdoorAqi: number;
  outdoorPm25: number;
  detailed?: boolean;
  onToggleWindow: (roomId: string) => void;
  onSetPurifierMode: (roomId: string, mode: PurifierMode) => void;
  onResetFilter: (roomId: string) => void;
  onBulkAction?: (action: 'seal_all' | 'all_turbo' | 'all_auto' | 'night_sleep') => void;
}

export function RoomMonitorPanel({
  rooms,
  outdoorAqi,
  outdoorPm25,
  detailed = false,
  onToggleWindow,
  onSetPurifierMode,
  onResetFilter,
  onBulkAction,
}: RoomMonitorPanelProps) {
  const sealedCount = rooms.filter((r) => r.windowsSealed).length;
  const totalWatts = rooms.reduce(
    (sum, r) => sum + PURIFIER_MODE_SPECS[r.purifierMode].watts,
    0
  );

  return (
    <section
      aria-label="Multi-room air purifier and floor monitoring"
      className="space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-[#F8FAFC]">
            Multi-Room Air Monitors &amp; HEPA Controls
          </h2>
          <p className="mt-0.5 text-xs text-[#94A3B8] tabular-nums">
            {sealedCount} of {rooms.length} zones sealed · Active filtration draw:{' '}
            <span className="font-mono text-[#F8FAFC]">{totalWatts} W</span>
          </p>
        </div>

        {detailed && onBulkAction && (
          <div
            role="group"
            aria-label="Whole-home purifier presets"
            className="flex flex-wrap items-center gap-2"
          >
            <button
              type="button"
              onClick={() => onBulkAction('seal_all')}
              className="rounded-lg border border-[#2A364F] bg-[#1E293B] px-3 py-2 text-xs font-semibold text-[#F8FAFC] hover:border-[#06B6D4]/60 transition-colors whitespace-nowrap min-h-[38px]"
            >
              Seal All Windows
            </button>
            <button
              type="button"
              onClick={() => onBulkAction('all_auto')}
              className="rounded-lg border border-[#2A364F] bg-[#1E293B] px-3 py-2 text-xs font-semibold text-[#F8FAFC] hover:border-[#06B6D4]/60 transition-colors whitespace-nowrap min-h-[38px]"
            >
              All Auto
            </button>
            <button
              type="button"
              onClick={() => onBulkAction('night_sleep')}
              className="rounded-lg border border-[#2A364F] bg-[#1E293B] px-3 py-2 text-xs font-semibold text-[#F8FAFC] hover:border-[#06B6D4]/60 transition-colors whitespace-nowrap min-h-[38px]"
            >
              Night Sleep (24 dB)
            </button>
            <button
              type="button"
              onClick={() => onBulkAction('all_turbo')}
              className="rounded-lg bg-[#06B6D4] px-3 py-2 text-xs font-semibold text-[#090D16] hover:bg-[#38BDF8] transition-colors whitespace-nowrap min-h-[38px]"
            >
              All Turbo HEPA
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {rooms.map((room) => {
          const roomAqi = getRoomIndoorAqi(room);
          const roomCat = getCpcbCategory(roomAqi);
          const protectionPct = calculateProtectionPercent(outdoorAqi, roomAqi);
          const minutesToClean = estimateMinutesToTargetPm25(room, outdoorPm25, 25);
          const steadyPm25 = getSteadyStatePm25(room, outdoorPm25);
          const effectiveCadr = Math.round(getEffectiveCadrM3h(room));
          const modeSpec = PURIFIER_MODE_SPECS[room.purifierMode];
          const lowFilter = room.hepaFilterLifePct < 20;

          return (
            <article
              key={room.id}
              data-testid={`room-card-${room.id}`}
              className="sentinel-card rounded-2xl p-5 flex flex-col justify-between gap-5"
              style={{
                borderTopColor:
                  roomAqi <= 60 ? 'rgba(6, 182, 212, 0.55)' : roomCat.rimColor,
                borderTopWidth: '2px',
              }}
            >
              {/* Room Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-[#94A3B8]">
                    {room.floor} · {room.areaSqM} m² · Occupants:{' '}
                    {room.assignedOccupants.join(', ')}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-semibold text-[#F8FAFC] truncate">
                    {room.name}
                  </h3>
                </div>
                <AqiPill aqi={roomAqi} size="sm" />
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-3 gap-3 border-y border-[#1A2438] py-3.5 tabular-nums">
                <div>
                  <div className="text-[11px] font-medium text-[#94A3B8]">
                    Indoor PM2.5
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span
                      data-testid={`room-pm25-${room.id}`}
                      className="font-display text-2xl font-bold text-[#F8FAFC]"
                    >
                      {room.indoorPm25}
                    </span>
                    <span className="font-mono text-[11px] text-[#64748B]">µg/m³</span>
                  </div>
                  <div className="text-[11px] text-[#4EDEA3]">
                    -{protectionPct}% vs outside
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-medium text-[#94A3B8]">
                    Purification Target
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#F8FAFC]">
                    {minutesToClean === 0
                      ? 'Clean (<25)'
                      : minutesToClean !== null
                        ? `~${minutesToClean} min`
                        : 'Rising'}
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    Est. eq. {steadyPm25} µg/m³
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-medium text-[#94A3B8]">
                    Micro-Climate
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#F8FAFC]">
                    {room.co2Ppm} <span className="text-xs font-normal text-[#94A3B8]">ppm</span>
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    {room.tempC}°C · {room.humidityPct}% RH
                  </div>
                </div>
              </div>

              {/* Interactive Controls */}
              <div className="space-y-3.5">
                {/* Window Seal Toggle */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                    {room.windowsSealed ? (
                      <Lock className="h-3.5 w-3.5 text-[#06B6D4]" aria-hidden="true" />
                    ) : (
                      <LockOpen className="h-3.5 w-3.5 text-[#F97316]" aria-hidden="true" />
                    )}
                    <span>
                      Windows{' '}
                      <strong
                        className={
                          room.windowsSealed ? 'text-[#F8FAFC]' : 'text-[#FDBA74]'
                        }
                      >
                        {room.windowsSealed ? 'Sealed' : 'Open (Smog Infiltration)'}
                      </strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={room.windowsSealed}
                    aria-label={`Toggle window seal for ${room.name}`}
                    onClick={() => onToggleWindow(room.id)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4] ${
                      room.windowsSealed
                        ? 'border-[#06B6D4] bg-[#06B6D4]'
                        : 'border-[#2A364F] bg-[#1E293B]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-[#FFFFFF] transition-transform ${
                        room.windowsSealed ? 'translate-x-5.5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Purifier Speed Segmented Control */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] tabular-nums">
                    <Wind className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
                    <span>
                      HEPA ({effectiveCadr} m³/h · {modeSpec.noiseDb} dB)
                    </span>
                  </div>

                  <div
                    role="group"
                    aria-label={`Set HEPA speed in ${room.name}`}
                    className="grid grid-cols-4 gap-1 rounded-lg bg-[#0E1524] p-1 border border-[#2A364F]"
                  >
                    {(['off', 'sleep', 'auto', 'turbo'] as PurifierMode[]).map(
                      (mode) => {
                        const isActive = room.purifierMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => onSetPurifierMode(room.id, mode)}
                            aria-pressed={isActive}
                            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap min-h-[32px] ${
                              isActive
                                ? 'bg-[#06B6D4] text-[#090D16]'
                                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                            }`}
                          >
                            {PURIFIER_MODE_SPECS[mode].label}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* HEPA Filter Health Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-[#94A3B8]">
                      {lowFilter && (
                        <AlertCircle
                          className="h-3.5 w-3.5 text-[#FDBA74] shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span>
                        HEPA H13 Filter Life
                        {lowFilter ? ' — Replace Soon' : ''}
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-semibold tabular-nums ${
                          lowFilter ? 'text-[#FDBA74]' : 'text-[#F8FAFC]'
                        }`}
                      >
                        {room.hepaFilterLifePct}%
                      </span>
                      {lowFilter && (
                        <button
                          type="button"
                          onClick={() => onResetFilter(room.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#38BDF8] hover:text-[#4CD7F6] transition-colors whitespace-nowrap"
                          aria-label={`Mark HEPA filter replaced in ${room.name}`}
                        >
                          <RotateCcw className="h-3 w-3" aria-hidden="true" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#0E1524]">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${room.hepaFilterLifePct}%`,
                        backgroundColor: lowFilter ? '#F97316' : '#06B6D4',
                      }}
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
