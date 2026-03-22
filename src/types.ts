export type DDayConfig = {
  name: string;
  date: string;
};

export type AppConfig = {
  discord: {
    webhookUrl: string;
  };
  weather: {
    label: string;
    latitude: number;
    longitude: number;
  };
  notion: {
    token: string;
    databaseId: string;
    dateProperty: string;
  };
  ddays: DDayConfig[];
};

export type DDayItem = {
  name: string;
  date: string;
  label: string;
};

export type WeatherHourlyPrecipitation = {
  time: string;
  probability: number | null;
  amount: number | null;
};

export type WeatherSummary = {
  locationLabel: string;
  conditionLabel: string;
  currentTemperature: number | null;
  minTemperature: number | null;
  maxTemperature: number | null;
  uvIndexMax: number | null;
  precipitationProbabilityMax: number | null;
  precipitationAmountMax: number | null;
  precipitationStartTime: string | null;
  hourlyPrecipitation: WeatherHourlyPrecipitation[];
};

export type NotionScheduleItem = {
  title: string;
  url: string | null;
  start: string;
  end: string | null;
};
