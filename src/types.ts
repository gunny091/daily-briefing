export type DDayConfig = {
  name: string;
  date: string;
};

export type AppConfig = {
  discord: {
    webhookUrl: string;
  };
  weather: {
    latitude: number;
    longitude: number;
  };
  notion: {
    token: string;
    schedule: {
      databaseId: string;
      dateProperty: string;
    };
    daily: {
      databaseId: string;
      dateProperty: string;
    };
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
  conditionLabel: string;
  currentTemperature: number | null;
  minTemperature: number | null;
  maxTemperature: number | null;
  uvIndexMax: number | null;
  precipitationProbabilityMax: number | null;
  precipitationAmountSum: number | null;
  precipitationStartTime: string | null;
};

export type NotionScheduleItem = {
  title: string;
  url: string | null;
  start: string;
  end: string | null;
};

export type NotionPageLink = {
  title: string;
  url: string | null;
};

export type QuoteOfDay = {
  quote: string;
  author: string;
};
