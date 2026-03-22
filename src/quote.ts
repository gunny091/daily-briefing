import type { QuoteOfDay } from "./types";

type ZenQuotesResponseItem = {
  q?: string;
  a?: string;
};

export async function fetchQuoteOfTheDay(): Promise<QuoteOfDay> {
  const response = await fetch("https://zenquotes.io/api/today");
  if (!response.ok) {
    throw new Error(`ZenQuotes request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ZenQuotesResponseItem[];
  const first = payload[0];

  if (!first?.q || !first?.a) {
    throw new Error("ZenQuotes response is missing quote content");
  }

  return {
    quote: first.q,
    author: first.a
  };
}
