import axios, { AxiosError } from "axios";
import OpenAI from "openai";
import { LengthFinishReasonError } from "openai/error";
import { zodResponseFormat } from "openai/helpers/zod";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

const DEBUG_LLM = process.env.DEBUG_LLM || "none"; // "prompt", "response", or "both"

// packages/core/src/llm-connections.ts

/**
 * Interface for a Large Language Model (LLM) provider.
 * Defines the contract for connecting to an LLM and getting responses.
 */
export interface ILLMProvider {
  /**
   * Gets a response from the LLM based on the provided prompt.
   * @param prompt The input prompt to send to the LLM.
   * @param messages Optional messages to include in the chat context.
   * @param schema Optional Zod schema to validate the response. If provided, the response will be parsed and validated against this schema.
   * @param maxTokens Optional maximum number of tokens for the response.
   * @param temperature Optional temperature setting for response variability.
   * @return A promise that resolves with the LLM's response as a string.
   */
  sendChatReturnJSON(
    prompt: string,
    messages: { role: string; content: string }[],
    schema?: z.AnyZodObject,
    maxTokens?: number,
    temperature?: number
  ): Promise<any>;

  /**
   * Generate image based on a prompt.
   * @param prompt The input prompt to send to the image generation model.
   * @return A promise that resolves with the generated image as a base64 string.
   * */
  generateImage(prompt: string): Promise<string>;
}

/**
 * Configuration interface for different LLM providers.
 * This allows for provider-specific settings to be passed dynamically.
 */
export type LLMProviderConfig = {
  provider: "OpenAI" | "Anthropic" | "Google" | "Custom";
  model?: string;
  // Add any other provider-specific configurations here
  [key: string]: any;
};

/**
 * Concrete implementation for an OpenAI LLM provider.
 */
export class OpenAIProvider implements ILLMProvider {
  private config: LLMProviderConfig;
  private client: OpenAI;
  private apiKey: string;

  constructor(config: LLMProviderConfig) {
    if (config.provider !== "OpenAI") {
      throw new Error("Invalid configuration for OpenAIProvider.");
    }
    this.config = config;
    this.apiKey = process.env.OPENAI_API_KEY || "";
    this.client = new OpenAI();
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set.");
    }
  }

  public async sendChatReturnJSON(
    prompt: string,
    messages: { role: string; content: string }[],
    schema: z.AnyZodObject,
    maxTokens: number = 10000,
    temperature: number = 1
  ): Promise<any> {
    if (!this.client) {
      throw new Error("OpenAI client not connected. Call connect() first.");
    }

    const allMessages = [
      ...messages,
      { role: "system", content: prompt },
    ] as ChatCompletionMessageParam[];

    if (DEBUG_LLM === "prompt" || DEBUG_LLM === "both") {
      console.log("------ DEBUG_LLM PROMPT:\n", allMessages);
    }

    let retries = 3;
    while (retries > 0) {
      try {
        const completion = await this.client.beta.chat.completions.parse({
          model: this.config.model || "gpt-3.5-turbo",
          max_tokens: maxTokens,
          temperature: temperature,
          messages: allMessages,
          response_format: zodResponseFormat(schema, "object"),
        });

        if (DEBUG_LLM === "response" || DEBUG_LLM === "both") {
          console.log(
            "------ DEBUG_LLM RESPONSE:\n",
            completion.choices[0].message.content
          );
        }

        const event = completion.choices[0].message.parsed;
        return event;
      } catch (error) {
        console.error(error);
        if (error instanceof LengthFinishReasonError && retries > 0) {
          retries--;
        } else {
          throw error;
        }
      }
    }
  }

  public async generateImage(prompt: string): Promise<string> {
    const url = "https://api.openai.com/v1/images/generations";

    const body = JSON.stringify({
      model: process.env.DALLE_MODEL || "image-alpha-001",
      prompt: prompt,
      response_format: "b64_json",
      size: "1024x1024",
    });

    const options = {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    };

    try {
      const res = await axios.post(url, body, options);
      return res.data.data[0].b64_json;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error(
          "DALL-E Error:",
          error.response?.status,
          error.response?.data
        );
      }
      throw error;
    }
  }
}

/**
 * Concrete implementation for an Anthropic LLM provider.
 */
export class AnthropicProvider implements ILLMProvider {
  private config: LLMProviderConfig;
  private client: any; // Placeholder for Anthropic client instance
  private apiKey: string;

  constructor(config: LLMProviderConfig) {
    if (config.provider !== "Anthropic") {
      throw new Error("Invalid configuration for AnthropicProvider.");
    }
    this.config = config;
    this.apiKey = process.env.ANTHROPIC_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set.");
    }
    // In a real scenario, you would initialize the Anthropic client here:
    // this.client = new Anthropic({ apiKey: this.apiKey });
  }

  public async sendChatReturnJSON(
    prompt: string,
    messages: { role: string; content: string }[],
    schema: z.AnyZodObject,
    maxTokens?: number,
    temperature?: number
  ): Promise<any> {
    throw new Error(
      "sendChatGPTJSONWithMessages not implemented for AnthropicProvider."
    );
  }

  public async generateImage(prompt: string): Promise<string> {
    throw new Error("sendDalle not implemented for AnthropicProvider.");
  }
}

/**
 * A builder class for creating instances of ILLMProvider.
 * This centralizes the logic for instantiating different LLM providers based on configuration.
 */
export class LLMConnectionBuilder {
  /**
   * Builds and returns an instance of an LLM provider based on the given configuration.
   * @param config The configuration object for the LLM provider.
   * @returns An instance of ILLMProvider.
   * @throws Error if the specified provider is not supported.
   */
  public static build(config: LLMProviderConfig): ILLMProvider {
    switch (config.provider) {
      case "OpenAI":
        return new OpenAIProvider(config);
      case "Anthropic":
        return new AnthropicProvider(config);
      // Add more cases for other LLM providers as needed
      case "Google":
        // return new GoogleProvider(config);
        throw new Error("Google LLM provider not yet implemented.");
      case "Custom":
        // return new CustomLLMProvider(config);
        throw new Error("Custom LLM provider not yet implemented.");
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }
}
