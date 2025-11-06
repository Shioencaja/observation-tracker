import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  finishSession,
  deleteSessionWithObservations,
  loadSessionWithObservations,
} from '../session-details-service';
import { supabase } from '@/lib/supabase';

// Mock Supabase before importing
vi.mock('@/lib/supabase', () => {
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockIs = vi.fn();
  const mockSingle = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();

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

describe('session-details-service', () => {
  const mockSupabase = supabase as any;
  let mockFrom: any;
  let mockSelect: any;
  let mockEq: any;
  let mockIs: any;
  let mockSingle: any;
  let mockUpdate: any;
  let mockDelete: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle = vi.fn();
    mockEq = vi.fn();
    mockIs = vi.fn();
    mockSelect = vi.fn();
    mockUpdate = vi.fn();
    mockDelete = vi.fn();

    mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      delete: mockDelete,
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
    });

    mockEq.mockReturnValue({
      eq: mockEq,
      is: mockIs,
      select: mockSelect,
      single: mockSingle,
    });

    mockIs.mockReturnValue({
      select: mockSelect,
      single: mockSingle,
    });

    mockUpdate.mockReturnValue({
      eq: mockEq,
      is: mockIs,
    });

    mockDelete.mockReturnValue({
      eq: mockEq,
    });

    mockSupabase = {
      from: mockFrom,
      storage: {
        from: vi.fn().mockReturnValue({
          remove: vi.fn().mockResolvedValue({ error: null }),
        }),
      },
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(),
        signOut: vi.fn(),
      },
    };

    // Mock the module
    vi.doMock('@/lib/supabase', () => ({
      supabase: mockSupabase,
    }));
  });

  describe('finishSession', () => {
    it('should use conditional update with end_time null check', async () => {
      const mockSession = { id: 'session-1' };
      mockSingle.mockResolvedValue({
        data: mockSession,
        error: null,
      });

      await finishSession('session-1', 'project-1', 'user-1');

      expect(mockFrom).toHaveBeenCalledWith('sessions');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          end_time: expect.any(String),
        })
      );
      expect(mockEq).toHaveBeenCalledWith('id', 'session-1');
      expect(mockEq).toHaveBeenCalledWith('project_id', 'project-1');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockIs).toHaveBeenCalledWith('end_time', null);
    });

    it('should throw error if session already finished', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock the fallback check
      const mockCheckSingle = vi.fn().mockResolvedValue({
        data: { id: 'session-1', end_time: '2024-01-01T10:00:00Z' },
        error: null,
      });

      const mockCheckSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockCheckSingle,
        }),
      });

      mockFrom.mockReturnValue({
        select: mockCheckSelect,
        update: mockUpdate,
      });

      await expect(
        finishSession('session-1', 'project-1', 'user-1')
      ).rejects.toThrow('Esta sesión ya está finalizada');
    });

    it('should throw error if session not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const mockCheckSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockCheckSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockCheckSingle,
        }),
      });

      mockFrom.mockReturnValue({
        select: mockCheckSelect,
        update: mockUpdate,
      });

      await expect(
        finishSession('session-1', 'project-1', 'user-1')
      ).rejects.toThrow('La sesión no existe o ya fue eliminada');
    });
  });

  describe('loadSessionWithObservations', () => {
    it('should load session with observations using single query', async () => {
      const mockSession = {
        id: 'session-1',
        user_id: 'user-1',
        project_id: 'project-1',
        observations: [
          {
            id: 'obs-1',
            created_at: '2024-01-01T10:10:00Z',
          },
          {
            id: 'obs-2',
            created_at: '2024-01-01T10:05:00Z',
          },
        ],
      };

      mockSingle.mockResolvedValue({
        data: mockSession,
        error: null,
      });

      const result = await loadSessionWithObservations('session-1', 'project-1');

      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining('observations')
      );
      expect(result.id).toBe('session-1');
      expect(result.observations).toHaveLength(2);
      // Should be sorted by created_at
      expect(result.observations[0].id).toBe('obs-2');
    });

    it('should handle nested project_observation_options', async () => {
      const mockSession = {
        id: 'session-1',
        observations: [
          {
            id: 'obs-1',
            project_observation_options: {
              name: 'Question 1',
              question_type: 'string',
            },
          },
        ],
      };

      mockSingle.mockResolvedValue({
        data: mockSession,
        error: null,
      });

      const result = await loadSessionWithObservations('session-1', 'project-1');

      expect(result.observations[0].question_name).toBe('Question 1');
      expect(result.observations[0].question_type).toBe('string');
    });

    it('should throw error if session not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      await expect(
        loadSessionWithObservations('session-1', 'project-1')
      ).rejects.toThrow('Sesión no encontrada');
    });
  });

  describe('deleteSessionWithObservations', () => {
    it('should use conditional update to end session if not ended', async () => {
      const mockObservations = [
        {
          id: 'obs-1',
          response: '[Audio: test.mp3]',
        },
      ];

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockObservations,
            error: null,
          }),
        }),
      });

      mockDelete.mockResolvedValue({ error: null });

      await deleteSessionWithObservations('session-1', 'project-1', 'user-1');

      expect(mockIs).toHaveBeenCalledWith('end_time', null);
    });

    it('should delete voice recordings from storage', async () => {
      const mockObservations = [
        {
          id: 'obs-1',
          response: '[Audio: recording1.mp3]',
        },
        {
          id: 'obs-2',
          response: '[Audio: recording2.mp3]',
        },
      ];

      const mockStorageRemove = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.storage.from = vi.fn().mockReturnValue({
        remove: mockStorageRemove,
      });

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockObservations,
            error: null,
          }),
        }),
      });

      mockDelete.mockResolvedValue({ error: null });

      await deleteSessionWithObservations('session-1', 'project-1', 'user-1');

      expect(mockStorageRemove).toHaveBeenCalledWith([
        'recording1.mp3',
        'recording2.mp3',
      ]);
    });
  });
});

