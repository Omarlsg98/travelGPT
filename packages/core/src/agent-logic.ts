// packages/core/src/agent-logic.ts

import { z } from "zod";
import { APIConnection } from "./api-connections";
import { FeasibilityCalculator } from "./feasibility";
import {
  ILLMProvider,
  LLMConnectionBuilder,
  LLMProviderConfig,
} from "./llm-connections";
import { SYSTEM_PROMPT } from "./prompts";
import { Activity, ScheduleParser } from "./schedule-management";

const activitySchema = z.object({
  initialDatetime: z.string(),
  finalDatetime: z.string(),
  city: z.string(),
  activityName: z.string(),
  activityType: z.enum([
    "Stay",
    "Flight",
    "Transportation",
    "Attraction",
    "Meal",
    "Other",
  ]),
  price: z.union([z.number(), z.null()]).optional(),
  providerCompany: z.union([z.string(), z.null()]).optional(),
  extraDetails: z.union([z.string(), z.null()]).optional(),
  extraFields: z
    .union([
      z.array(
        z.object({
          key: z.string(),
          value: z.string(),
        })
      ),
      z.null(),
    ])
    .optional(),
  linkToBuy: z.union([z.string(), z.null()]).optional(),
  purchased: z.boolean(),
});

const responseSchema = z.object({
  conversation: z.string(),
  travelDetails: z.object({
    destination: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    days: z.number(),
  }),
  schedule: z.array(activitySchema),
});

/**
 * Represents the core LLM agent logic, responsible for orchestrating LLM interactions,
 * tool utilization (APIs, feasibility), and decision-making for travel planning.
 */
export class TravelAgent {
  private llmConnection: ILLMProvider;
  private apiConnection: APIConnection;
  private feasibilityCalculator: FeasibilityCalculator;
  private scheduleParser: ScheduleParser;
  private currentSchedule: Activity[] = []; // Stores the iteratively built schedule

  constructor(llmConfig: LLMProviderConfig, apiConfig: any) {
    this.llmConnection = LLMConnectionBuilder.build(llmConfig);
    this.apiConnection = new APIConnection(apiConfig);
    this.feasibilityCalculator = new FeasibilityCalculator(this.apiConnection);
    this.scheduleParser = new ScheduleParser();
  }

  /**
   * Initializes the agent by connecting to the primary LLM.
   * The LLM connection is established during construction via LLMConnectionBuilder.
   */
  public async initialize(): Promise<void> {
    console.log(`Travel Agent initialized.`);
  }

  /**
   * Processes a user query and generates a travel plan using LLM and tools.
   * @param query The user's travel query.
   * @returns A promise that resolves with the generated travel plan.
   */
  public async generateTravelPlan(query: string): Promise<{
    conversation: string;
    travelDetails: {
      destination: string;
      startDate: string;
      endDate: string;
      days: number;
    };
    plan: Activity[];
  }> {
    console.log(`Generating travel plan for query: "${query}"`);

    let parsedInitialResponse: z.infer<typeof responseSchema>;

    parsedInitialResponse = await this.llmConnection.sendChatReturnJSON(
      await SYSTEM_PROMPT(query),
      [], // No prior messages for the initial prompt
      responseSchema
    );
    console.log(
      "Initial LLM Raw Response:",
      JSON.stringify(parsedInitialResponse, null, 2)
    );

    // Validate the parsed structure
    if (
      !parsedInitialResponse.conversation ||
      !parsedInitialResponse.travelDetails ||
      !parsedInitialResponse.schedule
    ) {
      throw new Error(
        "LLM initial response missing required fields (conversation, travelDetails, or schedule)."
      );
    }

    this.currentSchedule = this.scheduleParser.parseSchedule(
      JSON.stringify(parsedInitialResponse.schedule)
    );
    console.log(
      "Initial Schedule from LLM:",
      JSON.stringify(this.currentSchedule, null, 2)
    );

    // // Now, iteratively build and refine the schedule
    // const finalSchedule = await this.buildIterativeSchedule(parsedInitialResponse.travelDetails);

    return {
      conversation: parsedInitialResponse.conversation,
      travelDetails: parsedInitialResponse.travelDetails,
      plan: this.currentSchedule,
    };
  }

