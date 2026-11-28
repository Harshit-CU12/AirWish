import { useState, useEffect, useMemo } from 'react';
import type { MonitoringStation, WeatherConditions } from '../types/sentinel';
import { MONITORING_STATIONS } from '../data/stations';
import { fetchLiveStationWeather } from '../services/weather';
import { evaluateStationAqi } from '../utils/aqi';

/**
 * Hook to manage live atmospheric weather polling and station merging.
 */
export function useLiveWeather(selectedStationId: string) {
  const selectedStation = useMemo(
    () =>
      MONITORING_STATIONS.find((s) => s.id === selectedStationId) ?? MONITORING_STATIONS[0],
    [selectedStationId]
  );

  const [liveWeatherMap, setLiveWeatherMap] = useState<Record<string, WeatherConditions>>({});

  useEffect(() => {
    let cancelled = false;
    fetchLiveStationWeather(selectedStation).then((live) => {
      if (!cancelled && live) {
        setLiveWeatherMap((prev) => ({ ...prev, [selectedStation.id]: live }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedStation]);

  const activeStation = useMemo(() => {
    const live = liveWeatherMap[selectedStation.id];
    if (!live) return selectedStation;
    return { ...selectedStation, weather: live };
  }, [selectedStation, liveWeatherMap]);

  const outdoorAssessment = useMemo(
    () => evaluateStationAqi(activeStation.pollutants),
    [activeStation]
  );

  return {
    selectedStation,
    activeStation,
    outdoorAssessment,
  };
}
