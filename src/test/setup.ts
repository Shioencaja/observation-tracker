import { expect, afterEach, vi, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Set up environment variables before any imports
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    getAll: vi.fn(),
    has: vi.fn(),
    keys: vi.fn(),
    values: vi.fn(),
    entries: vi.fn(),
    toString: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(),
        })),
        gte: vi.fn(),
        lte: vi.fn(),
      })),
      insert: vi.fn(),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(),
          single: vi.fn(),
        })),
        is: vi.fn(),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
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
}));

