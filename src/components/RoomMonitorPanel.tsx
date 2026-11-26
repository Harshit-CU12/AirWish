import { useState } from 'react';
import {
  AlertCircle,
  Lock,
  LockOpen,
  Plus,
  RotateCcw,
  Trash2,
  Wind,
  X,
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
  onAddRoom?: (room: Omit<RoomMonitor, 'id'>) => void;
  onRemoveRoom?: (roomId: string) => void;
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
  onAddRoom,
  onRemoveRoom,
}: RoomMonitorPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [floor, setFloor] = useState('Main Level');
  const [areaSqM, setAreaSqM] = useState('22');
  const [cadr, setCadr] = useState('420');
  const [formError, setFormError] = useState<string | null>(null);

  function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = roomName.trim();
    const area = Number(areaSqM);
    const cadrNum = Number(cadr);

    if (!trimmed) {
      setFormError('Please enter a room or zone name.');
      return;
    }
    if (Number.isNaN(area) || area < 6 || area > 200) {
      setFormError('Please enter a valid room area between 6 and 200 m².');
      return;
    }
    if (Number.isNaN(cadrNum) || cadrNum < 50 || cadrNum > 1500) {
      setFormError('Please enter a valid CADR rating between 50 and 1500 m³/h.');
      return;
    }

    if (onAddRoom) {
      onAddRoom({
        name: trimmed,
        floor,
        areaSqM: Math.round(area),
        ceilingHeightM: 2.9,
        maxCadrM3h: Math.round(cadrNum),
        indoorPm25: 35,
        co2Ppm: 600,
        tempC: 22,
        humidityPct: 50,
        purifierMode: 'auto',
        windowsSealed: true,
        hepaFilterLifePct: 100,
        assignedOccupants: [],
      });
    }

    setRoomName('');
    setShowAddForm(false);
    setFormError(null);
  }
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
            {onAddRoom && (
              <button
                type="button"
                onClick={() => setShowAddForm((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#06B6D4]/60 bg-[#06B6D4]/15 px-3 py-2 text-xs font-semibold text-[#38BDF8] hover:bg-[#06B6D4]/25 transition-colors whitespace-nowrap min-h-[38px]"
              >
                {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                <span>{showAddForm ? 'Cancel' : 'Add Zone'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {showAddForm && onAddRoom && (
        <form
          onSubmit={handleCreateRoom}
          className="rounded-xl border border-[#2A364F] bg-[#0E1524] p-4.5 space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#F8FAFC]">Add New Monitored Air Zone</span>
            <span className="text-xs text-[#94A3B8]">Configures volume, ACH &amp; filtration model</span>
          </div>

          {formError && (
            <div className="rounded-lg border border-[#EF4444]/40 bg-[#7F1D1D]/30 px-3 py-2 text-xs text-[#FECACA]">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="zone-name" className="block text-xs font-medium text-[#94A3B8] mb-1">
                Room Name
              </label>
              <input
                id="zone-name"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g., Home Office / Attic Nursery"
                className="sentinel-input w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="zone-floor" className="block text-xs font-medium text-[#94A3B8] mb-1">
                Floor Level
              </label>
              <select
                id="zone-floor"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="sentinel-input w-full rounded-lg px-3 py-2 text-sm"
              >
                <option value="Main Level" className="bg-[#0E1524]">Main Level</option>
                <option value="Upper Level" className="bg-[#0E1524]">Upper Level</option>
                <option value="Basement" className="bg-[#0E1524]">Basement</option>
                <option value="Attic / Loft" className="bg-[#0E1524]">Attic / Loft</option>
              </select>
            </div>

            <div>
              <label htmlFor="zone-area" className="block text-xs font-medium text-[#94A3B8] mb-1">
                Area (m²) &amp; CADR (m³/h)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="zone-area"
                  type="number"
                  min={6}
                  max={200}
                  value={areaSqM}
                  onChange={(e) => setAreaSqM(e.target.value)}
                  placeholder="Area m²"
                  title="Room floor area in square meters"
                  aria-label="Floor area in square meters"
                  className="sentinel-input w-1/2 rounded-lg px-2.5 py-2 text-sm"
                />
                <input
                  id="zone-cadr"
                  type="number"
                  min={50}
                  max={1500}
                  value={cadr}
                  onChange={(e) => setCadr(e.target.value)}
                  placeholder="CADR"
                  title="Purifier CADR in m³/h"
                  aria-label="Purifier clean air delivery rate in m³/h"
                  className="sentinel-input w-1/2 rounded-lg px-2.5 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setFormError(null);
              }}
              className="rounded-lg border border-[#2A364F] bg-[#1E293B] px-3 py-1.5 text-xs font-semibold text-[#F8FAFC]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#06B6D4] px-4 py-1.5 text-xs font-semibold text-[#090D16] hover:bg-[#38BDF8]"
            >
              Save Zone
            </button>
          </div>
        </form>
      )}

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
                <div className="flex items-center gap-2">
                  <AqiPill aqi={roomAqi} size="sm" />
                  {onRemoveRoom && room.id.startsWith('room-custom-') && (
                    <button
                      type="button"
                      onClick={() => onRemoveRoom(room.id)}
                      title={`Remove custom zone ${room.name}`}
                      aria-label={`Remove custom zone ${room.name}`}
                      className="rounded-md p-1 text-[#64748B] hover:bg-[#1E293B] hover:text-[#FCA5A5] transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
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
                        room.windowsSealed ? 'translate-x-6' : 'translate-x-1'
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
