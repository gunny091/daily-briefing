import { describe, expect, it } from "vitest";
import { fetchQuoteOfTheDay } from "./quote";

describe("fetchQuoteOfTheDay", () => {
  it("extracts quote and author from ZenQuotes response", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () =>
      new Response(JSON.stringify([{ q: "This is quote", a: "Author" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    try {
      const quote = await fetchQuoteOfTheDay();
      expect(quote).toEqual({ quote: "This is quote", author: "Author" });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("rejects malformed response", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () =>
      new Response(JSON.stringify([{ h: "missing" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    try {
      await expect(fetchQuoteOfTheDay()).rejects.toThrow(/missing quote content/);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
