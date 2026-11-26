import { useCallback, useEffect, useMemo, useState } from 'react';
import { FamilyCarePanel } from './components/FamilyCarePanel';
import { ForecastChart } from './components/ForecastChart';
import { HeroTelemetry } from './components/HeroTelemetry';
import { PollutantGrid } from './components/PollutantGrid';
import { ProtectionVisualGuide } from './components/ProtectionVisualGuide';
import { RoomMonitorPanel } from './components/RoomMonitorPanel';
import { Sanctuary3DVisualizer } from './components/Sanctuary3DVisualizer';
import { StationToolbar } from './components/StationToolbar';
import { TopBar } from './components/TopBar';
import {
  DEFAULT_CHECKLIST,
  DEFAULT_FAMILY_MEMBERS,
  DEFAULT_ROOMS,
  MONITORING_STATIONS,
} from './data/stations';
import type {
  ChecklistItem,
  FamilyMember,
  PurifierMode,
  RoomMonitor,
  ViewTab,
} from './types/sentinel';
import { evaluateMemberGuidance, evaluateStationAqi } from './utils/aqi';
import { getRoomIndoorAqi, stepRoomPm25 } from './utils/filtration';

const STORAGE_KEYS = {
  stationId: 'sentinel_v1_station_id',
  rooms: 'sentinel_v1_rooms',
  members: 'sentinel_v1_members',
  checklist: 'sentinel_v1_checklist',
};

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [selectedStationId, setSelectedStationId] = useState<string>(() =>
    loadStored<string>(STORAGE_KEYS.stationId, MONITORING_STATIONS[0].id)
  );
  const [rooms, setRooms] = useState<RoomMonitor[]>(() =>
    loadStored<RoomMonitor[]>(STORAGE_KEYS.rooms, DEFAULT_ROOMS)
  );
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    () => DEFAULT_ROOMS[0].id
  );
  const [members, setMembers] = useState<FamilyMember[]>(() =>
    loadStored<FamilyMember[]>(STORAGE_KEYS.members, DEFAULT_FAMILY_MEMBERS)
  );
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() =>
    loadStored<ChecklistItem[]>(STORAGE_KEYS.checklist, DEFAULT_CHECKLIST)
  );
  const [simulationRunning, setSimulationRunning] = useState(true);

  const selectedStation = useMemo(
    () =>
      MONITORING_STATIONS.find((s) => s.id === selectedStationId) ??
      MONITORING_STATIONS[0],
    [selectedStationId]
  );

  const outdoorAssessment = useMemo(
    () => evaluateStationAqi(selectedStation.pollutants),
    [selectedStation]
  );

  const unsealedRoomCount = useMemo(
    () => rooms.filter((r) => !r.windowsSealed).length,
    [rooms]
  );

  const safeModeActive = useMemo(
    () =>
      rooms.length > 0 &&
      rooms.every((r) => r.windowsSealed && r.purifierMode === 'turbo'),
    [rooms]
  );

  const sensitiveAlertCount = useMemo(() => {
    return members.filter((member) => {
      const room = rooms.find((r) => r.id === member.primaryRoomId) ?? rooms[0];
      const indoorAqi = room ? getRoomIndoorAqi(room) : 40;
      return evaluateMemberGuidance(member, outdoorAssessment.aqi, indoorAqi)
        .isSensitiveGroupAlert;
    }).length;
  }, [members, rooms, outdoorAssessment.aqi]);

  // Persist user changes to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.stationId,
        JSON.stringify(selectedStationId)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [selectedStationId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.rooms, JSON.stringify(rooms));
    } catch {
      // Ignore storage quota errors
    }
  }, [rooms]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.members, JSON.stringify(members));
    } catch {
      // Ignore storage quota errors
    }
  }, [members]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.checklist,
        JSON.stringify(checklist)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [checklist]);

  // Real-time indoor air filtration physics tick
  const advanceFiltration = useCallback(
    (minutes: number) => {
      const outdoorPm25 = selectedStation.pollutants.pm25;
      setRooms((prev) =>
        prev.map((room) => {
          const nextPm25 = stepRoomPm25(room, outdoorPm25, minutes);
          // Slight CO2 drift when sealed vs open
          const co2Delta = room.windowsSealed ? 4 : -18;
          const nextCo2 = Math.max(
            420,
            Math.min(1350, Math.round(room.co2Ppm + (co2Delta * minutes) / 15))
          );
          return {
            ...room,
            indoorPm25: nextPm25,
            co2Ppm: nextCo2,
          };
        })
      );
    },
    [selectedStation.pollutants.pm25]
  );

  useEffect(() => {
    if (!simulationRunning) return;
    const timer = window.setInterval(() => {
      advanceFiltration(2);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [simulationRunning, advanceFiltration]);

  const handleToggleSafeMode = useCallback(() => {
    const outdoorPm25 = selectedStation.pollutants.pm25;
    if (safeModeActive) {
      // Step down from Turbo Lockdown to balanced Auto while keeping windows sealed
      setRooms((prev) =>
        prev.map((room) => ({
          ...room,
          purifierMode: 'auto',
        }))
      );
    } else {
      // Full Sanctuary Lockdown: seal all windows, set all purifiers to Turbo, apply immediate 8m clearance step
      setRooms((prev) =>
        prev.map((room) => {
          const locked: RoomMonitor = {
            ...room,
            windowsSealed: true,
            purifierMode: 'turbo',
          };
          return {
            ...locked,
            indoorPm25: stepRoomPm25(locked, outdoorPm25, 8),
          };
        })
      );
    }
  }, [safeModeActive, selectedStation.pollutants.pm25]);

  const handleActivateSafeMode = useCallback(() => {
    if (!safeModeActive) {
      handleToggleSafeMode();
    }
  }, [safeModeActive, handleToggleSafeMode]);

  const handleToggleRoomWindow = useCallback((roomId: string) => {
    setRooms((prev) =>
      prev.map((room) =>
        room.id === roomId
          ? { ...room, windowsSealed: !room.windowsSealed }
          : room
      )
    );
  }, []);

  const handleSetRoomPurifierMode = useCallback(
    (roomId: string, mode: PurifierMode) => {
      setRooms((prev) =>
        prev.map((room) =>
          room.id === roomId ? { ...room, purifierMode: mode } : room
        )
      );
    },
    []
  );

  const handleResetRoomFilter = useCallback((roomId: string) => {
    setRooms((prev) =>
      prev.map((room) =>
        room.id === roomId ? { ...room, hepaFilterLifePct: 100 } : room
      )
    );
  }, []);

  const handleBulkRoomAction = useCallback(
    (action: 'seal_all' | 'all_turbo' | 'all_auto' | 'night_sleep') => {
      setRooms((prev) =>
        prev.map((room) => {
          if (action === 'seal_all') {
            return { ...room, windowsSealed: true };
          }
          if (action === 'all_turbo') {
            return { ...room, windowsSealed: true, purifierMode: 'turbo' };
          }
          if (action === 'all_auto') {
            return { ...room, purifierMode: 'auto' };
          }
          return { ...room, windowsSealed: true, purifierMode: 'sleep' };
        })
      );
    },
    []
  );

  const handleAddMember = useCallback((memberInput: Omit<FamilyMember, 'id'>) => {
    const newMember: FamilyMember = {
      ...memberInput,
      id: `member-${Date.now()}`,
    };
    setMembers((prev) => [newMember, ...prev]);
  }, []);

  const handleRemoveMember = useCallback((memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }, []);

  const handleToggleChecklist = useCallback((itemId: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    );
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#090D16] text-[#F8FAFC]">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        safeModeActive={safeModeActive}
        onToggleSafeMode={handleToggleSafeMode}
      />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-8">
        <StationToolbar
          stations={MONITORING_STATIONS}
          selectedStation={selectedStation}
          onSelectStation={setSelectedStationId}
          outdoorAqi={outdoorAssessment.aqi}
          unsealedRoomCount={unsealedRoomCount}
          safeModeActive={safeModeActive}
          onActivateSafeMode={handleActivateSafeMode}
          simulationRunning={simulationRunning}
          onToggleSimulation={() => setSimulationRunning((prev) => !prev)}
          onStepSimulation={() => advanceFiltration(15)}
        />

        {activeTab === 'overview' && (
          <div className="space-y-8">
            <HeroTelemetry
              station={selectedStation}
              assessment={outdoorAssessment}
              rooms={rooms}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
              onToggleRoomWindow={handleToggleRoomWindow}
              onSetRoomPurifierMode={handleSetRoomPurifierMode}
              onOpenRoomsView={() => setActiveTab('rooms')}
            />

            <Sanctuary3DVisualizer
              stationName={`${selectedStation.name}, ${selectedStation.city}`}
              outdoorAqi={outdoorAssessment.aqi}
              rooms={rooms}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
              safeModeActive={safeModeActive}
              onToggleSafeMode={handleToggleSafeMode}
              onExpandView={() => setActiveTab('spatial')}
            />

            <PollutantGrid
              readings={selectedStation.pollutants}
              assessment={outdoorAssessment}
            />

            <ForecastChart
              stationName={`${selectedStation.name}, ${selectedStation.city}`}
              forecast={selectedStation.forecast24h}
              rooms={rooms}
              onOpenFullForecast={() => setActiveTab('forecast')}
            />

            <ProtectionVisualGuide
              outdoorAqi={outdoorAssessment.aqi}
              rooms={rooms}
              sensitiveAlertCount={sensitiveAlertCount}
              onOpenRooms={() => setActiveTab('rooms')}
              onOpenFamily={() => setActiveTab('family')}
            />

            <FamilyCarePanel
              members={members}
              rooms={rooms}
              outdoorAqi={outdoorAssessment.aqi}
              checklist={checklist}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              onToggleChecklist={handleToggleChecklist}
              onOpenFullFamily={() => setActiveTab('family')}
            />
          </div>
        )}

        {activeTab === 'spatial' && (
          <div className="space-y-6">
            <Sanctuary3DVisualizer
              stationName={`${selectedStation.name}, ${selectedStation.city}`}
              outdoorAqi={outdoorAssessment.aqi}
              rooms={rooms}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
              safeModeActive={safeModeActive}
              onToggleSafeMode={handleToggleSafeMode}
              expanded
            />

            <RoomMonitorPanel
              rooms={rooms}
              outdoorAqi={outdoorAssessment.aqi}
              outdoorPm25={selectedStation.pollutants.pm25}
              onToggleWindow={handleToggleRoomWindow}
              onSetPurifierMode={handleSetRoomPurifierMode}
              onResetFilter={handleResetRoomFilter}
            />
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="space-y-8">
            <RoomMonitorPanel
              rooms={rooms}
              outdoorAqi={outdoorAssessment.aqi}
              outdoorPm25={selectedStation.pollutants.pm25}
              detailed
              onToggleWindow={handleToggleRoomWindow}
              onSetPurifierMode={handleSetRoomPurifierMode}
              onResetFilter={handleResetRoomFilter}
              onBulkAction={handleBulkRoomAction}
            />

            <ProtectionVisualGuide
              outdoorAqi={outdoorAssessment.aqi}
              rooms={rooms}
              sensitiveAlertCount={sensitiveAlertCount}
              onOpenFamily={() => setActiveTab('family')}
            />
          </div>
        )}

        {activeTab === 'forecast' && (
          <ForecastChart
            stationName={`${selectedStation.name}, ${selectedStation.city}`}
            forecast={selectedStation.forecast24h}
            rooms={rooms}
            detailed
          />
        )}

        {activeTab === 'family' && (
          <FamilyCarePanel
            members={members}
            rooms={rooms}
            outdoorAqi={outdoorAssessment.aqi}
            checklist={checklist}
            detailed
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            onToggleChecklist={handleToggleChecklist}
          />
        )}
      </main>

      <footer className="mt-8 border-t border-[#1A2438] bg-[#090D16]">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#64748B]">
          <span>
            Atmospheric Sentinel · Calibrated to CPCB National Air Quality Index standards
          </span>
          <span>
            Indoor PM2.5 trajectories modeled from room volume, window seal, and HEPA CADR
          </span>
        </div>
      </footer>
    </div>
  );
}
