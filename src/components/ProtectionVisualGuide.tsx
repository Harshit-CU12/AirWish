import { ArrowRight, ShieldCheck, Wind } from 'lucide-react';
import type { RoomMonitor } from '../types/sentinel';
import { getCpcbCategory } from '../utils/aqi';
import { getEffectiveCadrM3h } from '../utils/filtration';
import { SentinelImage } from './SentinelImage';

export const SENTINEL_VISUALS = {
  smogSkyline: '/src/assets/images/hero_smog_skyline_1795713468343.jpg',
  clearSkyline: '/src/assets/images/hero_clear_skyline_1795713471268.jpg',
  sanctuaryInterior: '/src/assets/images/sanctuary_hepa_interior_1795713472497.jpg',
  hepaCutaway: '/src/assets/images/hepa_filter_cutaway_1795713473451.jpg',
  respiratorStudio: '/src/assets/images/respirator_n99_studio_1795713473111.jpg',
};

interface ProtectionVisualGuideProps {
  outdoorAqi: number;
  rooms: RoomMonitor[];
  sensitiveAlertCount: number;
  onOpenRooms?: () => void;
  onOpenFamily?: () => void;
}

export function ProtectionVisualGuide({
  outdoorAqi,
  rooms,
  sensitiveAlertCount,
  onOpenRooms,
  onOpenFamily,
}: ProtectionVisualGuideProps) {
  const category = getCpcbCategory(outdoorAqi);
  const totalCadr = Math.round(
    rooms.reduce((sum, r) => sum + getEffectiveCadrM3h(r), 0)
  );
  const lowestFilterRoom = rooms.reduce(
    (min, r) => (r.hepaFilterLifePct < min.hepaFilterLifePct ? r : min),
    rooms[0]
  );

  return (
    <section
      aria-label="Filtration hardware and personal respirator visual reference"
      className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch"
    >
      {/* Card 1: HEPA H13 + Activated Carbon Engineering Visual */}
      <article className="sentinel-card overflow-hidden rounded-2xl flex flex-col sm:flex-row lg:flex-row items-stretch">
        <div className="relative sm:w-56 md:w-64 shrink-0 overflow-hidden bg-[#070C16]">
          <SentinelImage
            src={SENTINEL_VISUALS.hepaCutaway}
            alt="Isometric cutaway of a 3-stage cylindrical HEPA H13 and activated carbon filtration cartridge"
            fallbackTitle="HEPA H13 Multi-Stage Core"
            className="h-52 sm:h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090D16]/75 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-[#131B2E]/50"
          />
        </div>

        <div className="flex flex-1 flex-col justify-between p-5 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#38BDF8]">
              <Wind className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>3-Stage Mechanical Filtration</span>
            </div>
            <h3 className="font-display text-lg font-bold text-[#F8FAFC]">
              HEPA H13 &amp; Carbon Capture Core
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Outer titanium mesh traps PM10 coarse dust, pleated borosilicate H13
              fibers capture <strong className="text-[#F8FAFC]">99.97% of 0.3 µm PM2.5</strong>,
              and pelletized activated carbon adsorbs NO₂ and urban VOC fumes.
            </p>
          </div>

          <div className="space-y-2.5 border-t border-[#1A2438] pt-3.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 tabular-nums">
              <span className="text-[#94A3B8]">
                Active Whole-Home CADR:{' '}
                <strong className="font-mono text-[#F8FAFC]">{totalCadr} m³/h</strong>
              </span>
              {lowestFilterRoom && (
                <span
                  className={
                    lowestFilterRoom.hepaFilterLifePct < 20
                      ? 'font-semibold text-[#FDBA74]'
                      : 'text-[#6EE7B7]'
                  }
                >
                  Lowest filter: {lowestFilterRoom.name} ({lowestFilterRoom.hepaFilterLifePct}%)
                </span>
              )}
            </div>

            {onOpenRooms && (
              <button
                type="button"
                onClick={onOpenRooms}
                className="inline-flex items-center gap-1 font-semibold text-[#38BDF8] hover:text-[#4CD7F6] transition-colors"
              >
                <span>Inspect Room Purifiers</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </article>

      {/* Card 2: Personal Respirator & Seal Grade Visual */}
      <article className="sentinel-card overflow-hidden rounded-2xl flex flex-col sm:flex-row lg:flex-row items-stretch">
        <div className="relative sm:w-56 md:w-64 shrink-0 overflow-hidden bg-[#070C16]">
          <SentinelImage
            src={SENTINEL_VISUALS.respiratorStudio}
            alt="Matte charcoal N99 particulate respirator mask with sculpted aluminum nose clip on dark slate"
            fallbackTitle="N95 / N99 Respirator Seal"
            className="h-52 sm:h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090D16]/75 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-[#131B2E]/50"
          />
        </div>

        <div className="flex flex-1 flex-col justify-between p-5 gap-4">
          <div className="space-y-2">
            <div
              className="flex items-center gap-2 text-xs font-semibold"
              style={{ color: category.textHex }}
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Respirator Protocol · AQI {outdoorAqi}</span>
            </div>
            <h3 className="font-display text-lg font-bold text-[#F8FAFC]">
              {category.maskGuidance}
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Cloth and surgical masks leave perimeter gaps that allow fine PM2.5
              inhalation. Mold the aluminum nose bridge firmly for an airtight cheek
              seal whenever stepping outside during smog episodes.
            </p>
          </div>

          <div className="space-y-2.5 border-t border-[#1A2438] pt-3.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 tabular-nums">
              <span className="text-[#94A3B8]">
                Sensitive Group Alerts:{' '}
                <strong className="text-[#F8FAFC]">
                  {sensitiveAlertCount > 0
                    ? `${sensitiveAlertCount} active`
                    : 'None active'}
                </strong>
              </span>
              <span className="text-[#94A3B8]">
                Grade:{' '}
                <strong className="text-[#F8FAFC]">
                  {outdoorAqi > 300 ? 'N99 / FFP3' : outdoorAqi > 100 ? 'N95 / FFP2' : 'Optional'}
                </strong>
              </span>
            </div>

            {onOpenFamily && (
              <button
                type="button"
                onClick={onOpenFamily}
                className="inline-flex items-center gap-1 font-semibold text-[#38BDF8] hover:text-[#4CD7F6] transition-colors"
              >
                <span>Open Family Triage</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
