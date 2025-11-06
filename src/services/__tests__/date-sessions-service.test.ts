import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DateSessionsService } from '../date-sessions-service';
import { supabase } from '@/lib/supabase';

// Mock Supabase before importing
vi.mock('@/lib/supabase', () => {
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockGte = vi.fn();
  const mockLte = vi.fn();
  const mockOrder = vi.fn();
  const mockUpdate = vi.fn();

  return {
    supabase: {
      from: mockFrom,
      storage: {
        from: vi.fn(() => ({
          remove: vi.fn(),
        })),
      },
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(),
        signOut: vi.fn(),
      },
    },
  };
});

describe('DateSessionsService', () => {
  const mockSupabase = supabase as any;
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockGte = vi.fn();
  const mockLte = vi.fn();
  const mockOrder = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockFrom.mockReturnValue({
      select: mockSelect,
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
    });

    mockEq.mockReturnValue({
      eq: mockEq,
      gte: mockGte,
      lte: mockLte,
    });

    mockGte.mockReturnValue({
      lte: mockLte,
      order: mockOrder,
    });

    mockLte.mockReturnValue({
      order: mockOrder,
    });

    mockOrder.mockResolvedValue({
      data: [],
      error: null,
    });

    // Setup mock chain
    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    });
    
    // Mock the supabase module
    vi.doMock('@/lib/supabase', () => ({
      supabase: mockSupabase,
    }));
  });

  describe('loadSessionsForDate', () => {
    it('should load sessions with observations using join query', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          user_id: 'user-1',
          project_id: 'project-1',
          agency: 'Agency 1',
          start_time: '2024-01-01T10:00:00Z',
          end_time: null,
          observations: [
            {
              id: 'obs-1',
              session_id: 'session-1',
              response: 'Test response',
              created_at: '2024-01-01T10:05:00Z',
            },
          ],
        },
      ];

      // Create a query builder that tracks calls
      const queryCalls: any[] = [];
      const createQueryBuilder = () => {
        const builder: any = {
          eq: vi.fn((col: string, val: any) => {
            queryCalls.push({ method: 'eq', col, val });
            return builder;
          }),
          gte: vi.fn((col: string, val: any) => {
            queryCalls.push({ method: 'gte', col, val });
            return builder;
          }),
          lte: vi.fn((col: string, val: any) => {
            queryCalls.push({ method: 'lte', col, val });
            return builder;
          }),
          order: mockOrder,
        };
        return builder;
      };

      mockSelect.mockReturnValue(createQueryBuilder());
      mockOrder.mockResolvedValue({
        data: mockSessions,
        error: null,
      });

      const result = await DateSessionsService.loadSessionsForDate(
        'project-1',
        '2024-01-01',
        'user-1'
      );

      expect(mockFrom).toHaveBeenCalledWith('sessions');
      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining('observations')
      );
      expect(result).toHaveLength(1);
      expect(result[0].observations).toHaveLength(1);
    });

    it('should filter by agency when provided', async () => {
      const queryCalls: any[] = [];
      const createQueryBuilder = () => {
        const builder: any = {
          eq: vi.fn((col: string, val: any) => {
            queryCalls.push({ method: 'eq', col, val });
            return builder;
          }),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          order: mockOrder,
        };
        return builder;
      };

      mockSelect.mockReturnValue(createQueryBuilder());
      mockOrder.mockResolvedValue({
        data: [],
        error: null,
      });

      await DateSessionsService.loadSessionsForDate(
        'project-1',
        '2024-01-01',
        'user-1',
        'Agency 1'
      );

      const agencyCall = queryCalls.find(c => c.col === 'agency' && c.val === 'Agency 1');
      expect(agencyCall).toBeDefined();
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      mockOrder.mockResolvedValue({
        data: null,
        error,
      });

      await expect(
        DateSessionsService.loadSessionsForDate(
          'project-1',
          '2024-01-01',
          'user-1'
        )
      ).rejects.toThrow('Error al cargar sesiones');
    });

    it('should return empty array when no sessions found', async () => {
      mockOrder.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await DateSessionsService.loadSessionsForDate(
        'project-1',
        '2024-01-01',
        'user-1'
      );

      expect(result).toEqual([]);
    });

    it('should sort observations by created_at', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          user_id: 'user-1',
          project_id: 'project-1',
          observations: [
            {
              id: 'obs-2',
              created_at: '2024-01-01T10:10:00Z',
            },
            {
              id: 'obs-1',
              created_at: '2024-01-01T10:05:00Z',
            },
          ],
        },
      ];

      mockOrder.mockResolvedValue({
        data: mockSessions,
        error: null,
      });

      const result = await DateSessionsService.loadSessionsForDate(
        'project-1',
        '2024-01-01',
        'user-1'
      );

      expect(result[0].observations[0].id).toBe('obs-1');
      expect(result[0].observations[1].id).toBe('obs-2');
    });
  });

  describe('finishSession', () => {
    it('should update session end_time', async () => {
      const updateChain = {
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockUpdate.mockReturnValue(updateChain);
      mockFrom.mockReturnValue({
        update: mockUpdate,
        select: mockSelect,
      });

      await DateSessionsService.finishSession('session-1', 'user-1');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          end_time: expect.any(String),
        })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Update failed');
      const updateChain = {
        eq: vi.fn().mockResolvedValue({ error }),
      };
      mockUpdate.mockReturnValue(updateChain);
      mockFrom.mockReturnValue({
        update: mockUpdate,
        select: mockSelect,
      });

      await expect(
        DateSessionsService.finishSession('session-1', 'user-1')
      ).rejects.toThrow();
    });
  });
});

