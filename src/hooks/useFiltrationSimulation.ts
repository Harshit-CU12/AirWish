import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PurifierMode, RoomMonitor } from '../types/sentinel';
import { stepRoomPm25 } from '../utils/filtration';
import { playAlertChime } from '../utils/alertSound';

/**
 * Hook managing real-time household indoor filtration simulation and safe mode lockdown.
 */
export function useFiltrationSimulation(
  rooms: RoomMonitor[],
  setRooms: React.Dispatch<React.SetStateAction<RoomMonitor[]>>,
  outdoorPm25: number
) {
  const [simulationRunning, setSimulationRunning] = useState(true);

  const safeModeActive = useMemo(
    () => rooms.length > 0 && rooms.every((r) => r.windowsSealed && r.purifierMode === 'turbo'),
    [rooms]
  );

  const unsealedRoomCount = useMemo(
    () => rooms.filter((r) => !r.windowsSealed).length,
    [rooms]
  );

  const advanceFiltration = useCallback(
    (minutes: number) => {
      setRooms((prev) =>
        prev.map((room) => {
          const nextPm25 = stepRoomPm25(room, outdoorPm25, minutes);
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
    [outdoorPm25, setRooms]
  );

  useEffect(() => {
    if (!simulationRunning) return;
    const timer = window.setInterval(() => {
      advanceFiltration(2);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [simulationRunning, advanceFiltration]);

  const handleToggleSafeMode = useCallback(() => {
    if (safeModeActive) {
      setRooms((prev) =>
        prev.map((room) => ({
          ...room,
          purifierMode: 'auto',
        }))
      );
    } else {
      playAlertChime('safe_mode');
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
  }, [safeModeActive, outdoorPm25, setRooms]);

  const handleToggleRoomWindow = useCallback(
    (roomId: string) => {
      setRooms((prev) =>
        prev.map((room) =>
          room.id === roomId ? { ...room, windowsSealed: !room.windowsSealed } : room
        )
      );
    },
    [setRooms]
  );

  const handleSetRoomPurifierMode = useCallback(
    (roomId: string, mode: PurifierMode) => {
      setRooms((prev) =>
        prev.map((room) => (room.id === roomId ? { ...room, purifierMode: mode } : room))
      );
    },
    [setRooms]
  );

  const handleResetRoomFilter = useCallback(
    (roomId: string) => {
      setRooms((prev) =>
        prev.map((room) => (room.id === roomId ? { ...room, hepaFilterLifePct: 100 } : room))
      );
    },
    [setRooms]
  );

  return {
    simulationRunning,
    setSimulationRunning,
    safeModeActive,
    unsealedRoomCount,
    advanceFiltration,
    handleToggleSafeMode,
    handleToggleRoomWindow,
    handleSetRoomPurifierMode,
    handleResetRoomFilter,
  };
}
