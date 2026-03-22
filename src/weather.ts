import type { WeatherHourlyPrecipitation, WeatherSummary } from "./types";

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    uv_index_max?: number[];
  };
  hourly?: {
    time?: string[];
    precipitation_probability?: Array<number | null>;
    precipitation?: Array<number | null>;
  };
};

function mapWeatherCodeToLabel(code: number | undefined): string {
  if (code === undefined) {
    return "날씨 정보 없음";
  }

  if (code === 0) {
    return "맑음";
  }

  if (code === 1 || code === 2) {
    return "대체로 맑음";
  }

  if (code === 3) {
    return "흐림";
  }

  if ([45, 48].includes(code)) {
    return "안개";
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "비";
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "눈";
  }

  if ([95, 96, 99].includes(code)) {
    return "뇌우";
  }

  return "날씨 정보 없음";
}

function pickTodayHourlyPrecipitation(
  time: string[],
  probabilities: Array<number | null>,
  amounts: Array<number | null>,
  today: string
): WeatherHourlyPrecipitation[] {
  const rows: WeatherHourlyPrecipitation[] = [];

  for (let index = 0; index < time.length; index += 1) {
    const value = time[index];
    if (!value.startsWith(today)) {
      continue;
    }

    rows.push({
      time: value.slice(11, 16),
      probability: probabilities[index] ?? null,
      amount: amounts[index] ?? null
    });
  }

  const highlighted = rows.filter((row) => (row.probability ?? 0) > 0 || (row.amount ?? 0) > 0);
  return highlighted.length > 0 ? highlighted : rows.slice(0, 6);
}

export async function fetchWeatherSummary(
  latitude: number,
  longitude: number,
  locationLabel: string,
  today: string
): Promise<WeatherSummary> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,uv_index_max",
    hourly: "precipitation_probability,precipitation",
    forecast_days: "1",
    timezone: "Asia/Seoul"
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Open-Meteo request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as OpenMeteoResponse;
  const hourlyTime = payload.hourly?.time ?? [];
  const probabilities = payload.hourly?.precipitation_probability ?? [];
  const amounts = payload.hourly?.precipitation ?? [];
  const todayHourly = pickTodayHourlyPrecipitation(hourlyTime, probabilities, amounts, today);
  const precipitationRows = todayHourly.filter((row) => (row.probability ?? 0) > 0 || (row.amount ?? 0) > 0);
  const precipitationProbabilityMax =
    precipitationRows.length > 0 ? Math.max(...precipitationRows.map((row) => row.probability ?? 0)) : 0;
  const precipitationAmountMax =
    precipitationRows.length > 0 ? Math.max(...precipitationRows.map((row) => row.amount ?? 0)) : 0;
  const precipitationStartTime = precipitationRows[0]?.time ?? null;

  return {
    locationLabel,
    conditionLabel: mapWeatherCodeToLabel(payload.current?.weather_code),
    currentTemperature: payload.current?.temperature_2m ?? null,
    minTemperature: payload.daily?.temperature_2m_min?.[0] ?? null,
    maxTemperature: payload.daily?.temperature_2m_max?.[0] ?? null,
    uvIndexMax: payload.daily?.uv_index_max?.[0] ?? null,
    precipitationProbabilityMax,
    precipitationAmountMax,
    precipitationStartTime,
    hourlyPrecipitation: todayHourly
  };
}