  /**
   * Iteratively builds and refines the travel schedule.
   * @param travelDetails Initial travel details from the user.
   * @returns A promise that resolves with the final generated schedule.
   */
  public async buildIterativeSchedule(travelDetails: {
    destination: string;
    startDate: string;
    endDate: string;
    days: number;
  }): Promise<Activity[]> {
    let currentIteration = 0;
    const maxIterations = 5; // Limit iterations to prevent infinite loops

    // The prompt for subsequent iterations will assume the LLM only returns the JSON array of activities.
    let iterationBasePrompt = `You are a travel agent. The user wants to travel to ${
      travelDetails.destination
    } from ${travelDetails.startDate} to ${travelDetails.endDate} for ${Number(
      travelDetails.days
    )} days.`;
    iterationBasePrompt += `
    
  Your task is to refine and complete the travel schedule. Continue by adding "Transportation", "Attraction", or "Meal" activities, ensuring logical flow and covering the entire travel duration.
  Focus on first adding stay (without defining specifc provider), and trasportation without defining specific provider. From there start making concrete suggestion for stay places, 
  times the user wants to spend in a given place, transportation and time it takes to get there, and so on.
  
  Ask when you need more information, suggest everything you think the user will appreciate, and ensure your response is a valid JSON object with the following structure:

  \`\`\`json
    {
      "conversation": "Your conversational response here.",
      "travelDetails": {
        "destination": "string",
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD",
        "days": "number"
      },
      "schedule": [
        {
          "initialDatetime": "YYYY-MM-DDTHH:MM:SSZ",
          "finalDatetime": "YYYY-MM-DDTHH:MM:SSZ",
          "city": "string",
          "activityName": "string",
          "activityType": "Stay" | "Flight" | "Transportation" | "Attraction" | "Meal" | "Other",
          "price": "number (optional)",
          "providerCompany": "string (optional)",
          "extraDetails": "string (optional)",
          "extraFields": "Record<string, any> (optional)",
          "linkToBuy": "string (optional)",
          "purchased": "boolean"
        }
      ]
    }
    \`\`\`
    Ensure all dates in the schedule are in ISO 8601 format. Provide only the JSON object, no other text.`;

    while (currentIteration < maxIterations) {
      console.log(
        `\n--- Schedule Building Iteration ${currentIteration + 1} ---`
      );
      console.log(
        "Current Schedule:",
        JSON.stringify(this.currentSchedule, null, 2)
      );

      const currentScheduleJson = JSON.stringify(this.currentSchedule, null, 2);
      const iterationPrompt = `${iterationBasePrompt}\n\nHere is the current schedule: \n${currentScheduleJson}\n\nBased on the user's request and the current schedule, propose the next set of activities or the final complete schedule.`;

      let parsedIterationResponse: z.infer<typeof responseSchema>;
      try {
        parsedIterationResponse = await this.llmConnection.sendChatReturnJSON(
          iterationPrompt,
          [], // No prior messages for this iteration, the prompt contains the full context
          responseSchema
        );
        console.log(
          "LLM Raw Response (Iteration):",
          JSON.stringify(parsedIterationResponse, null, 2)
        );

        const newActivities = this.scheduleParser.parseSchedule(
          JSON.stringify(parsedIterationResponse.schedule)
        );

        // Simple check for completion: if LLM returns the same schedule or no new activities
        if (JSON.stringify(newActivities) === currentScheduleJson) {
          console.log("LLM returned the same schedule. Assuming completion.");
          break;
        }

        this.currentSchedule = newActivities; // Update the schedule with the LLM's latest proposal
        console.log(
          "Updated Schedule:",
          JSON.stringify(this.currentSchedule, null, 2)
        );
      } catch (error) {
        console.error(
          `Error in LLM interaction or parsing schedule in iteration: ${error}`
        );
        // Refine the prompt to guide the LLM to correct its output
        iterationBasePrompt += `\n\nPrevious attempt failed due to invalid JSON format or parsing error: ${error}. Please ensure your response is a valid JSON array of activities, and nothing else.`;
      }

      currentIteration++;
    }

    console.log("\n--- Final Schedule ---");
    console.log(JSON.stringify(this.currentSchedule, null, 2));
    return this.currentSchedule;
  }

  /**
   * Example of how the agent might use an external API directly.
   * @param apiName The name of the API.
   * @param endpoint The API endpoint.
   * @param params Parameters for the API call.
   * @returns A promise that resolves with the API response.
   */
  public async useExternalApi(
    apiName: string,
    endpoint: string,
    params: any
  ): Promise<any> {
    return this.apiConnection.callApi(apiName, endpoint, params);
  }

  /**
   * Example of how the agent might use an MCP tool.
   * @param serverName The name of the MCP server.
   * @param toolName The name of the tool.
   * @param args Arguments for the tool.
   * @returns A promise that resolves with the MCP tool's result.
   */
  public async useMcpTool(
    serverName: string,
    toolName: string,
    args: any
  ): Promise<any> {
    return this.apiConnection.useMcpTool(serverName, toolName, args);
  }
}
