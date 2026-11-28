import { useState, useEffect, useCallback } from 'react';
import type { ChecklistItem, FamilyMember, RoomMonitor } from '../types/sentinel';
import {
  DEFAULT_CHECKLIST,
  DEFAULT_FAMILY_MEMBERS,
  DEFAULT_ROOMS,
  MONITORING_STATIONS,
} from '../data/stations';

export const STORAGE_KEYS = {
  stationId: 'airwish_station_id',
  rooms: 'airwish_rooms_v1',
  members: 'airwish_family_members_v1',
  checklist: 'airwish_checklist_v1',
} as const;

/**
 * Validates against prototype pollution and malformed JSON.
 */
function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    // Block prototype pollution tokens
    if (raw.includes('__proto__') || raw.includes('constructor') || raw.includes('prototype')) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== typeof fallback) {
      return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

/**
 * Validates loaded room records have valid schema.
 */
function validateRooms(raw: unknown): RoomMonitor[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_ROOMS;
  const valid = raw.filter((r): r is RoomMonitor => {
    return (
      r &&
      typeof r === 'object' &&
      typeof r.id === 'string' &&
      typeof r.name === 'string' &&
      typeof r.indoorPm25 === 'number' &&
      typeof r.windowsSealed === 'boolean'
    );
  });
  return valid.length > 0 ? valid : DEFAULT_ROOMS;
}

/**
 * Validates loaded family member records.
 */
function validateMembers(raw: unknown): FamilyMember[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_FAMILY_MEMBERS;
  const valid = raw.filter((m): m is FamilyMember => {
    return (
      m &&
      typeof m === 'object' &&
      typeof m.id === 'string' &&
      typeof m.name === 'string' &&
      typeof m.vulnerability === 'string'
    );
  });
  return valid.length > 0 ? valid : DEFAULT_FAMILY_MEMBERS;
}

/**
 * Validates loaded checklist records.
 */
function validateChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_CHECKLIST;
  const valid = raw.filter((c): c is ChecklistItem => {
    return c && typeof c === 'object' && typeof c.id === 'string' && typeof c.completed === 'boolean';
  });
  return valid.length > 0 ? valid : DEFAULT_CHECKLIST;
}

/**
 * Hook managing local storage state with anti-tamper validation.
 */
export function useAirWishStorage() {
  const [selectedStationId, setSelectedStationId] = useState<string>(() => {
    if (typeof window === 'undefined') return MONITORING_STATIONS[0].id;
    const stored = window.localStorage.getItem(STORAGE_KEYS.stationId);
    return safeJsonParse<string>(stored, MONITORING_STATIONS[0].id);
  });

  const [rooms, setRooms] = useState<RoomMonitor[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_ROOMS;
    const stored = window.localStorage.getItem(STORAGE_KEYS.rooms);
    return validateRooms(safeJsonParse(stored, DEFAULT_ROOMS));
  });

  const [members, setMembers] = useState<FamilyMember[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_FAMILY_MEMBERS;
    const stored = window.localStorage.getItem(STORAGE_KEYS.members);
    return validateMembers(safeJsonParse(stored, DEFAULT_FAMILY_MEMBERS));
  });

  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_CHECKLIST;
    const stored = window.localStorage.getItem(STORAGE_KEYS.checklist);
    return validateChecklist(safeJsonParse(stored, DEFAULT_CHECKLIST));
  });

  // Persistent sync effects with storage quota guards
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.stationId, JSON.stringify(selectedStationId));
    } catch {}
  }, [selectedStationId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.rooms, JSON.stringify(rooms));
    } catch {}
  }, [rooms]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.members, JSON.stringify(members));
    } catch {}
  }, [members]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.checklist, JSON.stringify(checklist));
    } catch {}
  }, [checklist]);

  const toggleChecklist = useCallback((itemId: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, completed: !item.completed } : item))
    );
  }, []);

  return {
    selectedStationId,
    setSelectedStationId,
    rooms,
    setRooms,
    members,
    setMembers,
    checklist,
    setChecklist,
    toggleChecklist,
  };
}
