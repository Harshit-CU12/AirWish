import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import type {
  ChecklistItem,
  FamilyMember,
  RoomMonitor,
  VulnerabilityGroup,
} from '../types/sentinel';
import { evaluateMemberGuidance } from '../utils/aqi';
import { getRoomIndoorAqi } from '../utils/filtration';

interface FamilyCarePanelProps {
  members: FamilyMember[];
  rooms: RoomMonitor[];
  outdoorAqi: number;
  checklist: ChecklistItem[];
  detailed?: boolean;
  onAddMember: (member: Omit<FamilyMember, 'id'>) => void;
  onRemoveMember: (memberId: string) => void;
  onToggleChecklist: (itemId: string) => void;
  onOpenFullFamily?: () => void;
}

const VULNERABILITY_OPTIONS: VulnerabilityGroup[] = [
  'Asthma',
  'Elderly',
  'Infant',
  'Cardiac',
  'Pregnant',
  'Outdoor Commuter',
  'General Adult',
];

type FilterTier = 'all' | 'elevated' | 'low';

export function FamilyCarePanel({
  members,
  rooms,
  outdoorAqi,
  checklist,
  detailed = false,
  onAddMember,
  onRemoveMember,
  onToggleChecklist,
  onOpenFullFamily,
}: FamilyCarePanelProps) {
  const [filterTier, setFilterTier] = useState<FilterTier>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Member Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [vulnerability, setVulnerability] = useState<VulnerabilityGroup>('Asthma');
  const [primaryRoomId, setPrimaryRoomId] = useState(rooms[0]?.id ?? 'living-room');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const enrichedMembers = useMemo(() => {
    return members.map((member) => {
      const room = rooms.find((r) => r.id === member.primaryRoomId) ?? rooms[0];
      const indoorAqi = room ? getRoomIndoorAqi(room) : 40;
      const guidance = evaluateMemberGuidance(member, outdoorAqi, indoorAqi);
      return { member, room, indoorAqi, guidance };
    });
  }, [members, rooms, outdoorAqi]);

  const filteredMembers = useMemo(() => {
    if (filterTier === 'all') return enrichedMembers;
    if (filterTier === 'elevated') {
      return enrichedMembers.filter(
        (m) => m.guidance.severity === 'critical' || m.guidance.severity === 'high'
      );
    }
    return enrichedMembers.filter(
      (m) => m.guidance.severity === 'moderate' || m.guidance.severity === 'low'
    );
  }, [enrichedMembers, filterTier]);

  const completedChecklistCount = checklist.filter((c) => c.completed).length;

  const activeSensitiveAlerts = useMemo(
    () => enrichedMembers.filter((m) => m.guidance.isSensitiveGroupAlert),
    [enrichedMembers]
  );

  function handleSubmitMember(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const parsedAge = Number(age);

    if (!trimmedName) {
      setFormError('Enter the household member name before saving.');
      return;
    }
    if (!age.trim() || Number.isNaN(parsedAge) || parsedAge < 0 || parsedAge > 115) {
      setFormError('Enter a valid age between 0 and 115 years.');
      return;
    }

    onAddMember({
      name: trimmedName,
      age: Math.round(parsedAge),
      vulnerability,
      primaryRoomId,
      notes: notes.trim() || undefined,
    });

    setName('');
    setAge('');
    setVulnerability('Asthma');
    setNotes('');
    setFormError(null);
    setShowAddForm(false);
  }

  const severityBadgeStyles = {
    critical: {
      bg: 'rgba(153, 27, 27, 0.35)',
      border: 'rgba(239, 68, 68, 0.55)',
      text: '#FECACA',
      dot: '#EF4444',
    },
    high: {
      bg: 'rgba(249, 115, 22, 0.18)',
      border: 'rgba(249, 115, 22, 0.45)',
      text: '#FDBA74',
      dot: '#F97316',
    },
    moderate: {
      bg: 'rgba(245, 158, 11, 0.16)',
      border: 'rgba(245, 158, 11, 0.42)',
      text: '#FCD34D',
      dot: '#F59E0B',
    },
    low: {
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.40)',
      text: '#6EE7B7',
      dot: '#10B981',
    },
  };

  return (
    <section
      aria-label="Family vulnerability triage and smog preparedness checklist"
      className={`grid grid-cols-1 ${detailed ? 'lg:grid-cols-12' : 'lg:grid-cols-12'} gap-6 items-start`}
    >
      {/* Left 7 cols: Family Member Risk Rows */}
      <div className="sentinel-card rounded-2xl p-5 sm:p-6 lg:col-span-7 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#F8FAFC]">
              Family Vulnerability Triage
            </h2>
            <p className="mt-0.5 text-xs text-[#94A3B8]">
              Personalized mask grade and safe outdoor limits for outdoor AQI{' '}
              <span className="font-mono font-semibold text-[#F8FAFC] tabular-nums">
                {outdoorAqi}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {detailed ? (
              <button
                type="button"
                onClick={() => {
                  setShowAddForm((prev) => !prev);
                  setFormError(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#06B6D4] px-3.5 py-2 text-xs font-semibold text-[#090D16] hover:bg-[#38BDF8] transition-colors whitespace-nowrap min-h-[38px]"
              >
                {showAddForm ? (
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{showAddForm ? 'Cancel' : 'Add Member'}</span>
              </button>
            ) : (
              onOpenFullFamily && (
                <button
                  type="button"
                  onClick={onOpenFullFamily}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#38BDF8] hover:text-[#4CD7F6] transition-colors whitespace-nowrap"
                >
                  <span>Manage Family</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )
            )}
          </div>
        </div>

        {/* Dynamic Sensitive Group Alert Summary Banner */}
        {activeSensitiveAlerts.length > 0 && (
          <div
            role="status"
            data-testid="sensitive-group-summary"
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#F97316]/35 bg-[#7F1D1D]/20 px-3.5 py-2.5 text-xs"
          >
            <div className="flex items-center gap-2 text-[#FDBA74] font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Sensitive Group Alert · {activeSensitiveAlerts.length} household{' '}
                {activeSensitiveAlerts.length === 1 ? 'member requires' : 'members require'}{' '}
                heightened protection at AQI {outdoorAqi}
              </span>
            </div>
            <span className="text-[#94A3B8] truncate">
              {activeSensitiveAlerts
                .slice(0, 2)
                .map((m) => m.guidance.riskBadgeLabel)
                .join(' · ')}
            </span>
          </div>
        )}

        {/* Vulnerability Filter Tabs */}
        <div
          role="group"
          aria-label="Filter family members by risk level"
          className="inline-flex items-center gap-1 rounded-lg bg-[#0E1524] p-1 border border-[#2A364F]"
        >
          {(
            [
              { id: 'all', label: `All (${enrichedMembers.length})` },
              {
                id: 'elevated',
                label: `Critical / High (${
                  enrichedMembers.filter(
                    (m) =>
                      m.guidance.severity === 'critical' ||
                      m.guidance.severity === 'high'
                  ).length
                })`,
              },
              {
                id: 'low',
                label: `Moderate / Low (${
                  enrichedMembers.filter(
                    (m) =>
                      m.guidance.severity === 'moderate' ||
                      m.guidance.severity === 'low'
                  ).length
                })`,
              },
            ] as { id: FilterTier; label: string }[]
          ).map((tab) => {
            const active = filterTier === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTier(tab.id)}
                aria-pressed={active}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#1E293B] text-[#F8FAFC]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Add Family Member Form */}
        {showAddForm && (
          <form
            onSubmit={handleSubmitMember}
            noValidate
            className="rounded-xl border border-[#2A364F] bg-[#0E1524]/90 p-4 space-y-4"
          >
            <div className="text-sm font-semibold text-[#F8FAFC]">
              Add Household Member Profile
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-lg border border-[#EF4444]/40 bg-[#7F1D1D]/30 px-3 py-2 text-xs text-[#FECACA]"
              >
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="member-name"
                  className="block text-xs font-medium text-[#94A3B8] mb-1"
                >
                  Full Name
                </label>
                <input
                  id="member-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Kabir Sharma"
                  className="sentinel-input w-full rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="member-age"
                  className="block text-xs font-medium text-[#94A3B8] mb-1"
                >
                  Age (years)
                </label>
                <input
                  id="member-age"
                  type="number"
                  min={0}
                  max={115}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g., 2"
                  className="sentinel-input w-full rounded-lg px-3 py-2 text-sm tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="member-vulnerability"
                  className="block text-xs font-medium text-[#94A3B8] mb-1"
                >
                  Sensitivity Group
                </label>
                <select
                  id="member-vulnerability"
                  value={vulnerability}
                  onChange={(e) =>
                    setVulnerability(e.target.value as VulnerabilityGroup)
                  }
                  className="sentinel-input w-full rounded-lg px-3 py-2 text-sm"
                >
                  {VULNERABILITY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-[#0E1524]">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="member-room"
                  className="block text-xs font-medium text-[#94A3B8] mb-1"
                >
                  Primary Sanctuary Room
                </label>
                <select
                  id="member-room"
                  value={primaryRoomId}
                  onChange={(e) => setPrimaryRoomId(e.target.value)}
                  className="sentinel-input w-full rounded-lg px-3 py-2 text-sm"
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id} className="bg-[#0E1524]">
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="member-notes"
                className="block text-xs font-medium text-[#94A3B8] mb-1"
              >
                Medical / Schedule Note (optional)
              </label>
              <input
                id="member-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Afternoon nap in nursery, inhaler on shelf"
                className="sentinel-input w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormError(null);
                }}
                className="rounded-lg border border-[#2A364F] bg-[#1E293B] px-3.5 py-2 text-xs font-semibold text-[#F8FAFC] hover:border-[#38BDF8]/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#06B6D4] px-4 py-2 text-xs font-semibold text-[#090D16] hover:bg-[#38BDF8] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Save Member</span>
              </button>
            </div>
          </form>
        )}

        {/* Member Risk List */}
        {filteredMembers.length === 0 ? (
          <div className="border-t border-[#1A2438] py-8 text-center text-sm text-[#94A3B8]">
            No family members fall under this risk tier at the current AQI level.
          </div>
        ) : (
          <ul className="divide-y divide-[#1A2438] border-t border-[#1A2438]">
            {filteredMembers.map(({ member, room, indoorAqi, guidance }) => {
              const badge = severityBadgeStyles[guidance.severity];
              return (
                <li
                  key={member.id}
                  data-testid={`family-row-${member.id}`}
                  className="py-4 px-2 -mx-2 rounded-lg transition-colors hover:bg-[#1E293B]/50 space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-display text-sm font-bold text-[#F8FAFC]">
                        {member.name}
                      </span>
                      <span className="text-xs text-[#94A3B8] tabular-nums">
                        {member.age} yrs
                      </span>
                      {/* Vulnerability Tag */}
                      <span className="inline-flex items-center rounded-full border border-[#38BDF8]/35 bg-[#38BDF8]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#7BD0FF] whitespace-nowrap">
                        {member.vulnerability}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        data-testid={`member-risk-badge-${member.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap"
                        style={{
                          backgroundColor: badge.bg,
                          border: `1px solid ${badge.border}`,
                          color: badge.text,
                        }}
                      >
                        {guidance.severity === 'critical' ? (
                          <ShieldAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
                        ) : guidance.severity === 'high' || guidance.severity === 'moderate' ? (
                          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                        ) : (
                          <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                        )}
                        <span>{guidance.riskBadgeLabel}</span>
                      </span>

                      {detailed && (
                        <button
                          type="button"
                          onClick={() => onRemoveMember(member.id)}
                          aria-label={`Remove ${member.name}`}
                          className="rounded-md p-1.5 text-[#64748B] hover:bg-[#1E293B] hover:text-[#FCA5A5] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm font-medium text-[#F8FAFC]">
                    {guidance.headline}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#94A3B8] tabular-nums">
                    <span>
                      Mask: <strong className="text-[#F8FAFC]">{guidance.maskGrade}</strong>
                    </span>
                    <span aria-hidden="true" className="text-[#2A364F]">·</span>
                    <span>
                      Max Outdoor:{' '}
                      <strong className="text-[#F8FAFC]">
                        {guidance.maxOutdoorMinutes === 0
                          ? '0 min (Stay indoors)'
                          : `${guidance.maxOutdoorMinutes} min`}
                      </strong>
                    </span>
                    {room && (
                      <>
                        <span aria-hidden="true" className="text-[#2A364F]">·</span>
                        <span>
                          Room: <strong className="text-[#F8FAFC]">{room.name}</strong> (AQI{' '}
                          {indoorAqi})
                        </span>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-[#64748B]">
                    {guidance.actionTip}
                    {member.notes ? ` · ${member.notes}` : ''}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Right 5 cols: Household Smog-Readiness Checklist */}
      <div className="sentinel-card rounded-2xl p-5 sm:p-6 lg:col-span-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#F8FAFC]">
              Household Protection Checklist
            </h2>
            <p className="mt-0.5 text-xs text-[#94A3B8] tabular-nums">
              {completedChecklistCount} of {checklist.length} safeguards verified
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-[#38BDF8] tabular-nums">
            {Math.round(
              (completedChecklistCount / Math.max(1, checklist.length)) * 100
            )}
            %
          </span>
        </div>

        {/* Pill-capped checklist completion progress */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#0E1524]">
          <div
            className="h-full rounded-full bg-[#06B6D4] transition-all duration-300"
            style={{
              width: `${
                (completedChecklistCount / Math.max(1, checklist.length)) * 100
              }%`,
            }}
          />
        </div>

        <ul className="divide-y divide-[#1A2438] border-t border-[#1A2438]">
          {checklist.map((item) => (
            <li key={item.id} className="py-3.5">
              <label className="flex items-start gap-3 cursor-pointer group">
                <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => onToggleChecklist(item.id)}
                    className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  />
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none flex h-5 w-5 items-center justify-center rounded-[4px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#06B6D4] ${
                      item.completed
                        ? 'border-[#06B6D4] bg-[#06B6D4] text-[#090D16]'
                        : 'border-[#2A364F] bg-[#0E1524] group-hover:border-[#38BDF8]/60'
                    }`}
                  >
                    {item.completed && (
                      <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
                    )}
                  </span>
                </span>

                <span className="space-y-0.5 min-w-0">
                  <span
                    className={`block text-sm font-medium transition-colors ${
                      item.completed
                        ? 'text-[#64748B] line-through'
                        : 'text-[#F8FAFC]'
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="block text-xs text-[#94A3B8] leading-relaxed">
                    {item.detail}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
