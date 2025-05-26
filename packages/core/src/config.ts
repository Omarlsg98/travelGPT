import { LLMProviderConfig } from "./llm-connections";

export const llmConfig: LLMProviderConfig = {
  provider: "OpenAI",
  model: "gpt-4o", // Example model
  // Other OpenAI specific configurations can go here
};

export const apiConfig: any = {
  // Placeholder for API connection configurations
  // e.g., googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
};
