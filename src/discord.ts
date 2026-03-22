export async function sendDiscordWebhook(webhookUrl: string, content: string): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    throw new Error(`Discord webhook request failed with status ${response.status}`);
  }
}
