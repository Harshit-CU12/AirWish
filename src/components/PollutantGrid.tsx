import type { PollutantKey, PollutantReadings } from '../types/sentinel';
import type { AqiAssessment } from '../utils/aqi';
import { getCpcbCategory, POLLUTANT_META } from '../utils/aqi';

interface PollutantGridProps {
  readings: PollutantReadings;
  assessment: AqiAssessment;
}

const POLLUTANT_ORDER: PollutantKey[] = ['pm25', 'pm10', 'no2', 'o3', 'so2', 'co'];

const CPCB_BANDS = [
  { label: 'Good', range: '0–50', color: '#10B981', widthPct: 10 },
  { label: 'Satisfactory', range: '51–100', color: '#84CC16', widthPct: 10 },
  { label: 'Moderate', range: '101–200', color: '#F59E0B', widthPct: 20 },
  { label: 'Poor', range: '201–300', color: '#F97316', widthPct: 20 },
  { label: 'Very Poor', range: '301–400', color: '#EF4444', widthPct: 20 },
  { label: 'Severe', range: '401–500+', color: '#991B1B', widthPct: 20 },
];

export function PollutantGrid({ readings, assessment }: PollutantGridProps) {
  const markerLeftPct = Math.max(1, Math.min(99, (assessment.aqi / 500) * 100));

  return (
    <section
      aria-label="Statutory CPCB pollutant telemetry breakdown"
      className="sentinel-card rounded-2xl p-5 sm:p-6 space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
            Pollutant Telemetry Breakdown
          </h2>
          <p className="mt-0.5 text-xs text-[#94A3B8]">
            Statutory CPCB sub-indices computed across six criteria pollutants · Primary driver:{' '}
            <span className="font-semibold text-[#F8FAFC]">
              {POLLUTANT_META[assessment.prominentPollutant].formula}
            </span>
          </p>
        </div>
        <div className="text-xs text-[#94A3B8] tabular-nums">
          Safe limit ratios measured against CPCB 24h / 8h NAAQS
        </div>
      </div>

      {/* 6-Pollutant Matrix with hairline dividers (no nested bordered cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:gap-x-8 sm:gap-y-6 border-t border-[#1A2438] pt-5">
        {POLLUTANT_ORDER.map((key) => {
          const meta = POLLUTANT_META[key];
          const value = readings[key];
          const subIndex = assessment.subIndices[key];
          const cat = getCpcbCategory(subIndex);
          const barPct = Math.max(4, Math.min(100, (subIndex / 500) * 100));
          const ratio = Math.round((value / meta.safeLimit) * 10) / 10;
          const isProminent = key === assessment.prominentPollutant;

          return (
            <div key={key} className="py-3 sm:py-0 space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-display text-sm font-bold text-[#F8FAFC]">
                    {meta.formula}
                  </span>
                  <span className="text-xs text-[#94A3B8] truncate">
                    {meta.label}
                  </span>
                  {isProminent && (
                    <span className="text-[11px] font-semibold text-[#38BDF8] whitespace-nowrap">
                      · Primary
                    </span>
                  )}
                </div>
                <span
                  className="text-xs font-semibold tabular-nums whitespace-nowrap"
                  style={{ color: cat.textHex }}
                >
                  Sub-AQI {subIndex}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1.5 tabular-nums">
                  <span className="font-display text-2xl font-bold text-[#F8FAFC]">
                    {value}
                  </span>
                  <span className="font-mono text-xs text-[#94A3B8]">
                    {meta.unit}
                  </span>
                </div>
                <span className="text-xs text-[#64748B] tabular-nums">
                  {ratio > 1 ? `${ratio}× safe limit` : `Within ${meta.safeLimit} ${meta.unit}`}
                </span>
              </div>

              {/* Pill-capped progress track */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#0E1524]">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${barPct}%`,
                    backgroundColor: cat.rimColor,
                  }}
                />
              </div>

              <p className="text-[11px] text-[#64748B] truncate">
                {meta.sourceHint}
              </p>
            </div>
          );
        })}
      </div>

      {/* Continuous CPCB 0–500 Scale Reference Bar */}
      <div className="border-t border-[#1A2438] pt-5 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-[#94A3B8]">
          <span>CPCB National Air Quality Index Scale</span>
          <span className="font-mono tabular-nums text-[#F8FAFC]">
            Current: {assessment.aqi} ({assessment.category.label})
          </span>
        </div>

        <div className="relative pt-1">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#0E1524]">
            {CPCB_BANDS.map((band) => (
              <div
                key={band.label}
                style={{ width: `${band.widthPct}%`, backgroundColor: band.color }}
                title={`${band.label} (${band.range})`}
              />
            ))}
          </div>
          {/* Live AQI Marker */}
          <div
            aria-hidden="true"
            className="absolute top-0 h-4.5 w-1 -translate-x-1/2 rounded-full bg-[#F8FAFC] shadow-[0_0_8px_rgba(248,250,252,0.85)] transition-all duration-300"
            style={{ left: `${markerLeftPct}%` }}
          />
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px] text-[#94A3B8] pt-1">
          {CPCB_BANDS.map((band) => (
            <div key={band.label} className="flex items-center gap-1.5 min-w-0">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: band.color }}
              />
              <span className="truncate">
                <strong className="font-medium text-[#F8FAFC]">{band.label}</strong>{' '}
                <span className="text-[#64748B] tabular-nums">{band.range}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
