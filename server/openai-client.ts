import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "OPENAI_API_KEY environment variable is not configured. Please set it before starting the server.",
    );
  }

  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

export function validateOpenAIApiKey(): void {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.error(
      "❌ CRITICAL: OPENAI_API_KEY environment variable is not set",
    );
    throw new Error(
      "OPENAI_API_KEY environment variable is required. Please set it in your .env file or environment.",
    );
  }
}
