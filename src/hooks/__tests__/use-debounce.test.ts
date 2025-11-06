import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "../use-debounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should return initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("test", 300));
    expect(result.current).toBe("test");
  });

  it("should debounce value changes", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      {
        initialProps: { value: "initial" },
      }
    );

    expect(result.current).toBe("initial");

    // Change value
    act(() => {
      rerender({ value: "updated" });
    });
    expect(result.current).toBe("initial"); // Should still be old value

    // Fast-forward time and run all timers
    act(() => {
      vi.advanceTimersByTime(300);
      vi.runAllTimers();
    });

    // Use flushSync or just check directly since timers have run
    expect(result.current).toBe("updated");
  });

  it("should use default delay of 300ms", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: "test" },
    });

    act(() => {
      rerender({ value: "updated" });
    });
    expect(result.current).toBe("test");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("updated");
  });

  it("should cancel previous debounce on rapid changes", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      {
        initialProps: { value: "value1" },
      }
    );

    act(() => {
      rerender({ value: "value2" });
      vi.advanceTimersByTime(200);
    });

    act(() => {
      rerender({ value: "value3" });
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe("value1"); // Still original

    act(() => {
      vi.advanceTimersByTime(100); // Complete the debounce
      vi.runAllTimers();
    });

    expect(result.current).toBe("value3");
  });

  it("should handle number values", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      {
        initialProps: { value: 0 },
      }
    );

    act(() => {
      rerender({ value: 100 });
    });
    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(300);
      vi.runAllTimers();
    });

    expect(result.current).toBe(100);
  });

  it("should handle array values", async () => {
    const initialArray = [1, 2, 3];
    const updatedArray = [4, 5, 6];

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      {
        initialProps: { value: initialArray },
      }
    );

    act(() => {
      rerender({ value: updatedArray });
    });
    expect(result.current).toEqual(initialArray);

    act(() => {
      vi.advanceTimersByTime(300);
      vi.runAllTimers();
    });

    expect(result.current).toEqual(updatedArray);
  });
});
