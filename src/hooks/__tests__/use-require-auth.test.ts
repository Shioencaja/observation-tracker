import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRequireAuth } from '../use-require-auth';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// Mock dependencies
vi.mock('@/contexts/AuthContext');
vi.mock('next/navigation');

const mockPush = vi.fn();
const mockUseRouter = useRouter as ReturnType<typeof vi.fn>;
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe('useRequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);
  });

  it('should redirect to login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    renderHook(() => useRequireAuth());

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('should not redirect when auth is still loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    renderHook(() => useRequireAuth());

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should not redirect when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
    });

    renderHook(() => useRequireAuth());

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should use custom redirect path', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    renderHook(() => useRequireAuth({ redirectTo: '/custom-login' }));

    expect(mockPush).toHaveBeenCalledWith('/custom-login');
  });

  it('should not redirect when redirectOnMount is false', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    renderHook(() => useRequireAuth({ redirectOnMount: false }));

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should return correct authentication status', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
    });

    const { result } = renderHook(() => useRequireAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toEqual({ id: '123', email: 'test@example.com' });
  });

  it('should return loading state correctly', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    const { result } = renderHook(() => useRequireAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });
});

