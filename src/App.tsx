import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FamilyCarePanel } from './components/FamilyCarePanel';
import { ForecastChart } from './components/ForecastChart';
import { HeroTelemetry } from './components/HeroTelemetry';
import { PollutantGrid } from './components/PollutantGrid';
import { ProtectionVisualGuide } from './components/ProtectionVisualGuide';
import { RoomMonitorPanel } from './components/RoomMonitorPanel';
import { StationToolbar } from './components/StationToolbar';
import { TopBar } from './components/TopBar';

const Sanctuary3DVisualizer = lazy(() =>
  import('./components/Sanctuary3DVisualizer').then((m) => ({
    default: m.Sanctuary3DVisualizer,
  }))
);

function VisualizerSkeleton({ expanded = false }: { expanded?: boolean }) {
  return (
    <div
      className="sentinel-card relative overflow-hidden rounded-2xl border border-[#2A364F] bg-[#070C16] flex flex-col items-center justify-center p-6 text-center animate-pulse"
      style={{
        height: expanded ? 'min(74vh, 680px)' : '430px',
        minHeight: expanded ? '520px' : '380px',
      }}
    >
      <div className="h-9 w-9 rounded-full border-2 border-[#06B6D4] border-t-transparent animate-spin mb-3" />
      <p className="font-display text-sm font-semibold text-[#F8FAFC]">
        Initializing 3D Airflow Model...
      </p>
      <p className="mt-1 text-xs text-[#94A3B8]">
        Loading spatial physics &amp; HEPA turbine rig
      </p>
    </div>
  );
}
import { MONITORING_STATIONS } from './data/stations';
import { useAirWishStorage } from './hooks/useAirWishStorage';
import { useFiltrationSimulation } from './hooks/useFiltrationSimulation';
import { useLiveWeather } from './hooks/useLiveWeather';
import type { FamilyMember, RoomMonitor, ViewTab } from './types/sentinel';
import { playAlertChime, requestBrowserNotification } from './utils/alertSound';
import { evaluateMemberGuidance } from './utils/aqi';
import { exportExposureReportCsv } from './utils/exportReport';
import { getRoomIndoorAqi } from './utils/filtration';
import { AiAdvisorModal } from './components/AiAdvisorModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState(false);

  const {
    selectedStationId,
    setSelectedStationId,
    rooms,
    setRooms,
    members,
    setMembers,
    checklist,
    toggleChecklist,
  } = useAirWishStorage();

  const [selectedRoomId, setSelectedRoomId] = useState<string>(() => rooms[0]?.id ?? 'room-living');

  const { activeStation, outdoorAssessment } = useLiveWeather(selectedStationId);

  const {
    simulationRunning,
    setSimulationRunning,
    safeModeActive,
    unsealedRoomCount,
    advanceFiltration,
    handleToggleSafeMode,
    handleToggleRoomWindow,
    handleSetRoomPurifierMode,
    handleResetRoomFilter,
  } = useFiltrationSimulation(rooms, setRooms, activeStation.pollutants.pm25);

  const prevAqiRef = useRef<number | null>(null);

  useEffect(() => {
    const prevAqi = prevAqiRef.current;
    prevAqiRef.current = outdoorAssessment.aqi;

    const enteredSevere =
      outdoorAssessment.aqi >= 400 && (prevAqi === null || prevAqi < 400);

    if (enteredSevere && !safeModeActive) {
      playAlertChime('warning');
      requestBrowserNotification(
        'Severe Smog Emergency Alert (CPCB 400+)',
        `AirWish detected AQI ${outdoorAssessment.aqi} at ${activeStation.name}. Seal windows & engage Turbo HEPA.`
      );
    }
  }, [outdoorAssessment.aqi, safeModeActive, activeStation.name]);

  const sensitiveAlertCount = useMemo(() => {
    return members.filter((member) => {
      const room = rooms.find((r) => r.id === member.primaryRoomId) ?? rooms[0];
      const indoorAqi = room ? getRoomIndoorAqi(room) : 40;
      return evaluateMemberGuidance(member, outdoorAssessment.aqi, indoorAqi)
        .isSensitiveGroupAlert;
    }).length;
  }, [members, rooms, outdoorAssessment.aqi]);

  const handleActivateSafeMode = useCallback(() => {
    if (!safeModeActive) {
      handleToggleSafeMode();
    }
  }, [safeModeActive, handleToggleSafeMode]);

  const handleAddRoom = useCallback(
    (roomInput: Omit<RoomMonitor, 'id'>) => {
      const newRoom: RoomMonitor = {
        ...roomInput,
        id: `room-custom-${Date.now()}`,
      };
      setRooms((prev) => [...prev, newRoom]);
    },
    [setRooms]
  );

  const handleRemoveRoom = useCallback(
    (roomId: string) => {
      setRooms((prev) => {
        const remaining = prev.filter((r) => r.id !== roomId);
        if (remaining.length > 0) {
          setSelectedRoomId((current) => (current === roomId ? remaining[0].id : current));
          setMembers((prevMembers) =>
            prevMembers.map((m) =>
              m.primaryRoomId === roomId ? { ...m, primaryRoomId: remaining[0].id } : m
            )
          );
        }
        return remaining;
      });
    },
    [setRooms, setMembers]
  );

  const handleExportReport = useCallback(() => {
    exportExposureReportCsv(
      activeStation,
      outdoorAssessment,
      rooms,
      members,
      checklist
    );
  }, [activeStation, outdoorAssessment, rooms, members, checklist]);

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
    [setRooms]
  );

  const handleAddMember = useCallback(
    (memberInput: Omit<FamilyMember, 'id'>) => {
      const newMember: FamilyMember = {
        ...memberInput,
        id: `member-${Date.now()}`,
      };
      setMembers((prev) => [newMember, ...prev]);
    },
    [setMembers]
  );

  const handleRemoveMember = useCallback(
    (memberId: string) => {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    },
    [setMembers]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#090D16] text-[#F8FAFC]">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-[#06B6D4] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#090D16] focus:shadow-lg focus:ring-2 focus:ring-white focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Screen Reader Live Telemetry Announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Current station: {activeStation.name}, Outdoor CPCB AQI: {outdoorAssessment.aqi}, {outdoorAssessment.category.label}.
        {safeModeActive ? 'Sanctuary Lockdown active.' : ''}
      </div>

      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        safeModeActive={safeModeActive}
        onToggleSafeMode={handleToggleSafeMode}
        onOpenAiAdvisor={() => setIsAiAdvisorOpen(true)}
        onExportReport={handleExportReport}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1280px] flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-8 focus:outline-none"
      >
        <StationToolbar
          stations={MONITORING_STATIONS}
          selectedStation={activeStation}
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
          <div role="tabpanel" id="view-overview" aria-labelledby="tab-overview" className="space-y-8 focus:outline-none">
            <HeroTelemetry
              station={activeStation}
              assessment={outdoorAssessment}
              rooms={rooms}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
              onToggleRoomWindow={handleToggleRoomWindow}
              onSetRoomPurifierMode={handleSetRoomPurifierMode}
              onOpenRoomsView={() => setActiveTab('rooms')}
            />

            <ErrorBoundary fallbackTitle="3D Airflow Visualizer Intercepted">
              <Suspense fallback={<VisualizerSkeleton />}>
                <Sanctuary3DVisualizer
                  stationName={`${activeStation.name}, ${activeStation.city}`}
                  outdoorAqi={outdoorAssessment.aqi}
                  rooms={rooms}
                  selectedRoomId={selectedRoomId}
                  onSelectRoom={setSelectedRoomId}
                  safeModeActive={safeModeActive}
                  onToggleSafeMode={handleToggleSafeMode}
                  onExpandView={() => setActiveTab('spatial')}
                />
              </Suspense>
            </ErrorBoundary>

            <PollutantGrid
              readings={activeStation.pollutants}
              assessment={outdoorAssessment}
            />

            <ForecastChart
              stationName={`${activeStation.name}, ${activeStation.city}`}
              forecast={activeStation.forecast24h}
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
              onToggleChecklist={toggleChecklist}
              onOpenFullFamily={() => setActiveTab('family')}
            />
          </div>
        )}

        {activeTab === 'spatial' && (
          <div role="tabpanel" id="view-spatial" aria-labelledby="tab-spatial" className="space-y-6 focus:outline-none">
            <Suspense fallback={<VisualizerSkeleton expanded />}>
              <Sanctuary3DVisualizer
                stationName={`${activeStation.name}, ${activeStation.city}`}
                outdoorAqi={outdoorAssessment.aqi}
                rooms={rooms}
                selectedRoomId={selectedRoomId}
                onSelectRoom={setSelectedRoomId}
                safeModeActive={safeModeActive}
                onToggleSafeMode={handleToggleSafeMode}
                expanded
              />
            </Suspense>

            <RoomMonitorPanel
              rooms={rooms}
              outdoorAqi={outdoorAssessment.aqi}
              outdoorPm25={activeStation.pollutants.pm25}
              onToggleWindow={handleToggleRoomWindow}
              onSetPurifierMode={handleSetRoomPurifierMode}
              onResetFilter={handleResetRoomFilter}
            />
          </div>
        )}

        {activeTab === 'rooms' && (
          <div role="tabpanel" id="view-rooms" aria-labelledby="tab-rooms" className="space-y-8 focus:outline-none">
            <RoomMonitorPanel
              rooms={rooms}
              outdoorAqi={outdoorAssessment.aqi}
              outdoorPm25={activeStation.pollutants.pm25}
              detailed
              onToggleWindow={handleToggleRoomWindow}
              onSetPurifierMode={handleSetRoomPurifierMode}
              onResetFilter={handleResetRoomFilter}
              onBulkAction={handleBulkRoomAction}
              onAddRoom={handleAddRoom}
              onRemoveRoom={handleRemoveRoom}
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
          <div role="tabpanel" id="view-forecast" aria-labelledby="tab-forecast" className="focus:outline-none">
            <ForecastChart
              stationName={`${activeStation.name}, ${activeStation.city}`}
              forecast={activeStation.forecast24h}
              rooms={rooms}
              detailed
            />
          </div>
        )}

        {activeTab === 'family' && (
          <div role="tabpanel" id="view-family" aria-labelledby="tab-family" className="focus:outline-none">
            <FamilyCarePanel
              members={members}
              rooms={rooms}
              outdoorAqi={outdoorAssessment.aqi}
              checklist={checklist}
              detailed
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              onToggleChecklist={toggleChecklist}
            />
          </div>
        )}
      </main>

      <footer className="mt-8 border-t border-[#1A2438] bg-[#090D16]">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#64748B]">
          <span>
            AirWish · Calibrated to CPCB National Air Quality Index standards
          </span>
          <span>
            Indoor PM2.5 trajectories modeled from room volume, window seal, and HEPA CADR
          </span>
        </div>
      </footer>

      <AiAdvisorModal
        isOpen={isAiAdvisorOpen}
        onClose={() => setIsAiAdvisorOpen(false)}
        station={activeStation}
        assessment={outdoorAssessment}
        rooms={rooms}
        members={members}
      />
    </div>
  );
}
