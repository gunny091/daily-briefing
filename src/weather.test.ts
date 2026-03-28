import { EventEmitter } from "node:events";
import https from "node:https";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWeatherSummary } from "./weather";

type MockHttpsResponse =
  | {
      statusCode: number;
      statusMessage?: string;
      body: string;
    }
  | {
      error: Error;
    };

function mockHttpsRequest(responses: MockHttpsResponse[]) {
  return vi.spyOn(https, "request").mockImplementation((options, callback) => {
    const next = responses.shift();
    if (!next) {
      throw new Error("No mock HTTPS response configured");
    }

    const request = new EventEmitter() as EventEmitter & {
      destroy: (error?: Error) => EventEmitter;
      end: () => EventEmitter;
      setTimeout: (timeout: number, callback?: () => void) => EventEmitter;
    };

    request.destroy = (error?: Error) => {
      if (error) {
        request.emit("error", error);
      }
      return request;
    };

    request.setTimeout = (_timeout: number, timeoutCallback?: () => void) => {
      if (timeoutCallback) {
        request.once("timeout", timeoutCallback);
      }
      return request;
    };

    request.end = () => {
      queueMicrotask(() => {
        if ("error" in next) {
          request.emit("error", next.error);
          return;
        }

        const response = new EventEmitter() as EventEmitter & {
          statusCode: number;
          statusMessage: string;
          setEncoding: (encoding: BufferEncoding) => void;
        };

        response.statusCode = next.statusCode;
        response.statusMessage = next.statusMessage ?? "";
        response.setEncoding = () => undefined;

        callback?.(response);

        queueMicrotask(() => {
          response.emit("data", next.body);
          response.emit("end");
        });
      });

      return request;
    };

    return request;
  });
}

describe("fetchWeatherSummary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses IPv4-only HTTPS requests, retries twice, and then succeeds", async () => {
    vi.useFakeTimers();

    const requestSpy = mockHttpsRequest([
      { statusCode: 500, statusMessage: "Internal Server Error", body: "server error" },
      { statusCode: 502, statusMessage: "Bad Gateway", body: "server error" },
      {
        statusCode: 200,
        statusMessage: "OK",
        body: JSON.stringify({
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
        })
      }
    ]);

    try {
      const summaryPromise = fetchWeatherSummary(37.5665, 126.978, "2026-03-27");

      await vi.advanceTimersByTimeAsync(120_000);
      const summary = await summaryPromise;

      expect(requestSpy).toHaveBeenCalledTimes(3);
      expect(requestSpy.mock.calls[0]?.[0]).toMatchObject({
        hostname: "api.open-meteo.com",
        family: 4
      });
      expect(summary.conditionLabel).toBe("맑음");
      expect(summary.currentTemperature).toBe(12.3);
      expect(summary.precipitationStartTime).toBe("02:00");
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses probability 50 percent or amount 0.5 mm/h as the start threshold", async () => {
    mockHttpsRequest([
      {
        statusCode: 200,
        statusMessage: "OK",
        body: JSON.stringify({
          hourly: {
            time: ["2026-03-27T00:00", "2026-03-27T01:00", "2026-03-27T02:00"],
            precipitation_probability: [40, 49, 50],
            precipitation: [0.4, 0.5, 0.49]
          }
        })
      }
    ]);

    const summary = await fetchWeatherSummary(37.5665, 126.978, "2026-03-27");

    expect(summary.precipitationStartTime).toBe("01:00");
  });

  it("logs detailed errors on every failure and returns a fallback summary after giving up", async () => {
    vi.useFakeTimers();

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const requestSpy = mockHttpsRequest([
      { statusCode: 503, statusMessage: "Service Unavailable", body: "server error" },
      { statusCode: 503, statusMessage: "Service Unavailable", body: "server error" },
      { statusCode: 503, statusMessage: "Service Unavailable", body: "server error" }
    ]);

    try {
      const summaryPromise = fetchWeatherSummary(37.5665, 126.978, "2026-03-27");

      await vi.advanceTimersByTimeAsync(120_000);

      const summary = await summaryPromise;
      expect(summary).toEqual({
        conditionLabel: "날씨 정보 없음",
        currentTemperature: null,
        minTemperature: null,
        maxTemperature: null,
        uvIndexMax: null,
        precipitationProbabilityMax: null,
        precipitationAmountMax: null,
        precipitationStartTime: null
      });

      expect(requestSpy).toHaveBeenCalledTimes(3);
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
      consoleErrorSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});
