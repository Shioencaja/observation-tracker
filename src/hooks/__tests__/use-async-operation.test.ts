import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAsyncOperation } from "../use-async-operation";

describe("useAsyncOperation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with loading false and error null", () => {
    const { result } = renderHook(() => useAsyncOperation());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("should set loading to true during async operation", async () => {
    const { result } = renderHook(() => useAsyncOperation());

    let promise: Promise<string>;
    await act(async () => {
      promise = result.current.execute(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return "success";
      });
    });

    // Wait for loading state to become true (React state updates are async)
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await act(async () => {
      await promise!;
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should handle successful operation", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAsyncOperation({ onSuccess }));

    const data = { id: 1, name: "Test" };
    await act(async () => {
      await result.current.execute(async () => {
        return data;
      });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(onSuccess).toHaveBeenCalledWith(data);
    });
  });

  it("should handle error in operation", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useAsyncOperation({ onError }));

    const error = new Error("Test error");

    await act(async () => {
      try {
        await result.current.execute(async () => {
          throw error;
        });
      } catch (e) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe("Test error");
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  it("should reset error on start by default", async () => {
    const { result } = renderHook(() => useAsyncOperation());

    // First operation with error
    await act(async () => {
      try {
        await result.current.execute(async () => {
          throw new Error("First error");
        });
      } catch (e) {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBe("First error");
    });

    // Second operation should reset error
    await act(async () => {
      await result.current.execute(async () => {
        return "success";
      });
    });

    await waitFor(() => {
      expect(result.current.error).toBe(null);
    });
  });

  it("should not reset error when resetErrorOnStart is false", async () => {
    const { result } = renderHook(() =>
      useAsyncOperation({ resetErrorOnStart: false })
    );

    // First error
    await act(async () => {
      try {
        await result.current.execute(async () => {
          throw new Error("First error");
        });
      } catch (e) {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBe("First error");
    });

    // Start second operation - error should persist
    let promise: Promise<string>;
    await act(async () => {
      promise = result.current.execute(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return "success";
      });
    });

    expect(result.current.error).toBe("First error");

    await act(async () => {
      await promise!;
    });
  });

  it("should allow manual error reset", async () => {
    const { result } = renderHook(() => useAsyncOperation());

    await act(async () => {
      try {
        await result.current.execute(async () => {
          throw new Error("Test error");
        });
      } catch (e) {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Test error");
    });

    act(() => {
      result.current.resetError();
    });

    expect(result.current.error).toBe(null);
  });

  it("should handle non-Error objects", async () => {
    const { result } = renderHook(() => useAsyncOperation());

    await act(async () => {
      try {
        await result.current.execute(async () => {
          throw "String error";
        });
      } catch (e) {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBe("An error occurred");
    });
  });

  it("should work with typed generic", async () => {
    interface TestData {
      id: number;
      name: string;
    }

    const { result } = renderHook(() => useAsyncOperation<TestData>());

    const data: TestData = { id: 1, name: "Test" };
    let returned: TestData | undefined;
    await act(async () => {
      returned = await result.current.execute(async () => {
        return data;
      });
    });

    expect(returned).toEqual(data);
  });
});
