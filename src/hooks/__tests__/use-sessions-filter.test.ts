import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionsFilter } from '../use-sessions-filter';
import type { Session } from '@/lib/session-utils';

const mockSessions: Session[] = [
  {
    id: 'session-1',
    alias: 'Test Session 1',
    agency: 'Agency A',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    user_id: 'user-1',
    project_id: 'project-1',
    start_time: '2024-01-01T10:00:00Z',
    end_time: null,
  },
  {
    id: 'session-2',
    alias: 'Another Session',
    agency: 'Agency B',
    created_at: '2024-01-02T10:00:00Z',
    updated_at: '2024-01-02T10:00:00Z',
    user_id: 'user-1',
    project_id: 'project-1',
    start_time: '2024-01-02T10:00:00Z',
    end_time: null,
  },
  {
    id: 'session-3',
    alias: 'Third Session',
    agency: 'Agency A',
    created_at: '2024-01-03T10:00:00Z',
    updated_at: '2024-01-03T10:00:00Z',
    user_id: 'user-1',
    project_id: 'project-1',
    start_time: '2024-01-03T10:00:00Z',
    end_time: null,
  },
];

// Mock formatDate function
vi.mock('@/lib/session-utils', () => ({
  formatDate: (date: string) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },
}));

describe('useSessionsFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with empty search term', () => {
    const { result } = renderHook(() => useSessionsFilter(mockSessions));

    expect(result.current.searchTerm).toBe('');
    expect(result.current.activeSearchTerm).toBe('');
    expect(result.current.selectedAgency).toBe('all');
    expect(result.current.selectedDate).toBe('all');
  });

  it('should filter sessions by search term (debounced)', () => {
    const { result } = renderHook(() => useSessionsFilter(mockSessions));

    act(() => {
      result.current.setSearchTerm('Test');
    });

    expect(result.current.filteredSessions.length).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(300);
      vi.runAllTimers();
    });
    
    expect(result.current.filteredSessions.length).toBe(1);
    expect(result.current.filteredSessions[0].alias).toBe('Test Session 1');
  });

  it('should filter sessions by agency', () => {
    const { result } = renderHook(() => useSessionsFilter(mockSessions));

    act(() => {
      result.current.setSelectedAgency('Agency A');
    });

    expect(result.current.filteredSessions.length).toBe(2);
    expect(
      result.current.filteredSessions.every((s) => s.agency === 'Agency A')
    ).toBe(true);
  });

  it('should filter sessions by date', () => {
    const { result } = renderHook(() => useSessionsFilter(mockSessions));

    act(() => {
      result.current.setSelectedDate('2024-01-01');
    });

    expect(result.current.filteredSessions.length).toBe(1);
    expect(result.current.filteredSessions[0].id).toBe('session-1');
  });

  it('should combine multiple filters', () => {
    const { result } = renderHook(() => useSessionsFilter(mockSessions));

    act(() => {
      result.current.setSearchTerm('Session');
      result.current.setSelectedAgency('Agency A');
    });

    act(() => {
      vi.advanceTimersByTime(300);
      vi.runAllTimers();
    });
    
    const filtered = result.current.filteredSessions;
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((s) => s.agency === 'Agency A')).toBe(true);
  });

  it('should extract unique agencies', () => {
    const { result } = renderHook(() => useSessionsFilter(mockSessions));

    expect(result.current.uniqueAgencies).toContain('Agency A');
    expect(result.current.uniqueAgencies).toContain('Agency B');
    expect(result.current.uniqueAgencies.length).toBe(2);
  });

  it('should extract unique dates', () => {
    const { result } = renderHook(() => useSessionsFilter(mockSessions));

    expect(result.current.uniqueDates.length).toBe(3);
    expect(result.current.uniqueDates).toContain('2024-01-01');
  });

  it('should clear search', () => {
    const { result } = renderHook(() => useSessionsFilter(mockSessions));

    act(() => {
      result.current.setSearchTerm('Test');
      result.current.handleClearSearch();
    });

    expect(result.current.searchTerm).toBe('');
  });

  it('should clear filters', () => {
    const { result } = renderHook(() => useSessionsFilter(mockSessions));

    act(() => {
      result.current.setSelectedAgency('Agency A');
      result.current.setSelectedDate('2024-01-01');
      result.current.handleClearFilters();
    });

    expect(result.current.selectedAgency).toBe('all');
    expect(result.current.selectedDate).toBe('all');
  });

  it('should use custom debounce delay', () => {
    const { result } = renderHook(() =>
      useSessionsFilter(mockSessions, 500)
    );

    act(() => {
      result.current.setSearchTerm('Test');
    });

    expect(result.current.activeSearchTerm).toBe('');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.activeSearchTerm).toBe('');

    act(() => {
      vi.advanceTimersByTime(200);
      vi.runAllTimers();
    });
    
    expect(result.current.activeSearchTerm).toBe('Test');
  });

  it('should return all sessions when no filters applied', () => {
    const { result } = renderHook(() => useSessionsFilter(mockSessions));

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredSessions.length).toBe(mockSessions.length);
  });
});

