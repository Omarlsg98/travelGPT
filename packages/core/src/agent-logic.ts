// packages/core/src/agent-logic.ts

import { APIConnection } from "./api-connections";
import { FeasibilityCalculator } from "./feasibility";
import { LLMConnection } from "./llm-connections";

/**
 * Represents the core LLM agent logic, responsible for orchestrating LLM interactions,
 * tool utilization (APIs, feasibility), and decision-making for travel planning.
 */
export class TravelAgent {
  private llmConnection: LLMConnection;
  private apiConnection: APIConnection;
  private feasibilityCalculator: FeasibilityCalculator;
  private llmClient: any; // The connected LLM client

  constructor(llmConfig: any, apiConfig: any) {
    this.llmConnection = new LLMConnection(llmConfig);
    this.apiConnection = new APIConnection(apiConfig);
    this.feasibilityCalculator = new FeasibilityCalculator(this.apiConnection);
  }

  /**
   * Initializes the agent by connecting to the primary LLM.
   * @param llmName The name of the LLM to use (e.g., "OpenAI").
   */
  public async initialize(llmName: string): Promise<void> {
    this.llmClient = await this.llmConnection.connect(llmName);
    console.log(`Travel Agent initialized with ${llmName}.`);
  }

  /**
   * Processes a user query and generates a travel plan using LLM and tools.
   * @param query The user's travel query.
   * @returns A promise that resolves with the generated travel plan.
   */
  public async generateTravelPlan(query: string): Promise<any> {
    console.log(`Generating travel plan for query: "${query}"`);

    // Step 1: Use LLM to understand the query and identify necessary tools/information
    const initialLLMResponse = await this.llmConnection.getResponse(
      this.llmClient,
      `Analyze this travel query and suggest initial steps, including any information needed or tools to use: "${query}"`
    );
    console.log("Initial LLM analysis:", initialLLMResponse);

    // Step 2: Utilize tools based on LLM's suggestion (example: calculate travel time)
    // This part would involve more sophisticated parsing of LLM's response to determine tool usage.
    if (query.toLowerCase().includes("travel time")) {
      const originMatch = query.match(/from\s+([^,]+)/i);
      const destinationMatch = query.match(/to\s+([^,]+)/i);

      if (originMatch && destinationMatch) {
        const origin = originMatch[1].trim();
        const destination = destinationMatch[1].trim();
        try {
          const travelTime = await this.feasibilityCalculator.calculateTravelTime(origin, destination);
          console.log(`Calculated travel time from ${origin} to ${destination}: ${travelTime} minutes.`);
          // Feed this information back to the LLM for further planning
          const refinedLLMResponse = await this.llmConnection.getResponse(
            this.llmClient,
            `Based on the query "${query}" and calculated travel time of ${travelTime} minutes from ${origin} to ${destination}, refine the travel plan.`
          );
          return { plan: refinedLLMResponse, travelTime: travelTime };
        } catch (error) {
          console.error("Failed to calculate travel time:", error);
          // Inform LLM about the failure
          await this.llmConnection.getResponse(
            this.llmClient,
            `Attempted to calculate travel time for "${query}" but failed. Please adjust the plan accordingly.`
          );
        }
      }
    }

    // Step 3: Use LLM to synthesize information and generate the final plan
    const finalPlan = await this.llmConnection.getResponse(
      this.llmClient,
      `Based on all gathered information, generate a comprehensive travel plan for: "${query}"`
    );

    return { plan: finalPlan };
  }

  /**
   * Example of how the agent might use an external API directly.
   * @param apiName The name of the API.
   * @param endpoint The API endpoint.
   * @param params Parameters for the API call.
   * @returns A promise that resolves with the API response.
   */
  public async useExternalApi(apiName: string, endpoint: string, params: any): Promise<any> {
    return this.apiConnection.callApi(apiName, endpoint, params);
  }

  /**
   * Example of how the agent might use an MCP tool.
   * @param serverName The name of the MCP server.
   * @param toolName The name of the tool.
   * @param args Arguments for the tool.
   * @returns A promise that resolves with the MCP tool's result.
   */
  public async useMcpTool(serverName: string, toolName: string, args: any): Promise<any> {
    return this.apiConnection.useMcpTool(serverName, toolName, args);
  }
}
