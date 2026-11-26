import { ShieldAlert, ShieldCheck } from 'lucide-react';
import type { ViewTab } from '../types/sentinel';

interface TopBarProps {
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  safeModeActive: boolean;
  onToggleSafeMode: () => void;
}

const NAV_ITEMS: { id: ViewTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'spatial', label: '3D Sanctuary' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'forecast', label: '24h Forecast' },
  { id: 'family', label: 'Family Care' },
];

export function TopBar({
  activeTab,
  onSelectTab,
  safeModeActive,
  onToggleSafeMode,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#2A364F] bg-[#090D16]/90 backdrop-blur-md">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <div className="flex h-16 items-center justify-between gap-2 sm:gap-4 lg:gap-8">
          {/* Zone 1: Single-line brand wordmark */}
          <button
            type="button"
            onClick={() => onSelectTab('overview')}
            className="flex items-center gap-2 text-left font-display text-base sm:text-lg font-bold tracking-tight text-[#F8FAFC] hover:text-[#38BDF8] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4] rounded-md"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 28 28"
              className="h-5 w-5 sm:h-6 sm:w-6 shrink-0"
              fill="none"
            >
              <path
                d="M14 2.5L4.5 6.8V13.6C4.5 19.6 8.6 24.4 14 26C19.4 24.4 23.5 19.6 23.5 13.6V6.8L14 2.5Z"
                stroke="#06B6D4"
                strokeWidth="1.8"
                fill="rgba(6, 182, 212, 0.14)"
              />
              <path
                d="M9.5 13.5C11 11.8 13.2 11.8 14.5 13.5C15.8 15.2 17.8 15.2 19 13.5"
                stroke="#38BDF8"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M10.5 17.5C11.8 16.2 13.4 16.2 14.5 17.5C15.6 18.8 17 18.8 18 17.5"
                stroke="#4EDEA3"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <span>Atmospheric Sentinel</span>
          </button>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4] rounded-sm ${
                    isActive
                      ? 'text-[#F8FAFC]'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-[13px] h-[2px] rounded-full bg-[#06B6D4]"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single primary action button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onToggleSafeMode}
              aria-pressed={safeModeActive}
              aria-label={safeModeActive ? 'Safe Mode Active' : 'Activate Safe Mode'}
              className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-150 whitespace-nowrap shrink-0 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090D16] ${
                safeModeActive
                  ? 'bg-[#10B981]/20 text-[#6EE7B7] border border-[#10B981]/50 hover:bg-[#10B981]/30'
                  : 'bg-[#06B6D4] text-[#090D16] hover:bg-[#38BDF8] hover:shadow-[0_0_16px_rgba(6,182,212,0.4)]'
              }`}
            >
              {safeModeActive ? (
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span className="sm:hidden">
                {safeModeActive ? 'Safe On' : 'Safe Mode'}
              </span>
              <span className="hidden sm:inline">
                {safeModeActive ? 'Safe Mode Active' : 'Activate Safe Mode'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile navigation row — kept compact to stay well under 15% mobile sticky cap */}
        <nav
          aria-label="Mobile navigation"
          className="flex md:hidden items-center justify-between gap-1 border-t border-[#1A2438] py-1.5 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex-1 rounded-md px-2.5 py-2 text-xs font-medium text-center transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                  isActive
                    ? 'bg-[#131B2E] text-[#F8FAFC] border border-[#2A364F]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
