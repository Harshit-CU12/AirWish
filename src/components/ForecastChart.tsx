import { useMemo, useState } from 'react';
import { ArrowRight, Clock, Wind } from 'lucide-react';
import type { ForecastPoint, RoomMonitor } from '../types/sentinel';
import { getCpcbCategory } from '../utils/aqi';
import {
  findBestVentilationWindow,
  projectIndoorForecastAqi,
} from '../utils/filtration';
import { AqiPill } from './AqiPill';

interface ForecastChartProps {
  stationName: string;
  forecast: ForecastPoint[];
  rooms: RoomMonitor[];
  detailed?: boolean;
  onOpenFullForecast?: () => void;
}

export function ForecastChart({
  stationName,
  forecast,
  rooms,
  detailed = false,
  onOpenFullForecast,
}: ForecastChartProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const indoorProjection = useMemo(
    () => projectIndoorForecastAqi(forecast, rooms),
    [forecast, rooms]
  );

  const bestWindow = useMemo(
    () => findBestVentilationWindow(forecast),
    [forecast]
  );

  const safeIdx = Math.min(selectedIdx, Math.max(0, forecast.length - 1));
  const selectedPoint = forecast[safeIdx];
  const selectedIndoorAqi = indoorProjection[safeIdx] ?? 0;

  // SVG Coordinate System
  const width = 760;
  const height = 240;
  const padLeft = 42;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxY = Math.max(
    500,
    ...forecast.map((f) => Math.ceil(f.outdoorAqi / 50) * 50)
  );

  const xForIndex = (i: number) =>
    padLeft + (forecast.length > 1 ? (i / (forecast.length - 1)) * plotW : 0);
  const yForAqi = (aqi: number) =>
    padTop + plotH - (Math.min(maxY, Math.max(0, aqi)) / maxY) * plotH;

  const outdoorPath = forecast
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xForIndex(i).toFixed(1)} ${yForAqi(pt.outdoorAqi).toFixed(1)}`)
    .join(' ');

  const outdoorAreaPath = `${outdoorPath} L ${xForIndex(forecast.length - 1).toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${padLeft} ${(padTop + plotH).toFixed(1)} Z`;

  const indoorPath = indoorProjection
    .map((aqi, i) => `${i === 0 ? 'M' : 'L'} ${xForIndex(i).toFixed(1)} ${yForAqi(aqi).toFixed(1)}`)
    .join(' ');

  const indoorAreaPath = `${indoorPath} L ${xForIndex(indoorProjection.length - 1).toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${padLeft} ${(padTop + plotH).toFixed(1)} Z`;

  const bestStartX = xForIndex(bestWindow.startIndex);
  const bestEndX = xForIndex(
    Math.min(forecast.length - 1, bestWindow.startIndex + 2)
  );

  const peakCategory = getCpcbCategory(
    Math.max(...forecast.map((f) => f.outdoorAqi))
  );

  const yTicks = [0, 100, 200, 300, 400, 500].filter((t) => t <= maxY);

  return (
    <section
      aria-label="24-hour predictive air quality forecast"
      className="sentinel-card rounded-2xl p-5 sm:p-6 space-y-5"
    >
      {/* Header Row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start justify-between">
        <div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-[#F8FAFC]">
            24-Hour Predictive Smog &amp; Sanctuary Arc
          </h2>
          <p className="mt-0.5 text-xs text-[#94A3B8]">
            {stationName} outdoor dispersion trajectory vs. projected indoor HEPA sanctuary
          </p>
        </div>

        {/* Lowest Exposure Window Summary */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 rounded-lg border border-[#2A364F] bg-[#0E1524] px-3 py-2">
            <Clock className="h-3.5 w-3.5 text-[#38BDF8] shrink-0" aria-hidden="true" />
            <span className="text-[#94A3B8]">
              Lowest Exposure Window:{' '}
              <strong className="font-mono text-[#F8FAFC] tabular-nums">
                {bestWindow.startHour}–{bestWindow.endHour}
              </strong>{' '}
              (avg AQI {bestWindow.avgAqi} ·{' '}
              <span
                className={
                  bestWindow.isSafeToOpen
                    ? 'text-[#6EE7B7] font-semibold'
                    : 'text-[#FDBA74] font-semibold'
                }
              >
                {bestWindow.isSafeToOpen ? 'Ventilation safe' : 'Keep sealed'}
              </span>
              )
            </span>
          </div>

          {!detailed && onOpenFullForecast && (
            <button
              type="button"
              onClick={onOpenFullForecast}
              className="inline-flex items-center gap-1 font-semibold text-[#38BDF8] hover:text-[#4CD7F6] transition-colors whitespace-nowrap"
            >
              <span>Hourly Table</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Selected Hour Crosshair Readout Bar */}
      {selectedPoint && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-y border-[#1A2438] py-3 text-xs tabular-nums">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-[#64748B]">Selected Hour</span>
              <div className="font-mono text-sm font-semibold text-[#F8FAFC]">
                {selectedPoint.hourLabel}
              </div>
            </div>
            <div className="h-6 w-px bg-[#1A2438]" aria-hidden="true" />
            <div className="flex items-center gap-2">
              <span className="text-[#94A3B8]">Outdoor</span>
              <AqiPill aqi={selectedPoint.outdoorAqi} size="sm" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#94A3B8]">Projected Indoor</span>
              <AqiPill aqi={selectedIndoorAqi} size="sm" />
            </div>
          </div>

          <div className="flex items-center gap-3 text-[#94A3B8]">
            <span className="inline-flex items-center gap-1">
              <Wind className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
              <strong className="text-[#F8FAFC]">{selectedPoint.windKmh} km/h</strong>
            </span>
            <span aria-hidden="true" className="text-[#2A364F]">·</span>
            <span>
              PM2.5 <strong className="text-[#F8FAFC]">{selectedPoint.outdoorPm25} µg/m³</strong>
            </span>
            <span aria-hidden="true" className="text-[#2A364F]">·</span>
            <span>
              Temp <strong className="text-[#F8FAFC]">{selectedPoint.tempC}°C</strong>
            </span>
          </div>
        </div>
      )}

      {/* Interactive Dual-Curve SVG Chart */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-[540px]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto select-none"
            role="img"
            aria-label="24-hour Outdoor AQI versus Projected Indoor AQI line chart"
          >
            <defs>
              <linearGradient id="outdoorWash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={peakCategory.rimColor} stopOpacity="0.28" />
                <stop offset="100%" stopColor={peakCategory.rimColor} stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="indoorWash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines */}
            {yTicks.map((tick) => {
              const y = yForAqi(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#1A2438"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748B"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Highlight band for Lowest Exposure Window */}
            <rect
              x={bestStartX}
              y={padTop}
              width={Math.max(18, bestEndX - bestStartX)}
              height={plotH}
              fill="rgba(56, 189, 248, 0.09)"
              stroke="rgba(56, 189, 248, 0.25)"
              strokeDasharray="3 3"
              rx="4"
            />

            {/* Area fills */}
            <path d={outdoorAreaPath} fill="url(#outdoorWash)" />
            <path d={indoorAreaPath} fill="url(#indoorWash)" />

            {/* Outdoor Curve */}
            <path
              d={outdoorPath}
              fill="none"
              stroke={peakCategory.rimColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Indoor Curve */}
            <path
              d={indoorPath}
              fill="none"
              stroke="#06B6D4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Active crosshair vertical line */}
            {selectedPoint && (
              <g>
                <line
                  x1={xForIndex(safeIdx)}
                  y1={padTop}
                  x2={xForIndex(safeIdx)}
                  y2={padTop + plotH}
                  stroke="#94A3B8"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={xForIndex(safeIdx)}
                  cy={yForAqi(selectedPoint.outdoorAqi)}
                  r="5"
                  fill="#F8FAFC"
                  stroke={peakCategory.rimColor}
                  strokeWidth="2.5"
                />
                <circle
                  cx={xForIndex(safeIdx)}
                  cy={yForAqi(selectedIndoorAqi)}
                  r="5"
                  fill="#F8FAFC"
                  stroke="#06B6D4"
                  strokeWidth="2.5"
                />
              </g>
            )}

            {/* X-axis hour labels (every 3 hours) + clickable hit bands */}
            {forecast.map((pt, i) => {
              const x = xForIndex(i);
              const stepW = plotW / Math.max(1, forecast.length - 1);
              return (
                <g key={pt.hourLabel}>
                  {i % 3 === 0 && (
                    <text
                      x={x}
                      y={height - 10}
                      textAnchor="middle"
                      fill={i === safeIdx ? '#F8FAFC' : '#64748B'}
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {pt.hourLabel}
                    </text>
                  )}
                  <rect
                    x={x - stepW / 2}
                    y={padTop}
                    width={stepW}
                    height={plotH + 24}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setSelectedIdx(i)}
                    onClick={() => setSelectedIdx(i)}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Accessible Keyboard Hour Selector & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-5 text-xs text-[#94A3B8]">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-0.5 w-4 rounded-full"
              style={{ backgroundColor: peakCategory.rimColor }}
            />
            <span>Outdoor Forecast AQI</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-0.5 w-4 rounded-full bg-[#06B6D4]"
            />
            <span>Projected Indoor Sanctuary</span>
          </span>
        </div>

        <div
          role="group"
          aria-label="Jump to forecast time of day"
          className="flex items-center gap-1.5"
        >
          {[
            { label: 'Dawn (06:00)', idx: 0 },
            { label: 'Noon (12:00)', idx: 6 },
            { label: 'Best Window', idx: bestWindow.startIndex },
            { label: 'Night (22:00)', idx: 16 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setSelectedIdx(preset.idx)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                safeIdx === preset.idx
                  ? 'bg-[#1E293B] text-[#F8FAFC] border border-[#06B6D4]/60'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] border border-transparent'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Detailed 24h Hourly Dispersion Table on dedicated Forecast Tab */}
      {detailed && (
        <div className="border-t border-[#1A2438] pt-5 overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead>
              <tr className="border-b border-[#1A2438] text-[#94A3B8]">
                <th className="py-2.5 pr-4 font-semibold">Hour</th>
                <th className="py-2.5 px-4 font-semibold text-right">Outdoor AQI</th>
                <th className="py-2.5 px-4 font-semibold text-right">Outdoor PM2.5</th>
                <th className="py-2.5 px-4 font-semibold text-right">Indoor Projected</th>
                <th className="py-2.5 px-4 font-semibold text-right">Wind</th>
                <th className="py-2.5 pl-4 font-semibold">Window Guidance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2438]">
              {forecast.map((pt, i) => {
                const indoor = indoorProjection[i] ?? 0;
                const isBest =
                  i >= bestWindow.startIndex && i <= bestWindow.startIndex + 2;
                const cat = getCpcbCategory(pt.outdoorAqi);
                return (
                  <tr
                    key={pt.hourLabel}
                    onClick={() => setSelectedIdx(i)}
                    className={`cursor-pointer transition-colors hover:bg-[#1E293B]/50 ${
                      safeIdx === i ? 'bg-[#1E293B]/60' : ''
                    }`}
                  >
                    <td className="py-2.5 pr-4 font-mono font-semibold text-[#F8FAFC]">
                      {pt.hourLabel}
                      {isBest ? (
                        <span className="ml-2 font-sans text-[11px] font-medium text-[#38BDF8]">
                          · Lowest
                        </span>
                      ) : null}
                    </td>
                    <td
                      className="py-2.5 px-4 text-right font-semibold"
                      style={{ color: cat.textHex }}
                    >
                      {pt.outdoorAqi} ({cat.label})
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#F8FAFC]">
                      {pt.outdoorPm25} µg/m³
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#6EE7B7]">
                      {indoor} AQI
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#94A3B8]">
                      {pt.windKmh} km/h
                    </td>
                    <td className="py-2.5 pl-4 text-[#94A3B8]">
                      {pt.outdoorAqi <= 100
                        ? 'Brief cross-ventilation safe'
                        : pt.outdoorAqi <= 200
                          ? 'Keep sealed · Auto HEPA'
                          : 'Sealed lockdown · High/Turbo HEPA'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
