import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWeatherSummary } from "./weather";

describe("fetchWeatherSummary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("retries twice with a 1 minute delay and then succeeds", async () => {
    vi.useFakeTimers();

    const originalFetch = global.fetch;
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(new Response("server error", { status: 500 }))
      .mockResolvedValueOnce(new Response("server error", { status: 502 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            current: { temperature_2m: 12.3 },
            daily: {
              weather_code: [0],
              temperature_2m_max: [15.5],
              temperature_2m_min: [8.2],
              uv_index_max: [4.1],
              precipitation_probability_max: [20],
              precipitation_sum: [1.2]
            },
            hourly: {
              time: ["2026-03-27T00:00", "2026-03-27T01:00", "2026-03-27T02:00"],
              precipitation_probability: [0, 30, 50],
              precipitation: [0, 0.4, 0.1]
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    global.fetch = fetchMock as typeof global.fetch;

    try {
      const summaryPromise = fetchWeatherSummary(37.5665, 126.978, "2026-03-27");

      await vi.advanceTimersByTimeAsync(120_000);
      const summary = await summaryPromise;

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(summary.conditionLabel).toBe("맑음");
      expect(summary.currentTemperature).toBe(12.3);
      expect(summary.precipitationStartTime).toBe("02:00");
    } finally {
      global.fetch = originalFetch;
      vi.useRealTimers();
    }
  });

  it("uses probability 50 percent or amount 0.5 mm/h as the start threshold", async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          hourly: {
            time: ["2026-03-27T00:00", "2026-03-27T01:00", "2026-03-27T02:00"],
            precipitation_probability: [40, 49, 50],
            precipitation: [0.4, 0.5, 0.49]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    global.fetch = fetchMock as typeof global.fetch;

    try {
      const summary = await fetchWeatherSummary(37.5665, 126.978, "2026-03-27");

      expect(summary.precipitationStartTime).toBe("01:00");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("logs detailed errors before giving up", async () => {
    vi.useFakeTimers();

    const originalFetch = global.fetch;
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue(new Response("server error", { status: 503 }));
    global.fetch = fetchMock as typeof global.fetch;

    try {
      const summaryPromise = fetchWeatherSummary(37.5665, 126.978, "2026-03-27");
      const handledPromise = summaryPromise.catch((error: unknown) => error);

      await vi.advanceTimersByTimeAsync(120_000);

      const error = await handledPromise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(
        "날씨 정보를 가져오지 못했습니다. 1분 간격으로 2번 더 시도했지만 실패했습니다."
      );

      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy.mock.calls[0]?.[1]).toMatchObject({
        attempt: 1,
        maxAttempts: 3,
        latitude: 37.5665,
        longitude: 126.978,
        today: "2026-03-27",
        error: expect.objectContaining({
          message: expect.stringContaining("status 503")
        })
      });
    } finally {
      global.fetch = originalFetch;
      consoleErrorSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});
