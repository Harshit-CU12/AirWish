import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  FastForward,
  MapPin,
  Pause,
  Play,
  Search,
  ShieldAlert,
} from 'lucide-react';
import type { MonitoringStation } from '../types/sentinel';
import { evaluateStationAqi } from '../utils/aqi';

interface StationToolbarProps {
  stations: MonitoringStation[];
  selectedStation: MonitoringStation;
  onSelectStation: (stationId: string) => void;
  outdoorAqi: number;
  unsealedRoomCount: number;
  safeModeActive: boolean;
  onActivateSafeMode: () => void;
  simulationRunning: boolean;
  onToggleSimulation: () => void;
  onStepSimulation: () => void;
}

export function StationToolbar({
  stations,
  selectedStation,
  onSelectStation,
  outdoorAqi,
  unsealedRoomCount,
  safeModeActive,
  onActivateSafeMode,
  simulationRunning,
  onToggleSimulation,
  onStepSimulation,
}: StationToolbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const filteredStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.region.toLowerCase().includes(q) ||
        s.stationCode.toLowerCase().includes(q)
    );
  }, [stations, searchQuery]);

  const showEmergencyBanner = outdoorAqi >= 301 && !safeModeActive;

  return (
    <div className="space-y-4">
      {/* Workspace Station & Filtration Simulation Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1 min-w-0">
          {/* Station Search / Selector */}
          <div className="relative w-full sm:w-80">
            <label htmlFor="station-search" className="sr-only">
              Search monitoring station
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
              aria-hidden="true"
            />
            <input
              id="station-search"
              type="text"
              value={searchQuery}
              onFocus={() => setDropdownOpen(true)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 180)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredStations.length > 0) {
                  e.preventDefault();
                  onSelectStation(filteredStations[0].id);
                  setSearchQuery('');
                  setDropdownOpen(false);
                } else if (e.key === 'Escape') {
                  setDropdownOpen(false);
                }
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDropdownOpen(true);
              }}
              placeholder={`${selectedStation.name}, ${selectedStation.city} (${selectedStation.stationCode})`}
              className="sentinel-input w-full rounded-lg py-2.5 pl-9 pr-3 text-sm"
            />

            {dropdownOpen && (
              <div
                role="listbox"
                aria-label="Monitoring stations"
                className="sentinel-elevated absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-xl p-1.5 max-h-72 overflow-y-auto"
              >
                {filteredStations.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-[#94A3B8]">
                    No CPCB station matches &ldquo;{searchQuery}&rdquo;.
                  </p>
                ) : (
                  filteredStations.map((station) => {
                    const assessment = evaluateStationAqi(station.pollutants);
                    const isSelected = station.id === selectedStation.id;
                    return (
                      <button
                        key={station.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onSelectStation(station.id);
                          setSearchQuery('');
                          setDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          isSelected
                            ? 'bg-[#06B6D4]/15 text-[#F8FAFC]'
                            : 'text-[#94A3B8] hover:bg-[#0E1524] hover:text-[#F8FAFC]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-[#F8FAFC] truncate">
                            {station.name}, {station.city}
                          </div>
                          <div className="text-xs text-[#64748B] truncate">
                            {station.stationCode} · Updated {station.updatedMinutesAgo}m ago
                          </div>
                        </div>
                        <span
                          className="font-display text-sm font-bold tabular-nums shrink-0"
                          style={{ color: assessment.category.textHex }}
                        >
                          {assessment.aqi}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Quick City Station Switcher */}
          <div
            role="group"
            aria-label="Quick city station presets"
            className="flex flex-wrap items-center gap-1.5"
          >
            {stations.map((station) => {
              const isSelected = station.id === selectedStation.id;
              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => onSelectStation(station.id)}
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4] ${
                    isSelected
                      ? 'bg-[#1E293B] text-[#F8FAFC] border border-[#06B6D4]/60'
                      : 'bg-[#131B2E]/70 text-[#94A3B8] border border-[#2A364F] hover:text-[#F8FAFC] hover:border-[#38BDF8]/40'
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#06B6D4]" aria-hidden="true" />
                  <span>{station.city}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Indoor Filtration Physics Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleSimulation}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A364F] bg-[#1E293B] px-3 py-2 text-xs font-medium text-[#F8FAFC] hover:border-[#38BDF8]/50 transition-colors whitespace-nowrap shrink-0 min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4]"
          >
            {simulationRunning ? (
              <Pause className="h-3.5 w-3.5 text-[#06B6D4]" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5 text-[#06B6D4]" aria-hidden="true" />
            )}
            <span>{simulationRunning ? 'Pause Live Decay' : 'Resume Live Decay'}</span>
          </button>

          <button
            type="button"
            onClick={onStepSimulation}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A364F] bg-[#1E293B] px-3 py-2 text-xs font-medium text-[#F8FAFC] hover:border-[#38BDF8]/50 transition-colors whitespace-nowrap shrink-0 min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4]"
          >
            <FastForward className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
            <span>Simulate +15m</span>
          </button>
        </div>
      </div>

      {/* Emergency Alert Banner for Very Poor / Severe AQI */}
      {showEmergencyBanner && (
        <div
          role="alert"
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#EF4444]/40 bg-[#7F1D1D]/35 px-4 py-3.5 sm:px-5"
          style={{ boxShadow: '0 0 36px -12px rgba(153, 27, 27, 0.45)' }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-[#FCA5A5]"
              aria-hidden="true"
            />
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-[#F8FAFC]">
                {outdoorAqi >= 401
                  ? 'Severe Smog Advisory — Immediate Indoor Lockdown Recommended'
                  : 'Very Poor Air Quality — Seal Perimeter & Engage HEPA Filtration'}
              </p>
              <p className="text-xs text-[#FECACA]/90">
                Outdoor AQI is <span className="font-semibold tabular-nums">{outdoorAqi}</span> at{' '}
                {selectedStation.name}.{' '}
                {unsealedRoomCount > 0
                  ? `${unsealedRoomCount} room${unsealedRoomCount > 1 ? 's currently have' : ' currently has'} unsealed windows allowing PM2.5 infiltration.`
                  : 'Engage Turbo HEPA across all rooms to accelerate indoor particulate clearance.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onActivateSafeMode}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#991B1B] px-4 py-2.5 text-xs font-semibold text-[#F8FAFC] hover:bg-[#B91C1C] transition-colors whitespace-nowrap shrink-0 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCA5A5]"
          >
            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Seal All &amp; Turbo Purify</span>
          </button>
        </div>
      )}
    </div>
  );
}
